"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";

const SKILL_FILTERS = [
  "전체", "React", "Next.js", "Vue", "Node.js", "Python", "Java",
  "AWS", "Docker", "Figma", "UI/UX", "마케팅",
];

interface FreelancerSummary {
  uid: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  skills: string[];
  hourlyRate: number | null;
  avgRating: number;
  reviewCount: number;
}

export default function ExpertsPage() {
  const [freelancers, setFreelancers] = useState<FreelancerSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState("");
  const [sort, setSort] = useState("rating");
  const [page, setPage] = useState(1);

  const fetchFreelancers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (skill) params.set("skill", skill);
      params.set("sort", sort);
      params.set("page", String(page));
      const res = await axios.get(`/api/users?${params}`);
      setFreelancers(res.data.users);
      setTotal(res.data.total);
    } catch {
      setFreelancers([]);
    } finally {
      setLoading(false);
    }
  }, [skill, sort, page]);

  useEffect(() => { fetchFreelancers(); }, [fetchFreelancers]);

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">전문가 찾기</h1>
        <p className="text-gray-500 text-sm">검증된 프리랜서와 함께 프로젝트를 완성하세요.</p>
      </div>

      {/* 스킬 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SKILL_FILTERS.map((s) => {
          const val = s === "전체" ? "" : s;
          return (
            <button
              key={s}
              onClick={() => { setSkill(val); setPage(1); }}
              className={`px-3 py-1.5 rounded-full border text-sm transition ${
                skill === val
                  ? "bg-[#7c3aed] text-white border-[#7c3aed]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#7c3aed]"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* 정렬 + 결과 수 */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-400">총 {total}명</span>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="rating">별점 높은순</option>
          <option value="reviews">리뷰 많은순</option>
          <option value="newest">최신 가입순</option>
        </select>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : freelancers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">👥</p>
          <p>조건에 맞는 프리랜서가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {freelancers.map((f) => (
            <FreelancerCard key={f.uid} freelancer={f} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${
                page === p ? "bg-[#7c3aed] text-white" : "bg-white border border-gray-300 text-gray-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FreelancerCard({ freelancer: f }: { freelancer: FreelancerSummary }) {
  return (
    <Link
      href={`/experts/${f.uid}`}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-[#7c3aed] transition block"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-lg font-bold text-[#7c3aed] shrink-0">
          {f.avatarUrl ? (
            <img src={f.avatarUrl} alt={f.name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            f.name?.charAt(0) ?? "?"
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{f.name}</p>
          {(f.avgRating ?? 0) > 0 ? (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-yellow-400">★</span>
              <span className="font-medium">{f.avgRating.toFixed(1)}</span>
              <span className="text-gray-400">({f.reviewCount})</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">리뷰 없음</span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{f.bio || "소개글이 없습니다."}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {f.skills.slice(0, 4).map((s) => (
          <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
        ))}
        {f.skills.length > 4 && (
          <span className="text-xs text-gray-400">+{f.skills.length - 4}</span>
        )}
      </div>

      {f.hourlyRate && (
        <p className="text-sm font-semibold text-[#7c3aed]">
          시간당 {f.hourlyRate.toLocaleString()}원
        </p>
      )}
    </Link>
  );
}
