import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("projects").doc(id).get();
    if (!snap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = snap.data()!;
    if (project.clientId !== uid) return apiError("권한이 없습니다.", 403);

    // 비동기 분석 시작 (즉시 202 반환, onSnapshot으로 결과 수신)
    triggerAiAnalysis(id, project.description, project.category).catch(console.error);

    return apiOk({ message: "AI 분석을 시작했습니다. 잠시 후 결과가 표시됩니다." }, 202);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "분석 요청 실패";
    return apiError(message, 400);
  }
}

async function triggerAiAnalysis(projectId: string, description: string, category: string) {
  const prompt = `
당신은 IT 프리랜서 플랫폼의 단가 분석 전문가입니다.
아래 프로젝트 설명을 분석하여 단위 기능별 예상 단가를 산정해주세요.

프로젝트 카테고리: ${category}
프로젝트 설명: ${description}

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "features": [
    {"name": "기능명", "description": "기능 설명", "estimatedPrice": 숫자(원 단위)}
  ],
  "totalEstimate": 전체 예상 금액(숫자),
  "report": "전체 분석 요약 (2-3문장)"
}
  `.trim();

  try {
    let aiResponse: string | null = null;

    if (process.env.LLM_PROVIDER === "anthropic" && process.env.LLM_API_KEY) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.LLM_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      aiResponse = data.content?.[0]?.text ?? null;
    } else if (process.env.LLM_PROVIDER === "openai" && process.env.LLM_API_KEY) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      aiResponse = data.choices?.[0]?.message?.content ?? null;
    }

    if (!aiResponse) throw new Error("AI 응답 없음");

    const parsed = JSON.parse(aiResponse);

    await adminDb.collection("projects").doc(projectId).update({
      aiAnalysis: {
        features: parsed.features ?? [],
        totalEstimate: parsed.totalEstimate ?? 0,
        report: parsed.report ?? "",
        analyzedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    console.error("AI 분석 실패:", err);
    // 실패해도 프로젝트에 에러 상태 기록
    await adminDb.collection("projects").doc(projectId).update({
      aiAnalysis: {
        features: [],
        totalEstimate: 0,
        report: "AI 분석에 실패했습니다. 다시 시도해주세요.",
        error: true,
        analyzedAt: Timestamp.now(),
      },
    });
  }
}
