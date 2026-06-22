"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { Review } from "@/types";
import { Timestamp } from "firebase/firestore";

interface PublicProfile {
  uid: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  bio: string;
  skills: string[];
  hourlyRate: number | null;
  portfolioUrl: string | null;
  avgRating: number;
  reviewCount: number;
}

export default function ExpertProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!uid) return;
    Promise.all([
      axios.get(`/api/users/${uid}`),
      axios.get(`/api/users/${uid}/reviews`),
    ])
      .then(([profileRes, reviewsRes]) => {
        setProfile(profileRes.data);
        setReviews(reviewsRes.data.reviews ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">불러오는 중...</div>;
  }

  if (notFound || !profile) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-gray-500">프로필을 찾을 수 없습니다.</p>
        <Link href="/experts" className="mt-4 inline-block text-sm text-[#7c3aed] hover:underline">
          ← 전문가 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/experts" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">
        ← 전문가 목록
      </Link>

      {/* 프로필 헤더 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-3xl font-bold text-[#7c3aed] shrink-0">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              profile.name?.charAt(0) ?? "?"
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                프리랜서
              </span>
            </div>

            {(profile.avgRating ?? 0) > 0 ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-400">★</span>
                <span className="font-semibold">{profile.avgRating.toFixed(1)}</span>
                <span className="text-gray-400 text-sm">({profile.reviewCount}개 리뷰)</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-1">아직 리뷰가 없습니다.</p>
            )}

            {profile.hourlyRate && (
              <p className="text-sm font-semibold text-[#7c3aed] mt-1">
                시간당 {profile.hourlyRate.toLocaleString()}원
              </p>
            )}

            {profile.portfolioUrl && (
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-1 inline-block"
              >
                포트폴리오 보기 →
              </a>
            )}
          </div>
        </div>

        {/* 소개 */}
        {profile.bio && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">소개</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {/* 기술 스택 */}
        {profile.skills.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">기술 스택</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <span key={s} className="text-sm bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 의뢰인 CTA */}
      <div className="bg-purple-50 rounded-2xl p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-sm">이 전문가와 함께하고 싶으신가요?</p>
          <p className="text-xs text-gray-500 mt-0.5">프로젝트를 등록하고 지원을 기다리세요.</p>
        </div>
        <Link
          href="/projects/new"
          className="px-4 py-2 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-purple-700 transition shrink-0"
        >
          프로젝트 등록
        </Link>
      </div>

      {/* 리뷰 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">리뷰 ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">아직 리뷰가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const date = (review.createdAt as unknown as Timestamp)?.toDate?.();
  const dateStr = date
    ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
    : "";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < review.rating ? "text-yellow-400" : "text-gray-200"}>★</span>
          ))}
          <span className="font-semibold ml-1">{review.rating}.0</span>
        </div>
        <span className="text-xs text-gray-400">{dateStr}</span>
      </div>
      <p className="text-sm text-gray-600">{review.comment}</p>
      {review.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {review.tags.map((t) => (
            <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
