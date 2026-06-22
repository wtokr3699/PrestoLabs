"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Project, PROJECT_STATUS_LABELS } from "@/types";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  in_review: "bg-blue-100 text-blue-700",
  matched: "bg-purple-100 text-purple-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  submitted: "bg-orange-100 text-orange-700",
  completed: "bg-gray-100 text-gray-600",
  closed: "bg-red-100 text-red-600",
};

export default function MyProjectsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetchProjects();
  }, [user]);

  async function fetchProjects() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await axios.get("/api/projects/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(res.data.projects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  if (profile?.role !== "client" && !authLoading) {
    return (
      <div className="text-center py-20 text-gray-400">의뢰인 계정이 필요합니다.</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">내 프로젝트</h1>
        <Link
          href="/projects/new"
          className="px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition"
        >
          + 새 프로젝트
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-gray-400 mb-4">등록된 프로젝트가 없습니다.</p>
          <Link
            href="/projects/new"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition"
          >
            첫 프로젝트 등록하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectRow key={p.id} project={p} onRefresh={fetchProjects} user={user!} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectRow({
  project: p,
  onRefresh,
  user,
}: {
  project: Project;
  onRefresh: () => void;
  user: import("firebase/auth").User;
}) {
  const [now] = useState(() => Date.now());
  const deadline = (p.deadline as unknown as Timestamp)?.toDate?.();
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - now) / (1000 * 60 * 60 * 24))
    : null;
  const [closing, setClosing] = useState(false);

  async function handleClose() {
    if (!confirm("모집을 마감하시겠습니까?")) return;
    setClosing(true);
    try {
      const token = await user.getIdToken();
      await axios.patch(
        `/api/projects/${p.id}/status`,
        { status: "closed" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onRefresh();
    } catch {
      alert("마감에 실패했습니다.");
    } finally {
      setClosing(false);
    }
  }

  const canEdit = !["completed", "closed"].includes(p.status);
  const canClose = ["open", "in_review"].includes(p.status);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status]}`}>
              {PROJECT_STATUS_LABELS[p.status]}
            </span>
            {daysLeft !== null && p.status === "open" && (
              <span className={`text-xs ${daysLeft <= 3 ? "text-red-500" : "text-gray-400"}`}>
                {daysLeft > 0 ? `D-${daysLeft}` : "마감됨"}
              </span>
            )}
          </div>
          <Link
            href={`/projects/${p.id}`}
            className="font-semibold text-gray-900 hover:text-[#7c3aed] transition block truncate"
          >
            {p.title}
          </Link>
          <p className="text-xs text-gray-400 mt-1">
            지원자 {p.applicationCount}명
            {p.budgetMax ? ` · 예산 ~${p.budgetMax.toLocaleString()}원` : ""}
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 shrink-0">
          {p.contractId && (
            <Link
              href={`/contracts/${p.contractId}`}
              className="px-3 py-1.5 rounded-lg bg-purple-100 text-[#7c3aed] text-xs font-medium hover:bg-purple-200 transition"
            >
              계약서
            </Link>
          )}
          {canEdit && (
            <Link
              href={`/projects/${p.id}/edit`}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 transition"
            >
              수정
            </Link>
          )}
          {canClose && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition disabled:opacity-50"
            >
              마감
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
