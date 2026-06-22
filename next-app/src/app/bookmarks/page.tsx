"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { Project, PROJECT_STATUS_LABELS, PROJECT_CATEGORY_LABELS } from "@/types";
import { Timestamp } from "firebase/firestore";

interface BookmarkedProject extends Project {
  bookmarkId: string;
}

export default function BookmarksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<BookmarkedProject[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await axios.get("/api/bookmarks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProjects(res.data.bookmarks ?? []);
      } catch {
        setProjects([]);
      } finally {
        setFetching(false);
      }
    })();
  }, [user]);

  async function handleRemove(projectId: string) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await axios.post("/api/bookmarks/toggle", { projectId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch {
      alert("북마크 해제에 실패했습니다.");
    }
  }

  if (loading || fetching) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">불러오는 중...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">내 북마크</h1>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-4xl mb-4">🔖</p>
          <p className="text-gray-500 mb-4">북마크한 프로젝트가 없습니다.</p>
          <Link
            href="/projects"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition"
          >
            프로젝트 탐색하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => (
            <BookmarkCard key={p.id} project={p} onRemove={() => handleRemove(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookmarkCard({
  project: p,
  onRemove,
}: {
  project: BookmarkedProject;
  onRemove: () => void;
}) {
  const deadline = (p.deadline as unknown as Timestamp)?.toDate?.();
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4 hover:shadow-sm transition">
      <Link href={`/projects/${p.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[p.status]}`}>
            {PROJECT_STATUS_LABELS[p.status]}
          </span>
          <span className="text-xs text-gray-400">{PROJECT_CATEGORY_LABELS[p.category]}</span>
        </div>
        <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{p.description}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span>{p.budgetMin?.toLocaleString()}~{p.budgetMax?.toLocaleString()}원</span>
          {daysLeft !== null && (
            <span className={daysLeft <= 3 ? "text-red-500" : ""}>
              {daysLeft > 0 ? `D-${daysLeft}` : "마감됨"}
            </span>
          )}
        </div>
      </Link>
      <button
        onClick={onRemove}
        title="북마크 해제"
        className="shrink-0 text-gray-300 hover:text-red-400 transition text-xl"
      >
        🔖
      </button>
    </div>
  );
}
