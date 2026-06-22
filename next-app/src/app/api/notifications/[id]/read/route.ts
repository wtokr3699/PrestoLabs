import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("notifications").doc(id).get();
    if (!snap.exists) return apiError("알림을 찾을 수 없습니다.", 404);
    if (snap.data()?.userId !== uid) return apiError("권한이 없습니다.", 403);

    await adminDb.collection("notifications").doc(id).update({ read: true });
    return apiOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "업데이트 실패";
    return apiError(message, 400);
  }
}
