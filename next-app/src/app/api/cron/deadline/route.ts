import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";
import { addNotificationToBatch } from "@/lib/notifications";

const SELECTION_GRACE_DAYS = 14;

// Vercel Cron Job으로 호출 (vercel.json에 설정)
// 또는 외부에서 Authorization 헤더로 호출
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    // 시크릿 미설정 시 fail-closed (미설정이면 "Bearer undefined" 로 통과되던 문제 차단)
    if (!cronSecret) {
      return apiError("크론 시크릿이 설정되지 않았습니다.", 500);
    }
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return apiError("Unauthorized", 401);
    }

    const now = Timestamp.now();
    const graceSeconds = SELECTION_GRACE_DAYS * 24 * 60 * 60;

    // 1단계: 마감일 지난 모집 중 프로젝트 → "selecting" 상태로 전환
    const activeProjects = await adminDb
      .collection("projects")
      .where("status", "in", ["open", "in_review"])
      .get();

    const overdueActive = activeProjects.docs.filter((d) => {
      const data = d.data();
      if (data.deletedAt) return false;
      const deadline = data.deadline as { seconds?: number } | null;
      return deadline && (deadline.seconds ?? 0) < now.seconds;
    });

    // 2단계: 유예기간(14일)도 지난 "selecting" 프로젝트 → "closed" 처리
    const selectingProjects = await adminDb
      .collection("projects")
      .where("status", "==", "selecting")
      .get();

    const overdueSelecting = selectingProjects.docs.filter((d) => {
      const data = d.data();
      if (data.deletedAt) return false;
      const deadline = data.deadline as { seconds?: number } | null;
      return deadline && (deadline.seconds ?? 0) + graceSeconds < now.seconds;
    });

    let selectingCount = 0;
    let closedCount = 0;

    for (const projectDoc of overdueActive) {
      const projectId = projectDoc.id;
      const project = projectDoc.data();
      const batch = adminDb.batch();

      batch.update(projectDoc.ref, {
        status: "selecting",
        updatedAt: now,
      });

      // 의뢰인에게 전문가 선택 안내 알림
      addNotificationToBatch(batch, {
        userId: project.clientId,
        type: "selection_reminder",
        projectId,
      });

      await batch.commit();
      selectingCount++;
    }

    for (const projectDoc of overdueSelecting) {
      const projectId = projectDoc.id;

      const allApps = await adminDb
        .collection("applications")
        .where("projectId", "==", projectId)
        .get();
      const pendingApps = allApps.docs.filter((d) => d.data().status === "pending");

      const batch = adminDb.batch();

      batch.update(projectDoc.ref, {
        status: "closed",
        updatedAt: now,
      });

      for (const appDoc of pendingApps) {
        batch.update(appDoc.ref, { status: "rejected", updatedAt: now });
        addNotificationToBatch(batch, {
          userId: appDoc.data().freelancerId,
          type: "recruitment_closed",
          projectId,
          applicationId: appDoc.id,
        });
      }

      await batch.commit();
      closedCount++;
    }

    return apiOk({ selecting: selectingCount, closed: closedCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "크론 실행 실패";
    return apiError(message, 500);
  }
}
