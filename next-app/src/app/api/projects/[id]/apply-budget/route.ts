import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("projects").doc(id).get();
    if (!snap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    if (snap.data()?.clientId !== uid) return apiError("권한이 없습니다.", 403);

    const { budgetMin, budgetMax } = await req.json();
    if (!budgetMin || !budgetMax) return apiError("예산 범위를 입력해주세요.", 400);

    await adminDb.collection("projects").doc(id).update({
      budgetMin,
      budgetMax,
      updatedAt: Timestamp.now(),
    });

    return apiOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "업데이트 실패";
    return apiError(message, 400);
  }
}
