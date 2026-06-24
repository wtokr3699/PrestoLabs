"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Project, Application, PROJECT_STATUS_LABELS, PROJECT_CATEGORY_LABELS } from "@/types";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

type Review = {
  id: string;
  reviewerId: string;
  revieweeId: string;
  reviewerRole: "client" | "freelancer";
  rating: number;
  comment: string;
  tags: string[];
  createdAt: { seconds: number };
};

const REVIEW_TAGS = ["소통 원활", "기한 준수", "퀄리티 우수", "재계약 의향", "친절함", "전문성"];

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className={`text-2xl transition ${onChange ? "cursor-pointer" : "cursor-default"} ${s <= value ? "text-yellow-400" : "text-gray-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, profile } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyForm, setApplyForm] = useState({ coverLetter: "", proposedBudget: "", estimatedDays: "" });
  const [applyLoading, setApplyLoading] = useState(false);
  const [acceptForm, setAcceptForm] = useState<{ appId: string; budget: string } | null>(null);
  const [error, setError] = useState("");

  // 리뷰 관련 상태
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "", tags: [] as string[] });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (project?.status === "completed") fetchReviews();
  }, [project?.status]);

  async function fetchProject() {
    try {
      const res = await axios.get(`/api/projects/${id}`);
      setProject(res.data);

      if (user) {
        const token = await user.getIdToken();
        const appsRes = await axios.get(`/api/projects/${id}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const apps: Application[] = appsRes.data.applications;
        setApplications(apps);
        if (profile?.role === "freelancer") {
          setMyApplication(apps.find((a) => a.freelancerId === user.uid) ?? null);
        }
      }
    } catch {
      router.push("/projects");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!user) return;
    if (!profile?.profileComplete) {
      router.push(`/profile/complete?returnTo=/projects/${id}`);
      return;
    }
    setApplyLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      await axios.post(`/api/projects/${id}/applications`, {
        ...applyForm,
        proposedBudget: parseInt(applyForm.proposedBudget),
        estimatedDays: parseInt(applyForm.estimatedDays),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setShowApplyForm(false);
      router.push("/my-applications");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "지원에 실패했습니다.";
      setError(msg);
    } finally {
      setApplyLoading(false);
    }
  }

  async function handleAccept(applicationId: string, agreedBudget: number) {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await axios.patch(`/api/applications/${applicationId}/accept`, { agreedBudget }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("수락 완료! 계약서가 생성됐습니다.");
      router.push(`/contracts/${res.data.contractId}`);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "수락에 실패했습니다.";
      alert(msg);
    }
  }

  async function handleReject(applicationId: string) {
    if (!user || !confirm("거절하시겠습니까?")) return;
    try {
      const token = await user.getIdToken();
      await axios.patch(`/api/applications/${applicationId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProject();
    } catch {
      alert("거절에 실패했습니다.");
    }
  }

  async function fetchReviews() {
    try {
      const q = query(collection(db, "reviews"), where("projectId", "==", id));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
      setReviews(list);
      if (user) {
        const mine = list.find((r) => r.reviewerId === user.uid);
        if (mine) { setMyReview(mine); setReviewDone(true); }
      }
    } catch { /* 조용히 무시 */ }
  }

  async function handleReviewSubmit() {
    if (!user || reviewForm.rating === 0) return;
    setReviewLoading(true);
    try {
      const token = await user.getIdToken();
      await axios.post("/api/reviews", { projectId: id, ...reviewForm }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviewDone(true);
      await fetchReviews();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "리뷰 작성에 실패했습니다.";
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setReviewDone(true);
      } else {
        alert(msg);
      }
    } finally {
      setReviewLoading(false);
    }
  }

  function toggleTag(tag: string) {
    setReviewForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }

  async function handleClose() {
    if (!user || !confirm("모집을 마감하시겠습니까?")) return;
    try {
      const token = await user.getIdToken();
      await axios.patch(`/api/projects/${id}/status`, { status: "closed" }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProject();
    } catch {
      alert("마감에 실패했습니다.");
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">불러오는 중...</div>;
  if (!project) return null;

  function tsToDate(value: unknown): Date | null {
    if (!value || typeof value !== "object") return null;
    const t = value as Record<string, unknown>;
    if (typeof t.toDate === "function") return (t.toDate as () => Date)();
    const secs = typeof t.seconds === "number" ? t.seconds
      : typeof t._seconds === "number" ? (t._seconds as number) : null;
    return secs !== null ? new Date(secs * 1000) : null;
  }
  const deadline = tsToDate(project.deadline);
  const isClient = user && profile?.role === "client" && project.clientId === user.uid;
  const isFreelancer = user && profile?.role === "freelancer";
  const canApply = isFreelancer && ["open", "in_review"].includes(project.status);

  const statusColors: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    in_review: "bg-blue-100 text-blue-700",
    matched: "bg-purple-100 text-purple-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    submitted: "bg-orange-100 text-orange-700",
    completed: "bg-gray-100 text-gray-600",
    closed: "bg-red-100 text-red-600",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-3 gap-6">
        {/* 메인 내용 */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status]}`}>
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
              <span className="text-xs text-gray-400">{PROJECT_CATEGORY_LABELS[project.category]}</span>
            </div>
            <h1 className="text-2xl font-bold mb-3">{project.title}</h1>
            <p className="text-gray-600 whitespace-pre-line">{project.description}</p>

            {project.requiredSkills?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">필요 기술</p>
                <div className="flex flex-wrap gap-1">
                  {project.requiredSkills.map((s) => (
                    <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI 분석 결과 */}
          {project.aiAnalysis && (
            <div className="bg-purple-50 rounded-2xl border border-purple-200 p-6">
              <h2 className="font-semibold text-[#7c3aed] mb-3">🤖 AI 단가 분석 결과</h2>
              <p className="text-sm text-gray-700 mb-4">{project.aiAnalysis.report}</p>
              <div className="space-y-2">
                {project.aiAnalysis.features.map((f, i) => (
                  <div key={i} className="flex justify-between items-start bg-white rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-gray-500">{f.description}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#7c3aed] shrink-0 ml-4">
                      {f.estimatedPrice.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 pt-4 border-t border-purple-200">
                <span className="font-semibold">예상 총 단가</span>
                <span className="font-bold text-[#7c3aed]">{project.aiAnalysis.totalEstimate.toLocaleString()}원</span>
              </div>
            </div>
          )}

          {/* 리뷰 섹션 — 완료된 프로젝트 + 참여자만 */}
          {project.status === "completed" && user && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-semibold">프로젝트 리뷰</h2>

              {/* 내 리뷰 작성 */}
              {reviewDone ? (
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-green-700 font-medium text-sm">리뷰를 작성했습니다.</p>
                  {myReview && (
                    <div className="mt-2">
                      <StarRating value={myReview.rating} />
                      <p className="text-sm text-gray-600 mt-1">{myReview.comment}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">내 리뷰 작성</p>
                  <StarRating
                    value={reviewForm.rating}
                    onChange={(v) => setReviewForm((p) => ({ ...p, rating: v }))}
                  />
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                    placeholder="협업 경험을 자유롭게 작성해주세요."
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    {REVIEW_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          reviewForm.tags.includes(tag)
                            ? "bg-[#7c3aed] text-white border-[#7c3aed]"
                            : "border-gray-300 text-gray-600 hover:border-[#7c3aed]"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleReviewSubmit}
                    disabled={reviewLoading || reviewForm.rating === 0 || !reviewForm.comment}
                    className="w-full py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition disabled:opacity-40"
                  >
                    {reviewLoading ? "제출 중..." : "리뷰 등록"}
                  </button>
                </div>
              )}

              {/* 모든 리뷰 표시 */}
              {reviews.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-500">{reviews.length}개의 리뷰</p>
                  {reviews.map((r) => (
                    <div key={r.id} className="bg-gray-50 rounded-xl p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <StarRating value={r.rating} />
                        <span className="text-xs text-gray-400">
                          {r.reviewerRole === "client" ? "의뢰인" : "프리랜서"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{r.comment}</p>
                      {r.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {r.tags.map((tag) => (
                            <span key={tag} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 의뢰인: 지원자 목록 */}
          {isClient && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold mb-4">지원자 목록 ({applications.length}명)</h2>
              {applications.length === 0 ? (
                <p className="text-sm text-gray-400">아직 지원자가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {applications.map((a) => (
                    <div key={a.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          a.status === "accepted" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {a.status === "pending" ? "대기 중" : a.status === "accepted" ? "수락됨" :
                           a.status === "auto_rejected" ? "자동 거절" : "거절됨"}
                        </span>
                        <span className="text-sm font-semibold">{a.proposedBudget.toLocaleString()}원 / {a.estimatedDays}일</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{a.coverLetter}</p>
                      {a.status === "pending" && (
                        <div className="flex gap-2">
                          {acceptForm?.appId === a.id ? (
                            <div className="flex gap-2 flex-1">
                              <input
                                type="number"
                                placeholder="합의 금액"
                                value={acceptForm.budget}
                                onChange={(e) => setAcceptForm({ ...acceptForm, budget: e.target.value })}
                                className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                              />
                              <button
                                onClick={() => handleAccept(a.id, parseInt(acceptForm.budget))}
                                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm"
                              >
                                확인
                              </button>
                              <button
                                onClick={() => setAcceptForm(null)}
                                className="px-3 py-1.5 rounded-lg border text-sm"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => setAcceptForm({ appId: a.id, budget: String(a.proposedBudget) })}
                                className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition"
                              >
                                수락
                              </button>
                              <button
                                onClick={() => handleReject(a.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200 transition"
                              >
                                거절
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">예산</span>
                <span className="font-semibold">
                  {project.budgetMin?.toLocaleString()}~{project.budgetMax?.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">마감일</span>
                <span>{deadline?.toLocaleDateString("ko-KR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">지원자</span>
                <span>{project.applicationCount}명</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              {canApply && !myApplication && (
                <button
                  onClick={() => setShowApplyForm(true)}
                  className="w-full py-3 rounded-xl bg-[#7c3aed] text-white font-medium text-sm hover:bg-purple-700 transition"
                >
                  지원하기
                </button>
              )}
              {myApplication && (
                <div className="text-center py-2">
                  <span className="text-sm text-[#7c3aed] font-medium">✓ 지원 완료</span>
                  <p className="text-xs text-gray-400 mt-1">
                    {myApplication.status === "pending" ? "검토 중" :
                     myApplication.status === "accepted" ? "수락됨" : "거절됨"}
                  </p>
                </div>
              )}
              {isClient && project.status !== "closed" && project.status !== "completed" && (
                <>
                  <Link
                    href={`/projects/${id}/edit`}
                    className="block w-full py-2.5 rounded-xl border border-gray-300 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    수정
                  </Link>
                  <button
                    onClick={handleClose}
                    className="w-full py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition"
                  >
                    모집 마감
                  </button>
                </>
              )}
              {isClient && project.contractId && (
                <Link
                  href={`/contracts/${project.contractId}`}
                  className="block w-full py-2.5 rounded-xl bg-purple-100 text-[#7c3aed] text-center text-sm font-medium hover:bg-purple-200 transition"
                >
                  계약서 보기
                </Link>
              )}
            </div>
          </div>

          {/* 추천 프로젝트는 나중에 추가 */}
        </div>
      </div>

      {/* 지원 폼 모달 */}
      {showApplyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowApplyForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="font-bold text-lg mb-4">지원서 작성</h2>
            <div className="space-y-3">
              <textarea
                value={applyForm.coverLetter}
                onChange={(e) => setApplyForm({ ...applyForm, coverLetter: e.target.value })}
                placeholder="자기소개 및 지원 동기를 작성해주세요."
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] resize-none"
              />
              <input
                type="number"
                value={applyForm.proposedBudget}
                onChange={(e) => setApplyForm({ ...applyForm, proposedBudget: e.target.value })}
                placeholder="제안 금액 (원)"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              />
              <input
                type="number"
                value={applyForm.estimatedDays}
                onChange={(e) => setApplyForm({ ...applyForm, estimatedDays: e.target.value })}
                placeholder="예상 작업 기간 (일)"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
              />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowApplyForm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-700"
              >
                취소
              </button>
              <button
                onClick={handleApply}
                disabled={applyLoading}
                className="flex-1 py-3 rounded-xl bg-[#7c3aed] text-white text-sm font-medium disabled:opacity-50"
              >
                {applyLoading ? "제출 중..." : "지원하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
