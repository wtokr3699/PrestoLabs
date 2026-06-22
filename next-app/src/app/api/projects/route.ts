import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";
import { ProjectCategory, ProjectStatus } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ProjectStatus | null;
    const category = searchParams.get("category") as ProjectCategory | null;
    const keyword = searchParams.get("q") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");

    let query = adminDb
      .collection("projects")
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "desc");

    if (status) query = query.where("status", "==", status);
    if (category) query = query.where("category", "==", category);

    const snapshot = await query.get();
    let projects = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 키워드 검색 (간단한 클라이언트 사이드 필터 - 소규모 MVP)
    if (keyword) {
      const kw = keyword.toLowerCase();
      projects = projects.filter(
        (p: Record<string, unknown>) =>
          (p.title as string)?.toLowerCase().includes(kw) ||
          (p.description as string)?.toLowerCase().includes(kw)
      );
    }

    const total = projects.length;
    const paginated = projects.slice((page - 1) * limit, page * limit);

    return apiOk({ projects: paginated, total, page, limit });
  } catch (err: unknown) {
    console.error("[GET /api/projects] 오류:", err);
    const message = err instanceof Error ? err.message : "조회 실패";
    return apiError(message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);

    // 의뢰인 역할 확인
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) return apiError("사용자를 찾을 수 없습니다.", 404);
    const userData = userSnap.data()!;
    if (userData.role !== "client") return apiError("의뢰인만 프로젝트를 등록할 수 있습니다.", 403);
    if (!userData.profileComplete) return apiError("프로필을 먼저 완성해주세요.", 403);

    const body = await req.json();
    const { title, description, category, requiredSkills, budgetMin, budgetMax, deadline, startDate } = body;

    if (!title || !description || !category || !deadline) {
      return apiError("필수 항목을 모두 입력해주세요.", 400);
    }

    const now = Timestamp.now();
    const deadlineTs = Timestamp.fromDate(new Date(deadline));
    const startDateTs = startDate ? Timestamp.fromDate(new Date(startDate)) : now;

    // 시작일이 오늘 이후면 upcoming(여기서는 open으로 단순화), 아니면 open
    const status: ProjectStatus = "open";

    const ref = await adminDb.collection("projects").add({
      clientId: uid,
      title,
      description,
      category,
      requiredSkills: requiredSkills ?? [],
      budgetMin: budgetMin ?? 0,
      budgetMax: budgetMax ?? 0,
      startDate: startDateTs,
      deadline: deadlineTs,
      status,
      acceptedApplicationId: null,
      contractId: null,
      aiAnalysis: null,
      applicationCount: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    return apiOk({ id: ref.id }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "등록 실패";
    return apiError(message, 400);
  }
}
