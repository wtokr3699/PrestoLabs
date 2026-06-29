import { NextRequest } from "next/server";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { estimateProject } from "@/lib/aiEstimate";

// 게시글 생성 없이 단가만 미리 산출 (프로젝트 등록 전 미리보기용)
export async function POST(req: NextRequest) {
  try {
    await verifyAuth(req);
    const { description, category } = await req.json();

    if (!description || !category) {
      return apiError("프로젝트 설명과 카테고리를 먼저 입력해주세요.", 400);
    }

    const analysis = await estimateProject(String(description), String(category));
    return apiOk({ analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "분석 실패";
    return apiError(message, 400);
  }
}
