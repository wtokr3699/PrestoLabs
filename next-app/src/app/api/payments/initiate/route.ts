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

    const orderId = `order_${Date.now()}_${contractId.slice(0, 8)}`;
    const amount = contract.agreedBudget;

    // Toss sandbox 주문 생성
    const tossRes = await fetch("https://api.tosspayments.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "카드",
        amount,
        orderId,
        orderName: `WorkBridge: ${contract.projectId}`,
        successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payments/success`,
        failUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/payments/fail`,
      }),
    });

    // sandbox에서는 checkout URL 반환
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

    // Toss가 에러를 반환해도 sandbox 테스트용 URL 제공
    let checkoutUrl = `/payments/sandbox?orderId=${orderId}&amount=${amount}&paymentId=${paymentRef.id}`;
    if (tossRes.ok) {
      const tossData = await tossRes.json();
      if (tossData.checkout?.url) checkoutUrl = tossData.checkout.url;
    }

    return apiOk({ paymentId: paymentRef.id, checkoutUrl, orderId, amount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "결제 초기화 실패";
    return apiError(message, 400);
  }
}
