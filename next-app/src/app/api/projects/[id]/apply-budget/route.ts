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
    const project = snap.data()!;
    if (project.clientId !== uid) return apiError("권한이 없습니다.", 403);

    // 지원자가 있으면 예산 변경 불가 (PATCH /projects/[id] 와 동일한 잠금)
    if ((project.applicationCount ?? 0) > 0) {
      return apiError("지원자가 있을 때는 예산을 변경할 수 없습니다.", 400);
    }

    const body = await req.json();
    const min = Number(body.budgetMin);
    const max = Number(body.budgetMax);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) {
      return apiError("예산 범위를 올바르게 입력해주세요.", 400);
    }
    if (min > max) {
      return apiError("최소 예산은 최대 예산보다 클 수 없습니다.", 400);
    }

    await adminDb.collection("projects").doc(id).update({
      budgetMin: min,
      budgetMax: max,
      updatedAt: Timestamp.now(),
    });

    return apiOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "업데이트 실패";
    return apiError(message, 400);
  }
}
