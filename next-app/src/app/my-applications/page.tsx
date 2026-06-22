"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Application } from "@/types";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "검토 중", color: "bg-yellow-100 text-yellow-700" },
  accepted: { label: "수락됨", color: "bg-green-100 text-green-700" },
  rejected: { label: "거절됨", color: "bg-red-100 text-red-600" },
  auto_rejected: { label: "자동 거절", color: "bg-gray-100 text-gray-500" },
};

export default function MyApplicationsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<(Application & { projectTitle?: string; contractId?: string | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/"); return; }
    fetchApplications();
  }, [user]);

  async function fetchApplications() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      // 프리랜서의 모든 지원서 조회 (프로젝트별로)
      // 실제로는 별도 API가 있어야 하지만 여기서는 프로젝트 목록에서 내 지원서를 찾음
      // TODO: GET /api/applications/my 엔드포인트 추가
      const res = await axios.get("/api/applications/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplications(res.data.applications);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }

  if (!user || profile?.role !== "freelancer") {
    return <div className="text-center py-20 text-gray-400">프리랜서 계정이 필요합니다.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">내 지원 현황</h1>

      {loading ? (
        <div className="text-center py-20 text-gray-400">불러오는 중...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">아직 지원한 프로젝트가 없습니다.</p>
          <Link href="/projects" className="px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-sm font-medium">
            프로젝트 탐색하기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((a) => {
            const s = STATUS_LABELS[a.status] ?? STATUS_LABELS.pending;
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Link
                      href={`/projects/${a.projectId}`}
                      className="font-semibold text-gray-900 hover:text-[#7c3aed] transition"
                    >
                      {a.projectTitle ?? `프로젝트 #${a.projectId.slice(0, 8)}`}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.coverLetter}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      제안 금액: {a.proposedBudget?.toLocaleString()}원 / {a.estimatedDays}일
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${s.color}`}>
                    {s.label}
                  </span>
                </div>
                {a.status === "accepted" && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3">
                    {a.contractId ? (
                      <Link
                        href={`/contracts/${a.contractId}`}
                        className="text-sm text-[#7c3aed] font-medium hover:underline"
                      >
                        계약서 보기 →
                      </Link>
                    ) : (
                      <Link
                        href={`/projects/${a.projectId}`}
                        className="text-sm text-[#7c3aed] hover:underline"
                      >
                        프로젝트 보기 →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
