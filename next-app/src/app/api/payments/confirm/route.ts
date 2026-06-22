import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

// Toss Payments 웹훅 또는 결제 승인 처리
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentKey, orderId, amount } = body;

    // Toss 결제 승인 API 호출
    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!tossRes.ok) {
      const err = await tossRes.json();
      return apiError(err.message ?? "결제 승인 실패", 400);
    }

    // orderId로 payment 도큐먼트 찾기
    const paySnap = await adminDb
      .collection("payments")
      .where("pgOrderId", "==", orderId)
      .limit(1)
      .get();

    if (paySnap.empty) return apiError("결제 내역을 찾을 수 없습니다.", 404);

    const payDoc = paySnap.docs[0];
    const payment = payDoc.data();
    const now = Timestamp.now();

    await payDoc.ref.update({
      status: "escrowed",
      pgPaymentKey: paymentKey,
      escrowedAt: now,
    });

    // 프로젝트 진행 중으로 전환
    await adminDb.collection("projects").doc(payment.projectId).update({
      status: "in_progress",
      updatedAt: now,
    });

    // 계약 active로 전환 (양측 서명 완료 후 결제 시)
    if (payment.contractId) {
      await adminDb.collection("contracts").doc(payment.contractId).update({
        status: "active",
      });
    }

    return apiOk({ success: true, paymentId: payDoc.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "결제 확인 실패";
    return apiError(message, 400);
  }
}
