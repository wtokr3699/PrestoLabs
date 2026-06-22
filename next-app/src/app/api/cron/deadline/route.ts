import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";
import { addNotificationToBatch } from "@/lib/notifications";

// Vercel Cron Job으로 호출 (vercel.json에 설정)
// 또는 외부에서 Authorization 헤더로 호출
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return apiError("Unauthorized", 401);
    }

    const now = Timestamp.now();

    // 마감일이 지났고 모집 중/검토 중인 프로젝트
    const overdueSnap = await adminDb
      .collection("projects")
      .where("status", "in", ["open", "in_review"])
      .where("deadline", "<", now)
      .where("deletedAt", "==", null)
      .get();

    let closedCount = 0;

    for (const projectDoc of overdueSnap.docs) {
      const projectId = projectDoc.id;

      // pending 지원자 조회
      const appsSnap = await adminDb
        .collection("applications")
        .where("projectId", "==", projectId)
        .where("status", "==", "pending")
        .get();

      const batch = adminDb.batch();

      batch.update(projectDoc.ref, {
        status: "closed",
        updatedAt: now,
      });

      for (const appDoc of appsSnap.docs) {
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

    return apiOk({ closed: closedCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "크론 실행 실패";
    return apiError(message, 500);
  }
}
