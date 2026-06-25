import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { isSelfAssignableRole } from "@/lib/roles";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) return apiError("사용자를 찾을 수 없습니다.", 404);
    return apiOk({ uid, ...snap.data() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "인증 오류";
    return apiError(message, 401);
  }
}

export async function PATCH(req: NextRequest) {
  let uid: string;
  try {
    ({ uid } = await verifyAuth(req));
  } catch {
    return apiError("인증이 필요합니다.", 401);
  }

  try {
    const body = await req.json();

    const allowed = [
      "name", "bio", "avatarUrl", "role",
      "skills", "hourlyRate", "portfolioUrl",
      "companyName", "businessField",
    ];

    const snap = await adminDb.collection("users").doc(uid).get();
    const current = snap.data() ?? {};

    // 역할 검증
    if ("role" in body) {
      // admin 등 자기지정 불가 역할로 변경 불가
      if (!isSelfAssignableRole(body.role)) {
        return apiError("유효하지 않은 역할입니다.", 400);
      }
      // 이미 역할이 설정된 사용자는 역할 전환 불가 (자기거래/무결성 깨짐 방지).
      // 소셜 가입 후 최초 역할 선택(current.role 이 없음)은 허용.
      if (current.role && current.role !== body.role) {
        return apiError("역할은 변경할 수 없습니다. 변경이 필요하면 관리자에게 문의해주세요.", 403);
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    // profileComplete: 필수 필드 채워졌는지 확인
    const merged = { ...current, ...updates };

    if (merged.role === "freelancer") {
      updates.profileComplete = !!(
        merged.bio && Array.isArray(merged.skills) && merged.skills.length > 0
      );
    } else if (merged.role === "client") {
      updates.profileComplete = !!merged.bio;
    }

    // set with merge handles both existing and missing documents
    await adminDb.collection("users").doc(uid).set(updates, { merge: true });
    return apiOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "업데이트 실패";
    console.error("[PATCH /api/auth/me]", message);
    return apiError(message, 500);
  }
}
