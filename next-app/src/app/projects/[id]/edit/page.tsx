"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { Project, ProjectCategory, PROJECT_CATEGORY_LABELS } from "@/types";
import Link from "next/link";

const SKILLS = [
  "React", "Next.js", "Vue", "Angular", "Node.js", "Python", "Java",
  "SQL", "AWS", "Docker", "Figma", "UI/UX", "SEO", "카피라이팅", "기타",
];

type FirestoreDateLike = {
  toDate?: () => Date;
  seconds?: number;
};

function timestampToDate(value: unknown): Date | null {
  const timestamp = value as FirestoreDateLike | null | undefined;
  if (timestamp?.toDate) return timestamp.toDate();
  return typeof timestamp?.seconds === "number" ? new Date(timestamp.seconds * 1000) : null;
}

export default function ProjectEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "" as ProjectCategory | "",
    budgetMin: "",
    budgetMax: "",
    deadline: "",
    requiredSkills: [] as string[],
  });

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const currentUser = user;

    async function loadProject() {
      try {
        const res = await axios.get(`/api/projects/${id}`);
        const p: Project = res.data;

        // 본인 소유 프로젝트인지 확인
        if (!currentUser || p.clientId !== currentUser.uid) {
          router.replace(`/projects/${id}`);
          return;
        }

        const deadlineDate = timestampToDate(p.deadline);

        if (!cancelled) {
          setProject(p);
          setForm({
            title: p.title,
            description: p.description,
            category: p.category,
            budgetMin: String(p.budgetMin ?? ""),
            budgetMax: String(p.budgetMax ?? ""),
            deadline: deadlineDate
              ? deadlineDate.toISOString().split("T")[0]
              : "",
            requiredSkills: p.requiredSkills ?? [],
          });
        }
      } catch {
        router.replace("/my-projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProject();
    return () => { cancelled = true; };
  }, [id, user, router]);

  function toggleSkill(skill: string) {
    setForm((f) => ({
      ...f,
      requiredSkills: f.requiredSkills.includes(skill)
        ? f.requiredSkills.filter((s) => s !== skill)
        : [...f.requiredSkills, skill],
    }));
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim() || !form.category) {
      setError("제목, 설명, 카테고리는 필수입니다.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const token = await user!.getIdToken();
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        requiredSkills: form.requiredSkills,
      };

      // 지원자 없을 때만 예산/마감일 수정 가능
      if ((project?.applicationCount ?? 0) === 0) {
        if (form.budgetMin) body.budgetMin = parseInt(form.budgetMin);
        if (form.budgetMax) body.budgetMax = parseInt(form.budgetMax);
        if (form.deadline) body.deadline = form.deadline;
      }

      await axios.patch(`/api/projects/${id}`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "저장에 실패했습니다.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    try {
      const token = await user!.getIdToken();
      await axios.delete(`/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      router.replace("/my-projects");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "삭제에 실패했습니다.";
      setError(msg);
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">불러오는 중...</div>;
  }

  if (!project) return null;

  const budgetLocked = (project.applicationCount ?? 0) > 0;
  const isEditable = !["completed", "closed"].includes(project.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/projects/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← 프로젝트 상세
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-2">프로젝트 수정</h1>

      {!isEditable && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-500">
          완료 또는 마감된 프로젝트는 수정할 수 없습니다.
        </div>
      )}

      {budgetLocked && isEditable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-700">
          지원자가 있어 예산과 마감일은 수정할 수 없습니다. 제목·설명·카테고리·기술 스택은 수정 가능합니다.
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-700">
          저장됐습니다. <Link href={`/projects/${id}`} className="underline">프로젝트 보기 →</Link>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* 제목 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">제목 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            disabled={!isEditable}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">카테고리 *</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PROJECT_CATEGORY_LABELS) as ProjectCategory[]).map((c) => (
              <button
                key={c}
                type="button"
                disabled={!isEditable}
                onClick={() => setForm({ ...form, category: c })}
                className={`py-2 px-3 rounded-xl border text-sm transition ${
                  form.category === c
                    ? "border-[#7c3aed] bg-purple-50 text-[#7c3aed]"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                } disabled:opacity-50 disabled:cursor-default`}
              >
                {PROJECT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">설명 *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={!isEditable}
            rows={6}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* 예산 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            예산 (원)
            {budgetLocked && <span className="ml-2 text-xs text-gray-400">잠금 — 지원자 있음</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={form.budgetMin}
              onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
              placeholder="최소"
              disabled={budgetLocked || !isEditable}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] disabled:bg-gray-50 disabled:text-gray-400"
            />
            <input
              type="number"
              value={form.budgetMax}
              onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
              placeholder="최대"
              disabled={budgetLocked || !isEditable}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* 마감일 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            모집 마감일
            {budgetLocked && <span className="ml-2 text-xs text-gray-400">잠금 — 지원자 있음</span>}
          </label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            disabled={budgetLocked || !isEditable}
            min={new Date().toISOString().split("T")[0]}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* 기술 스택 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">필요 기술 스택</label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={!isEditable}
                onClick={() => toggleSkill(s)}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${
                  form.requiredSkills.includes(s)
                    ? "border-[#7c3aed] bg-purple-50 text-[#7c3aed]"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                } disabled:opacity-50 disabled:cursor-default`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            선택됨: {form.requiredSkills.join(", ") || "없음"}
          </p>
        </div>

        {/* AI 분석 결과 (읽기 전용) */}
        {project.aiAnalysis && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-[#7c3aed] mb-2">🤖 AI 단가 분석 결과</p>
            <div className="space-y-1.5 mb-3">
              {project.aiAnalysis.features.map((f, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{f.name}</span>
                  <span className="font-medium text-[#7c3aed]">{f.estimatedPrice.toLocaleString()}원</span>
                </div>
              ))}
            </div>
            <div className="border-t border-purple-200 pt-2 flex justify-between text-sm font-semibold">
              <span>총 예상 단가</span>
              <span className="text-[#7c3aed]">{project.aiAnalysis.totalEstimate.toLocaleString()}원</span>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {isEditable && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#7c3aed] text-white font-medium text-sm hover:bg-purple-700 transition disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        )}
      </div>

      {/* 삭제 영역 */}
      {["open", "in_review"].includes(project.status) && (
        <div className="mt-6 bg-white rounded-2xl border border-red-200 p-5">
          <h3 className="text-sm font-semibold text-red-600 mb-1">위험 구역</h3>
          <p className="text-xs text-gray-500 mb-4">
            프로젝트를 삭제하면 복구할 수 없습니다. 지원자가 있는 경우 모든 지원서가 함께 삭제됩니다.
          </p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-xl border border-red-400 text-red-600 text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
          >
            {deleting ? "삭제 중..." : "프로젝트 삭제"}
          </button>
        </div>
      )}
    </div>
  );
}
