import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";
import { assertTransition } from "@/lib/projectStateMachine";
import { ProjectStatus } from "@/types";
import { addNotificationToBatch } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;
    const { status: newStatus } = await req.json() as { status: ProjectStatus };

    const snap = await adminDb.collection("projects").doc(id).get();
    if (!snap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = snap.data()!;
    if (project.clientId !== uid) return apiError("권한이 없습니다.", 403);

    // 상태 전환 유효성 검증
    assertTransition(project.status as ProjectStatus, newStatus);

    const batch = adminDb.batch();
    const projectRef = adminDb.collection("projects").doc(id);

    batch.update(projectRef, {
      status: newStatus,
      updatedAt: Timestamp.now(),
    });

    // closed로 전환 시 pending 지원자 전원에게 알림
    if (newStatus === "closed") {
      const allApps = await adminDb
        .collection("applications")
        .where("projectId", "==", id)
        .get();
      const appsSnap = { docs: allApps.docs.filter((d) => d.data().status === "pending") };

      for (const appDoc of appsSnap.docs) {
        // 일괄 거절
        batch.update(appDoc.ref, {
          status: "rejected",
          updatedAt: Timestamp.now(),
        });
        // 알림 추가
        addNotificationToBatch(batch, {
          userId: appDoc.data().freelancerId,
          type: "recruitment_closed",
          projectId: id,
          applicationId: appDoc.id,
        });
      }
    }

    await batch.commit();
    return apiOk({ success: true, status: newStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "상태 변경 실패";
    const status = message.includes("상태 전환 불가") ? 422 : 400;
    return apiError(message, status);
  }
}
