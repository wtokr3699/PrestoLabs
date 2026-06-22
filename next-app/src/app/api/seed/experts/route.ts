import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

const EXPERTS = [
  {
    id: "expert_oh_hyukjin",
    name: "오혁진",
    email: "oh.hyukjin@workbridge.test",
    bio: "React, Next.js, Node.js 기반 풀스택 개발자입니다. 스타트업 MVP부터 엔터프라이즈 시스템까지 다양한 프로젝트 경험을 보유하고 있습니다.",
    skills: ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL"],
    hourlyRate: 90000,
    avgRating: 4.9,
    reviewCount: 23,
  },
  {
    id: "expert_kim_taemin",
    name: "김태민",
    email: "kim.taemin@workbridge.test",
    bio: "React Native, Flutter로 iOS/Android 앱을 동시에 개발합니다. 앱스토어 출시 경험 다수, 푸시 알림 및 인앱 결제 구현 전문.",
    skills: ["React Native", "Flutter", "Firebase", "iOS", "Android"],
    hourlyRate: 85000,
    avgRating: 4.7,
    reviewCount: 18,
  },
  {
    id: "expert_kim_boram",
    name: "김보람",
    email: "kim.boram@workbridge.test",
    bio: "Figma 전문 UI/UX 디자이너. 사용자 리서치부터 프로토타입까지 전 과정을 담당합니다. 디자인 시스템 구축 경험 보유.",
    skills: ["Figma", "UI/UX", "디자인 시스템", "프로토타이핑", "Adobe XD"],
    hourlyRate: 65000,
    avgRating: 4.8,
    reviewCount: 31,
  },
  {
    id: "expert_kim_yoha",
    name: "김유하",
    email: "kim.yoha@workbridge.test",
    bio: "Vue.js, Nuxt.js 전문 프론트엔드 개발자. SEO 최적화 랜딩페이지, 반응형 웹사이트 제작을 빠르고 정확하게 납품합니다.",
    skills: ["Vue.js", "Nuxt.js", "TailwindCSS", "JavaScript", "SEO"],
    hourlyRate: 75000,
    avgRating: 4.6,
    reviewCount: 14,
  },
  {
    id: "expert_lee_isaac",
    name: "이이삭",
    email: "lee.isaac@workbridge.test",
    bio: "Python, Django, FastAPI 백엔드 개발자. AWS 인프라 설계 및 운영, CI/CD 파이프라인 구축 전문. API 설계부터 배포까지 원스톱.",
    skills: ["Python", "Django", "FastAPI", "AWS", "Docker"],
    hourlyRate: 95000,
    avgRating: 4.9,
    reviewCount: 27,
  },
  {
    id: "expert_park_yubin",
    name: "박유빈",
    email: "park.yubin@workbridge.test",
    bio: "퍼포먼스 마케팅 & 콘텐츠 전략 전문가. 구글/메타 광고 집행 및 SEO 최적화로 실질적인 유입과 전환을 만들어 드립니다.",
    skills: ["퍼포먼스 마케팅", "SEO", "구글 애즈", "콘텐츠 전략", "Meta 광고"],
    hourlyRate: 70000,
    avgRating: 4.5,
    reviewCount: 9,
  },
];

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-seed-secret");
  if (process.env.SEED_SECRET && secret !== process.env.SEED_SECRET) {
    return apiError("인증 실패", 401);
  }

  const batch = adminDb.batch();
  const now = Timestamp.now();

  for (const e of EXPERTS) {
    const ref = adminDb.collection("users").doc(e.id);
    batch.set(ref, {
      email: e.email,
      name: e.name,
      role: "freelancer",
      bio: e.bio,
      skills: e.skills,
      hourlyRate: e.hourlyRate,
      portfolioUrl: null,
      avgRating: e.avgRating,
      reviewCount: e.reviewCount,
      profileComplete: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  await batch.commit();

  return apiOk({
    message: "전문가 6명이 등록됐습니다.",
    experts: EXPERTS.map((e) => ({ id: e.id, name: e.name })),
  });
}
