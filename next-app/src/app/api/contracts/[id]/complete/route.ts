import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

// 프리랜서가 납품 요청
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("contracts").doc(id).get();
    if (!snap.exists) return apiError("계약서를 찾을 수 없습니다.", 404);
    const contract = snap.data()!;

    if (contract.freelancerId !== uid) return apiError("프리랜서만 납품 요청을 할 수 있습니다.", 403);
    if (contract.status !== "active") return apiError("진행 중인 계약만 납품 요청할 수 있습니다.", 400);

    const now = Timestamp.now();

    await adminDb.collection("contracts").doc(id).update({ deliveryRequestedAt: now });
    await adminDb.collection("projects").doc(contract.projectId).update({
      status: "submitted",
      updatedAt: now,
    });

    return apiOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "납품 요청 실패";
    return apiError(message, 400);
  }
}
