import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";
import { addNotificationToBatch } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const appSnap = await adminDb.collection("applications").doc(id).get();
    if (!appSnap.exists) return apiError("지원서를 찾을 수 없습니다.", 404);
    const application = appSnap.data()!;

    const projectSnap = await adminDb.collection("projects").doc(application.projectId).get();
    if (!projectSnap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    if (projectSnap.data()?.clientId !== uid) return apiError("권한이 없습니다.", 403);

    if (application.status !== "pending") {
      return apiError("대기 중인 지원서만 거절할 수 있습니다.", 400);
    }

    const now = Timestamp.now();
    const batch = adminDb.batch();

    batch.update(appSnap.ref, { status: "rejected", rejectedAt: now });

    // 거절 알림 (Trigger 4)
    addNotificationToBatch(batch, {
      userId: application.freelancerId,
      type: "application_rejected",
      projectId: application.projectId,
      applicationId: id,
    });

    await batch.commit();
    return apiOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "거절 실패";
    return apiError(message, 400);
  }
}
