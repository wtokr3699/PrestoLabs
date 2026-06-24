"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { Project, ProjectCategory, ProjectStatus, PROJECT_CATEGORY_LABELS, PROJECT_STATUS_LABELS } from "@/types";
// Admin SDK는 _seconds, Client SDK는 seconds — 양쪽 모두 처리
function tsToDate(value: unknown): Date | null {
  if (!value || typeof value !== "object") return null;
  const t = value as Record<string, unknown>;
  if (typeof t.toDate === "function") return (t.toDate as () => Date)();
  const secs = typeof t.seconds === "number" ? t.seconds
    : typeof t._seconds === "number" ? (t._seconds as number)
    : null;
  return secs !== null ? new Date(secs * 1000) : null;
}
function tsToSecs(value: unknown): number | null {
  const d = tsToDate(value);
  return d ? Math.floor(d.getTime() / 1000) : null;
}

const CATEGORIES: { value: ProjectCategory | ""; label: string }[] = [
  { value: "", label: "전체" },
  { value: "landing", label: "랜딩페이지" },
  { value: "website", label: "웹사이트" },
  { value: "automation", label: "업무 자동화" },
  { value: "mvp", label: "MVP 개발" },
  { value: "admin", label: "관리자 페이지" },
  { value: "chatbot", label: "챗봇" },
  { value: "design", label: "디자인" },
  { value: "marketing", label: "마케팅" },
  { value: "other", label: "기타" },
];

const STATUS_FILTER: { value: ProjectStatus | ""; label: string }[] = [
  { value: "", label: "전체 상태" },
  { value: "open", label: "모집 중" },
  { value: "in_review", label: "검토 중" },
  { value: "closed", label: "마감" },
];

export default function ProjectsPage() {
  return <Suspense fallback={<div className="text-center py-20 text-gray-400">불러오는 중...</div>}><ProjectsContent /></Suspense>;
}

function ProjectsContent() {
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [draftKeyword, setDraftKeyword] = useState(searchParams.get("q") ?? "");
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<string>(searchParams.get("category") ?? "");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (keyword) params.set("q", keyword);
        if (category) params.set("category", category);
        if (status) params.set("status", status);
        params.set("page", String(page));
        params.set("limit", "10");

        const res = await axios.get(`/api/projects?${params}`);
        let items = res.data.projects as Project[];

        // 정렬 클라이언트 사이드
        if (sort === "deadline") {
          items = [...items].sort((a, b) => {
            const ta = tsToSecs(a.deadline) ?? 0;
            const tb = tsToSecs(b.deadline) ?? 0;
            return ta - tb;
          });
        } else if (sort === "budget") {
          items = [...items].sort((a, b) => (b.budgetMax ?? 0) - (a.budgetMax ?? 0));
        }

        if (!cancelled) {
          setProjects(items);
          setTotal(res.data.total);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchProjects();
    return () => { cancelled = true; };
  }, [keyword, category, status, page, sort]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setKeyword(draftKeyword);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">프로젝트 탐색</h1>
        <Link
          href="/projects/new"
          className="px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition"
        >
          + 프로젝트 등록
        </Link>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="프로젝트 검색..."
          value={draftKeyword}
          onChange={(e) => setDraftKeyword(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-sm font-medium"
        >
          검색
        </button>
      </form>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => { setCategory(c.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${
              category === c.value
                ? "bg-[#7c3aed] text-white border-[#7c3aed]"
                : "bg-white text-gray-600 border-gray-300 hover:border-[#7c3aed]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          {STATUS_FILTER.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="newest">최신순</option>
          <option value="deadline">마감임박순</option>
          <option value="budget">예산 높은순</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">총 {total}개</span>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">프로젝트가 없습니다.</div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {total > 10 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: Math.ceil(total / 10) }, (_, i) => i + 1).map((p) => (
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

function ProjectCard({ project }: { project: Project }) {
  const [now] = useState(() => Date.now());
  const deadline = tsToDate(project.deadline);
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - now) / (1000 * 60 * 60 * 24))
    : null;

  const statusColor: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    in_review: "bg-blue-100 text-blue-700",
    matched: "bg-purple-100 text-purple-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    submitted: "bg-orange-100 text-orange-700",
    completed: "bg-gray-100 text-gray-600",
    closed: "bg-red-100 text-red-600",
  };

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-[#7c3aed] transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[project.status]}`}>
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
            <span className="text-xs text-gray-400">
              {PROJECT_CATEGORY_LABELS[project.category]}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
          {project.requiredSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {project.requiredSkills.slice(0, 4).map((s) => (
                <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-gray-900 text-sm">
            {project.budgetMin?.toLocaleString()}~{project.budgetMax?.toLocaleString()}원
          </p>
          {daysLeft !== null && (
            <p className={`text-xs mt-1 ${daysLeft <= 3 ? "text-red-500" : "text-gray-400"}`}>
              {daysLeft > 0 ? `D-${daysLeft}` : "마감됨"}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">지원 {project.applicationCount}명</p>
        </div>
      </div>
    </Link>
  );
}
