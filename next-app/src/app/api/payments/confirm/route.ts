import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

type TossConfirmResponse = {
  paymentKey?: string;
  orderId?: string;
  totalAmount?: number;
};

type TossErrorResponse = {
  message?: string;
};

// Toss Payments 결제 승인 처리
export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const body = await req.json();
    const { paymentKey, orderId, amount } = body;
    const requestedAmount = Number(amount);

    if (!paymentKey || !orderId || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return apiError("결제 승인 정보가 올바르지 않습니다.", 400);
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

    if (payment.clientId !== uid) return apiError("결제 권한이 없습니다.", 403);
    if (payment.amount !== requestedAmount) return apiError("결제 금액이 일치하지 않습니다.", 400);

    if (payment.status === "escrowed" && payment.pgPaymentKey === paymentKey) {
      return apiOk({ success: true, paymentId: payDoc.id });
    }

    if (payment.status !== "pending") {
      return apiError("이미 처리된 결제입니다.", 409);
    }

    const isSandboxPayment = String(paymentKey).startsWith("sandbox_pk_");

    // 샌드박스 결제는 명시적 opt-in 플래그가 있고 운영 환경이 아닐 때만 허용.
    // Vercel은 Production/Preview 빌드 모두 NODE_ENV=production으로 고정하므로,
    // Vercel이 제공하는 VERCEL_ENV(production/preview/development)로 운영 여부를 판단한다.
    // (로컬처럼 VERCEL_ENV가 없는 경우에만 NODE_ENV로 대체 판단)
    const isProductionDeploy = process.env.VERCEL_ENV
      ? process.env.VERCEL_ENV === "production"
      : process.env.NODE_ENV === "production";
    const sandboxAllowed =
      process.env.ALLOW_SANDBOX_PAYMENTS === "true" && !isProductionDeploy;
    if (isSandboxPayment && !sandboxAllowed) {
      return apiError("Sandbox 결제는 허용되지 않은 환경입니다.", 403);
    }

    if (!isSandboxPayment) {
      const tossSecretKey = process.env.TOSS_SECRET_KEY;
      if (!tossSecretKey) return apiError("Toss secret key가 설정되지 않았습니다.", 500);

      // Toss 결제 승인 API 호출
      const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${tossSecretKey}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount: requestedAmount }),
      });

      if (!tossRes.ok) {
        const err = await tossRes.json().catch(() => ({})) as TossErrorResponse;
        return apiError(err.message ?? "결제 승인 실패", 400);
      }

      const approved = await tossRes.json().catch(() => ({})) as TossConfirmResponse;
      if (
        approved.paymentKey !== paymentKey ||
        approved.orderId !== orderId ||
        approved.totalAmount !== requestedAmount
      ) {
        return apiError("결제 승인 정보가 일치하지 않습니다.", 400);
      }
    }

    const now = Timestamp.now();

    await adminDb.runTransaction(async (tx) => {
      const freshPaymentSnap = await tx.get(payDoc.ref);
      const freshPayment = freshPaymentSnap.data();

      if (!freshPayment) throw new Error("결제 내역을 찾을 수 없습니다.");
      if (freshPayment.status !== "pending") throw new Error("이미 처리된 결제입니다.");

      tx.update(payDoc.ref, {
        status: "escrowed",
        pgPaymentKey: paymentKey,
        escrowedAt: now,
      });

      // 프로젝트 진행 중으로 전환
      tx.update(adminDb.collection("projects").doc(payment.projectId), {
        status: "in_progress",
        updatedAt: now,
      });

      // 계약 active로 전환 (양측 서명 완료 후 결제 시)
      if (payment.contractId) {
        tx.update(adminDb.collection("contracts").doc(payment.contractId), {
          status: "active",
        });
      }
    });

    return apiOk({ success: true, paymentId: payDoc.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "결제 확인 실패";
    return apiError(message, 400);
  }
}
