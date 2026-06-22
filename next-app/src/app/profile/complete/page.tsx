"use client";

import { useState, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { UserRole } from "@/types";

const SKILLS = ["React", "Next.js", "Vue", "Node.js", "Python", "Java", "SQL", "AWS", "Docker", "Figma", "UI/UX", "SEO", "마케팅", "기타"];
const BUSINESS_FIELDS = ["IT/스타트업", "전자상거래", "금융", "교육", "의료", "패션", "식품", "부동산", "기타"];

export default function ProfileCompletePage() {
  return <Suspense fallback={null}><ProfileCompleteContent /></Suspense>;
}

function ProfileCompleteContent() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/";

  const [role, setRole] = useState<UserRole>(profile?.role ?? "client");
  const [form, setForm] = useState({
    bio: profile?.bio ?? "",
    skills: profile?.skills ?? [] as string[],
    hourlyRate: String(profile?.hourlyRate ?? ""),
    portfolioUrl: profile?.portfolioUrl ?? "",
    companyName: profile?.companyName ?? "",
    businessField: profile?.businessField ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    router.push("/");
    return null;
  }

  function toggleSkill(skill: string) {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter((s) => s !== skill)
        : [...f.skills, skill],
    }));
  }

  async function handleSave() {
    if (!form.bio) {
      setError("자기소개를 입력해주세요.");
      return;
    }
    if (role === "freelancer" && form.skills.length === 0) {
      setError("기술 스택을 하나 이상 선택해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const token = await user!.getIdToken();
      await axios.patch("/api/auth/me", {
        role,
        bio: form.bio,
        skills: form.skills,
        hourlyRate: form.hourlyRate ? parseInt(form.hourlyRate) : null,
        portfolioUrl: form.portfolioUrl || null,
        companyName: form.companyName || null,
        businessField: form.businessField || null,
      }, { headers: { Authorization: `Bearer ${token}` } });

      await refreshProfile();
      router.push(returnTo);
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">프로필 설정</h1>
      <p className="text-gray-500 text-sm mb-6">원활한 서비스 이용을 위해 프로필을 완성해주세요.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* 역할 선택 (소셜 로그인 신규 유저) */}
        {(!profile?.role || profile.role === null) && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">역할 선택 *</label>
            <div className="flex gap-3">
              {(["client", "freelancer"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition ${
                    role === r
                      ? "border-[#7c3aed] bg-purple-50 text-[#7c3aed]"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {r === "client" ? "🏢 의뢰인" : "💻 프리랜서"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">자기소개 *</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder={role === "client" ? "어떤 회사/팀인지 소개해주세요." : "본인의 경험과 강점을 소개해주세요."}
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none"
          />
        </div>

        {role === "client" && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">회사/팀명</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="회사명 또는 팀명"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">사업 분야</label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_FIELDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setForm({ ...form, businessField: f })}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      form.businessField === f
                        ? "border-[#7c3aed] bg-purple-50 text-[#7c3aed]"
                        : "border-gray-300 text-gray-600"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {role === "freelancer" && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">기술 스택 * (1개 이상)</label>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      form.skills.includes(s)
                        ? "border-[#7c3aed] bg-purple-50 text-[#7c3aed]"
                        : "border-gray-300 text-gray-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">시간당 단가 (원)</label>
              <input
                type="number"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                placeholder="예: 50000"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">포트폴리오 URL</label>
              <input
                type="url"
                value={form.portfolioUrl}
                onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                placeholder="https://github.com/..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              />
            </div>
          </>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#7c3aed] text-white font-medium text-sm hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? "저장 중..." : "저장하고 계속하기"}
        </button>
      </div>
    </div>
  );
}
