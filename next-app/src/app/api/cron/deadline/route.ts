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

    // 단일 where 사용, 나머지는 코드 필터
    const allActiveProjects = await adminDb
      .collection("projects")
      .where("status", "in", ["open", "in_review"])
      .get();

    const overdueSnap = {
      docs: allActiveProjects.docs.filter((d) => {
        const data = d.data();
        if (data.deletedAt) return false;
        const deadline = data.deadline as { seconds?: number } | null;
        return deadline && (deadline.seconds ?? 0) < now.seconds;
      }),
    };

    let closedCount = 0;

    for (const projectDoc of overdueSnap.docs) {
      const projectId = projectDoc.id;

      // pending 지원자 조회
      const allApps = await adminDb
        .collection("applications")
        .where("projectId", "==", projectId)
        .get();
      const appsSnap = { docs: allApps.docs.filter((d) => d.data().status === "pending") };

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
