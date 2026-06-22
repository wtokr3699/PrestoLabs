import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const { contractId } = await req.json();

    const contractSnap = await adminDb.collection("contracts").doc(contractId).get();
    if (!contractSnap.exists) return apiError("계약서를 찾을 수 없습니다.", 404);
    const contract = contractSnap.data()!;

    if (contract.clientId !== uid) return apiError("결제 권한이 없습니다.", 403);
    if (!contract.clientSigned || !contract.freelancerSigned) {
      return apiError("양측 서명이 완료되어야 결제할 수 있습니다.", 400);
    }

    const orderId = `wb_${Date.now()}_${contractId.slice(0, 8)}`;
    const amount = contract.agreedBudget;

    // Firestore에 pending 결제 레코드 생성
    // 실제 Toss 결제창 호출은 클라이언트(SDK)에서 처리
    const paymentRef = await adminDb.collection("payments").add({
      contractId,
      projectId: contract.projectId,
      clientId: uid,
      freelancerId: contract.freelancerId,
      amount,
      fee: 0,
      netAmount: 0,
      pgOrderId: orderId,
      pgPaymentKey: null,
      status: "pending",
      escrowedAt: null,
      releasedAt: null,
      createdAt: Timestamp.now(),
    });

    return apiOk({ paymentId: paymentRef.id, orderId, amount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "결제 초기화 실패";
    return apiError(message, 400);
  }
}
