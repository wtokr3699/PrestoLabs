"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { UserProfile } from "@/types";
import type { User } from "firebase/auth";

const SKILLS = [
  "React", "Next.js", "Vue", "Angular", "Node.js", "Python", "Java",
  "Spring", "Django", "SQL", "MongoDB", "AWS", "Docker", "Kubernetes",
  "Figma", "UI/UX", "SEO", "마케팅", "기타",
];
const BUSINESS_FIELDS = [
  "IT/스타트업", "전자상거래", "금융", "교육", "의료", "패션", "식품", "부동산", "기타",
];

type ProfileForm = {
  name: string;
  bio: string;
  skills: string[];
  hourlyRate: string;
  portfolioUrl: string;
  companyName: string;
  businessField: string;
};

function createProfileForm(profile: UserProfile): ProfileForm {
  return {
    name: profile.name ?? "",
    bio: profile.bio ?? "",
    skills: profile.skills ?? [],
    hourlyRate: String(profile.hourlyRate ?? ""),
    portfolioUrl: profile.portfolioUrl ?? "",
    companyName: profile.companyName ?? "",
    businessField: profile.businessField ?? "",
  };
}

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !profile || !user) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">불러오는 중...</div>;
  }

  return (
    <ProfileEditor
      key={profile.uid}
      user={user}
      profile={profile}
      refreshProfile={refreshProfile}
    />
  );
}

function ProfileEditor({
  user,
  profile,
  refreshProfile,
}: {
  user: User;
  profile: UserProfile;
  refreshProfile: () => Promise<void>;
}) {
  const [form, setForm] = useState(() => createProfileForm(profile));
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const isFreelancer = profile.role === "freelancer";

  function toggleSkill(skill: string) {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter((s) => s !== skill)
        : [...f.skills, skill],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!form.bio.trim()) {
      setError("자기소개를 입력해주세요.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const token = await user.getIdToken();
      await axios.patch("/api/auth/me", {
        name: form.name.trim(),
        bio: form.bio,
        skills: form.skills,
        hourlyRate: form.hourlyRate ? parseInt(form.hourlyRate) : null,
        portfolioUrl: form.portfolioUrl || null,
        companyName: form.companyName || null,
        businessField: form.businessField || null,
      }, { headers: { Authorization: `Bearer ${token}` } });

      await refreshProfile();
      setSuccess(true);
    } catch {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-2xl font-bold text-[#7c3aed]">
          {profile.name?.charAt(0) ?? "?"}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isFreelancer ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          }`}>
            {isFreelancer ? "프리랜서" : "의뢰인"}
          </span>
        </div>
        {isFreelancer && (
          <Link
            href={`/experts/${profile.uid}`}
            className="ml-auto text-sm text-[#7c3aed] hover:underline"
          >
            공개 프로필 보기 →
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        {/* 이름 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">이름 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
          />
        </div>

        {/* 자기소개 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">자기소개 *</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder={isFreelancer ? "본인의 경험과 강점을 소개해주세요." : "어떤 회사/팀인지 소개해주세요."}
            rows={4}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none"
          />
        </div>

        {/* 프리랜서 전용 */}
        {isFreelancer && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">기술 스택</label>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      form.skills.includes(s)
                        ? "border-[#7c3aed] bg-purple-50 text-[#7c3aed]"
                        : "border-gray-300 text-gray-600 hover:border-[#7c3aed]"
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
                min="0"
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

        {/* 의뢰인 전용 */}
        {!isFreelancer && (
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
                        : "border-gray-300 text-gray-600 hover:border-[#7c3aed]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 별점 현황 (읽기 전용) */}
        {isFreelancer && (profile.avgRating ?? 0) > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">평가 현황</p>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-lg">★</span>
              <span className="font-semibold">{(profile.avgRating ?? 0).toFixed(1)}</span>
              <span className="text-gray-400 text-sm">({profile.reviewCount ?? 0}개 리뷰)</span>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">프로필이 저장됐습니다.</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-[#7c3aed] text-white font-medium text-sm hover:bg-purple-700 transition disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
}
