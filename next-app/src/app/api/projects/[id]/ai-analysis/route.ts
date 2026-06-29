import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";
import { estimateProject, type Estimate } from "@/lib/aiEstimate";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const snap = await adminDb.collection("projects").doc(id).get();
    if (!snap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = snap.data()!;
    if (project.clientId !== uid) return apiError("권한이 없습니다.", 403);

    // 비동기 분석 시작 (즉시 202 반환, 결과는 프로젝트 문서에 반영)
    triggerAiAnalysis(id, project.description, project.category).catch(console.error);

    return apiOk({ message: "AI 분석을 시작했습니다. 잠시 후 결과가 표시됩니다." }, 202);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "분석 요청 실패";
    return apiError(message, 400);
  }
}

// 분석 결과 저장 — 예산이 0이면 totalEstimate 기반으로 자동 채움
async function saveAnalysis(
  projectId: string,
  analysis: Estimate,
  currentProject: FirebaseFirestore.DocumentData
) {
  const updates: Record<string, unknown> = {
    aiAnalysis: { ...analysis, analyzedAt: Timestamp.now() },
    updatedAt: Timestamp.now(),
  };

  if ((currentProject.budgetMin ?? 0) === 0 && (currentProject.budgetMax ?? 0) === 0 && analysis.totalEstimate > 0) {
    const base = analysis.totalEstimate;
    updates.budgetMin = Math.round(base * 0.8 / 10000) * 10000;
    updates.budgetMax = Math.round(base * 1.2 / 10000) * 10000;
  }

  await adminDb.collection("projects").doc(projectId).update(updates);
}

async function triggerAiAnalysis(projectId: string, description: string, category: string) {
  const projectSnap = await adminDb.collection("projects").doc(projectId).get();
  const currentProject = projectSnap.data() ?? {};

  try {
    const analysis = await estimateProject(description, category);
    await saveAnalysis(projectId, analysis, currentProject);
  } catch (err) {
    console.error("AI 분석 저장 실패:", err);
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
