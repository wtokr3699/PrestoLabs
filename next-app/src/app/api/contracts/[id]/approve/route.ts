import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

// 의뢰인이 납품 완료 승인 → 에스크로 정산
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("contracts").doc(id).get();
    if (!snap.exists) return apiError("계약서를 찾을 수 없습니다.", 404);
    const contract = snap.data()!;

    if (contract.clientId !== uid) return apiError("의뢰인만 승인할 수 있습니다.", 403);
    if (contract.status !== "active") return apiError("진행 중인 계약만 승인할 수 있습니다.", 400);

    // 에스크로 결제 확인
    const paymentSnap = await adminDb
      .collection("payments")
      .where("contractId", "==", id)
      .where("status", "==", "escrowed")
      .limit(1)
      .get();

    if (paymentSnap.empty) return apiError("에스크로 결제 내역이 없습니다.", 400);

    const now = Timestamp.now();
    const paymentDoc = paymentSnap.docs[0];
    const payment = paymentDoc.data();

    const fee = Math.floor(payment.amount * 0.1);
    const netAmount = payment.amount - fee;

    const batch = adminDb.batch();

    // 계약 완료
    batch.update(adminDb.collection("contracts").doc(id), {
      status: "completed",
      completedAt: now,
    });

    // 결제 정산 처리
    batch.update(paymentDoc.ref, {
      status: "released",
      fee,
      netAmount,
      releasedAt: now,
    });

    // 프로젝트 완료
    batch.update(adminDb.collection("projects").doc(contract.projectId), {
      status: "completed",
      updatedAt: now,
    });

    await batch.commit();
    return apiOk({ success: true, fee, netAmount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "승인 실패";
    return apiError(message, 400);
  }
}
