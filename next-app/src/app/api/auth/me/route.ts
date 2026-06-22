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
  try {
    const { uid } = await verifyAuth(req);
    const body = await req.json();

    const allowed = [
      "name", "bio", "avatarUrl", "role",
      "skills", "hourlyRate", "portfolioUrl",
      "companyName", "businessField",
    ];

    // 일반 사용자는 admin 역할로 변경 불가
    if ("role" in body && !isSelfAssignableRole(body.role)) {
      return apiError("유효하지 않은 역할입니다.", 400);
    }

    const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    // profileComplete: 필수 필드 채워졌는지 확인
    const snap = await adminDb.collection("users").doc(uid).get();
    const current = snap.data() ?? {};
    const merged = { ...current, ...updates };

    if (merged.role === "freelancer") {
      updates.profileComplete = !!(merged.bio && merged.skills?.length > 0);
    } else if (merged.role === "client") {
      updates.profileComplete = !!(merged.bio);
    }

    await adminDb.collection("users").doc(uid).update(updates);
    return apiOk({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "업데이트 실패";
    return apiError(message, 400);
  }
}
