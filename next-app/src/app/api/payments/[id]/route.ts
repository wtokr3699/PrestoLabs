import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("payments").doc(id).get();
    if (!snap.exists) return apiError("결제 내역을 찾을 수 없습니다.", 404);
    const payment = snap.data()!;

    if (payment.clientId !== uid && payment.freelancerId !== uid) {
      return apiError("조회 권한이 없습니다.", 403);
    }

    return apiOk({ id: snap.id, ...payment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "조회 실패";
    return apiError(message, 500);
  }
}
