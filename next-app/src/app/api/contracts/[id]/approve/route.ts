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

    // 프리랜서의 납품 요청 후에만 정산 승인 가능 (납품 전 조기 정산 방지)
    if (!contract.deliveryRequestedAt) {
      return apiError("프리랜서가 납품을 요청한 후에 승인할 수 있습니다.", 400);
    }

    // 에스크로 결제 확인
    const allPayments = await adminDb
      .collection("payments")
      .where("contractId", "==", id)
      .get();
    const escrowedDoc = allPayments.docs.find((d) => d.data().status === "escrowed");
    if (!escrowedDoc) return apiError("에스크로 결제 내역이 없습니다.", 400);

    const now = Timestamp.now();
    const paymentDoc = escrowedDoc;
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
