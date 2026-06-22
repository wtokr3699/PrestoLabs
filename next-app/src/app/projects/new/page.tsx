"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ProjectCategory, PROJECT_CATEGORY_LABELS } from "@/types";

const SKILLS = ["React", "Next.js", "Vue", "Angular", "Node.js", "Python", "Java", "SQL", "AWS", "Docker", "Figma", "UI/UX", "SEO", "카피라이팅", "기타"];

export default function NewProjectPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    features: { name: string; description: string; estimatedPrice: number }[];
    totalEstimate: number;
    report: string;
  } | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "" as ProjectCategory | "",
    budgetMin: "",
    budgetMax: "",
    deadline: "",
    requiredSkills: [] as string[],
  });

  if (!user || profile?.role !== "client") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">의뢰인 계정으로 로그인해야 합니다.</p>
      </div>
    );
  }

  if (!profile.profileComplete) {
    router.push("/profile/complete?returnTo=/projects/new");
    return null;
  }

  function toggleSkill(skill: string) {
    setForm((f) => ({
      ...f,
      requiredSkills: f.requiredSkills.includes(skill)
        ? f.requiredSkills.filter((s) => s !== skill)
        : [...f.requiredSkills, skill],
    }));
  }

  async function requestAiAnalysis() {
    if (!form.description || !form.category) {
      setError("프로젝트 설명과 카테고리를 먼저 입력해주세요.");
      return;
    }
    setAiLoading(true);
    setError("");
    try {
      const token = await user!.getIdToken();
      // 임시 프로젝트 생성 후 분석 (또는 별도 엔드포인트)
      const createRes = await axios.post("/api/projects", {
        ...form,
        budgetMin: parseInt(form.budgetMin || "0"),
        budgetMax: parseInt(form.budgetMax || "0"),
        deadline: form.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { headers: { Authorization: `Bearer ${token}` } });

      const projectId = createRes.data.id;

      await axios.post(`/api/projects/${projectId}/ai-analysis`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // polling (간단하게 3초 후 결과 확인)
      await new Promise((r) => setTimeout(r, 4000));
      const res = await axios.get(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.aiAnalysis) {
        setAiResult(res.data.aiAnalysis);
        router.push(`/projects/${projectId}/edit`);
      }
    } catch (err) {
      setError("AI 분석 요청에 실패했습니다.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    if (!form.title || !form.description || !form.category || !form.deadline) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = await user!.getIdToken();
      const res = await axios.post("/api/projects", {
        ...form,
        budgetMin: parseInt(form.budgetMin || "0"),
        budgetMax: parseInt(form.budgetMax || "0"),
      }, { headers: { Authorization: `Bearer ${token}` } });

      router.push(`/projects/${res.data.id}`);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "등록에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">프로젝트 등록</h1>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
              step >= s ? "bg-[#7c3aed] text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {s}
            </div>
            <span className="text-sm text-gray-500">
              {s === 1 ? "기본 정보" : s === 2 ? "일정 & 예산" : "기술 스택"}
            </span>
            {s < 3 && <div className={`flex-1 h-px w-8 ${step > s ? "bg-[#7c3aed]" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">프로젝트 제목 *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: 쇼핑몰 랜딩페이지 제작"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">카테고리 *</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PROJECT_CATEGORY_LABELS) as ProjectCategory[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className={`py-2 px-3 rounded-xl border text-sm transition ${
                      form.category === c
                        ? "border-[#7c3aed] bg-purple-50 text-[#7c3aed]"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {PROJECT_CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">프로젝트 설명 *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="어떤 프로젝트인지 자세히 설명해주세요."
                rows={5}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">예산 최소 (원)</label>
                <input
                  type="number"
                  value={form.budgetMin}
                  onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
                  placeholder="500000"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">예산 최대 (원)</label>
                <input
                  type="number"
                  value={form.budgetMax}
                  onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
                  placeholder="1000000"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                />
              </div>
            </div>

            {/* AI 단가 분석 */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm font-medium text-[#7c3aed] mb-2">💡 예산이 막막하신가요?</p>
              <p className="text-xs text-gray-600 mb-3">
                AI가 프로젝트 설명을 분석해 단위 기능별 예상 단가를 산정해드립니다.
              </p>
              <button
                type="button"
                onClick={requestAiAnalysis}
                disabled={aiLoading}
                className="px-4 py-2 rounded-lg bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50"
              >
                {aiLoading ? "분석 중..." : "AI 단가 분석 요청"}
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">모집 마감일 *</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">필요 기술 스택</label>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition ${
                    form.requiredSkills.includes(s)
                      ? "border-[#7c3aed] bg-purple-50 text-[#7c3aed]"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">선택된 기술: {form.requiredSkills.join(", ") || "없음"}</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              이전
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex-1 py-3 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? "등록 중..." : "프로젝트 등록"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
