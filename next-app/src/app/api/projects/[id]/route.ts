import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const snap = await adminDb.collection("projects").doc(id).get();
    if (!snap.exists || snap.data()?.deletedAt) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    return apiOk({ id: snap.id, ...snap.data() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "조회 실패";
    return apiError(message, 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("projects").doc(id).get();
    if (!snap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = snap.data()!;
    if (project.clientId !== uid) return apiError("수정 권한이 없습니다.", 403);

    const body = await req.json();
    const allowed = ["title", "description", "category", "requiredSkills", "budgetMin", "budgetMax", "deadline"];

    const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
    for (const key of allowed) {
      if (key in body) {
        if (key === "deadline") {
          updates[key] = Timestamp.fromDate(new Date(body[key]));
        } else {
          updates[key] = body[key];
        }
      }
    }

    // 지원자가 있을 때 예산/마감일 변경 제한
    if (project.applicationCount > 0 && ("budgetMin" in body || "budgetMax" in body || "deadline" in body)) {
      return apiError("지원자가 있을 때는 예산과 마감일을 변경할 수 없습니다.", 400);
    }

    await adminDb.collection("projects").doc(id).update(updates);
    return apiOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "수정 실패";
    return apiError(message, 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("projects").doc(id).get();
    if (!snap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    if (snap.data()?.clientId !== uid) return apiError("삭제 권한이 없습니다.", 403);

    // 소프트 딜리트
    await adminDb.collection("projects").doc(id).update({
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return apiOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "삭제 실패";
    return apiError(message, 400);
  }
}
