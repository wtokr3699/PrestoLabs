import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiOk, apiError } from "@/lib/auth-middleware";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const doc = await adminDb.collection("users").doc(uid).get();
    if (!doc.exists) return apiError("유저를 찾을 수 없습니다.", 404);

    const data = doc.data()!;
    if (data.deletedAt) return apiError("유저를 찾을 수 없습니다.", 404);

    // 공개 프로필만 반환 (민감 정보 제외)
    return apiOk({
      uid,
      name: data.name,
      avatarUrl: data.avatarUrl ?? null,
      role: data.role,
      bio: data.bio ?? "",
      skills: data.skills ?? [],
      hourlyRate: data.hourlyRate ?? null,
      portfolioUrl: data.portfolioUrl ?? null,
      avgRating: data.avgRating ?? 0,
      reviewCount: data.reviewCount ?? 0,
      companyName: data.companyName ?? null,
      businessField: data.businessField ?? null,
      createdAt: data.createdAt,
    });
  } catch (err) {
    console.error(err);
    return apiError("서버 오류", 500);
  }
}
