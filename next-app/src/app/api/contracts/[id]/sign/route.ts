import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("contracts").doc(id).get();
    if (!snap.exists) return apiError("계약서를 찾을 수 없습니다.", 404);
    const contract = snap.data()!;

    const isClient = contract.clientId === uid;
    const isFreelancer = contract.freelancerId === uid;
    if (!isClient && !isFreelancer) return apiError("권한이 없습니다.", 403);

    const now = Timestamp.now();
    const updates: Record<string, unknown> = {};

    if (isClient) {
      updates.clientSigned = true;
      updates.clientSignedAt = now;
    } else {
      updates.freelancerSigned = true;
      updates.freelancerSignedAt = now;
    }

    const newClientSigned = isClient ? true : contract.clientSigned;
    const newFreelancerSigned = isFreelancer ? true : contract.freelancerSigned;

    // 양측 서명 완료 → 계약 활성화
    if (newClientSigned && newFreelancerSigned) {
      updates.status = "active";
    }

    await adminDb.collection("contracts").doc(id).update(updates);

    // 계약 활성화 시 프로젝트는 결제 후 in_progress로 전환 (여기서는 matched 유지)
    return apiOk({ success: true, bothSigned: newClientSigned && newFreelancerSigned });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "서명 실패";
    return apiError(message, 400);
  }
}
