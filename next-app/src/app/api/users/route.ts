import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiOk, apiError } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const skill = searchParams.get("skill") ?? "";
    const sort = searchParams.get("sort") ?? "rating";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 12;

    let query = adminDb
      .collection("users")
      .where("role", "==", "freelancer")
      .where("profileComplete", "==", true)
      .where("deletedAt", "==", null);

    if (skill) {
      query = query.where("skills", "array-contains", skill) as typeof query;
    }

    const snapshot = await query.get();
    let users = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));

    // 정렬
    if (sort === "rating") {
      users = users.sort((a: any, b: any) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
    } else if (sort === "reviews") {
      users = users.sort((a: any, b: any) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    } else if (sort === "newest") {
      users = users.sort((a: any, b: any) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return tb - ta;
      });
    }

    const total = users.length;
    const items = users.slice((page - 1) * limit, page * limit).map((u: any) => ({
      uid: u.uid,
      name: u.name,
      avatarUrl: u.avatarUrl ?? null,
      bio: u.bio ?? "",
      skills: u.skills ?? [],
      hourlyRate: u.hourlyRate ?? null,
      portfolioUrl: u.portfolioUrl ?? null,
      avgRating: u.avgRating ?? 0,
      reviewCount: u.reviewCount ?? 0,
    }));

    return apiOk({ users: items, total });
  } catch (err) {
    console.error(err);
    return apiError("서버 오류", 500);
  }
}
