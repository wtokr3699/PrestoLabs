import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

// 테스트 계정 삭제
export async function DELETE(req: NextRequest) {
  const secret = req.headers.get("x-seed-secret");
  if (process.env.SEED_SECRET && secret !== process.env.SEED_SECRET) {
    return apiError("인증 실패", 401);
  }

  const deleteIds = [
    "seed_freelancer_1",
    "seed_freelancer_2",
    "seed_freelancer_3",
    "seed_client_1",
  ];

  const batch = adminDb.batch();
  for (const id of deleteIds) {
    batch.delete(adminDb.collection("users").doc(id));
  }
  await batch.commit();

  return apiOk({ deleted: deleteIds });
}

// 개발용 시드 데이터 — SEED_SECRET 헤더 필요
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !process.env.SEED_SECRET) {
    return apiError("시드 데이터는 개발 환경에서만 사용 가능합니다.", 403);
  }
  const secret = req.headers.get("x-seed-secret");
  if (process.env.SEED_SECRET && secret !== process.env.SEED_SECRET) {
    return apiError("인증 실패", 401);
  }

  const batch = adminDb.batch();
  const now = Timestamp.now();
  const futureDeadline = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  // 프리랜서 1
  const f1Ref = adminDb.collection("users").doc("seed_freelancer_1");
  batch.set(f1Ref, {
    email: "freelancer1@seed.test",
    name: "김개발",
    role: "freelancer",
    bio: "Next.js, React, Firebase 전문 풀스택 개발자입니다. MVP 빠르게 만들어드립니다.",
    skills: ["Next.js", "React", "Firebase", "TypeScript"],
    hourlyRate: 80000,
    portfolioUrl: "https://github.com/seed-dev",
    avgRating: 4.8,
    reviewCount: 12,
    profileComplete: true,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  // 프리랜서 2
  const f2Ref = adminDb.collection("users").doc("seed_freelancer_2");
  batch.set(f2Ref, {
    email: "freelancer2@seed.test",
    name: "이디자인",
    role: "freelancer",
    bio: "UI/UX 디자인 및 Figma 전문가. 사용자 중심 디자인으로 전환율을 높입니다.",
    skills: ["Figma", "UI/UX", "Framer", "디자인 시스템"],
    hourlyRate: 60000,
    portfolioUrl: null,
    avgRating: 4.5,
    reviewCount: 7,
    profileComplete: true,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  // 프리랜서 3
  const f3Ref = adminDb.collection("users").doc("seed_freelancer_3");
  batch.set(f3Ref, {
    email: "freelancer3@seed.test",
    name: "박자동화",
    role: "freelancer",
    bio: "Python, n8n, Make(Integromat)으로 업무 자동화를 구현합니다.",
    skills: ["Python", "n8n", "Make", "API 연동"],
    hourlyRate: 70000,
    portfolioUrl: null,
    avgRating: 4.2,
    reviewCount: 5,
    profileComplete: true,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  // 의뢰인 1
  const c1Ref = adminDb.collection("users").doc("seed_client_1");
  batch.set(c1Ref, {
    email: "client1@seed.test",
    name: "최스타트업",
    role: "client",
    companyName: "테크스타트업",
    businessField: "SaaS",
    profileComplete: true,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  // 프로젝트 1 - 오픈
  const p1Ref = adminDb.collection("projects").doc("seed_project_1");
  batch.set(p1Ref, {
    clientId: "seed_client_1",
    title: "SaaS 대시보드 MVP 개발",
    description:
      "스타트업 SaaS 제품의 관리자 대시보드를 Next.js + Tailwind로 빠르게 개발해주세요. 사용자 관리, 구독 현황, 매출 차트 등 기본 기능이 필요합니다.",
    category: "mvp",
    requiredSkills: ["Next.js", "React", "TypeScript"],
    budgetMin: 2000000,
    budgetMax: 4000000,
    startDate: now,
    deadline: futureDeadline,
    status: "open",
    acceptedApplicationId: null,
    contractId: null,
    aiAnalysis: null,
    applicationCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  // 프로젝트 2 - 오픈
  const p2Ref = adminDb.collection("projects").doc("seed_project_2");
  batch.set(p2Ref, {
    clientId: "seed_client_1",
    title: "업무 자동화 - CRM 연동",
    description:
      "HubSpot CRM과 슬랙, 구글 시트를 n8n으로 연동해주세요. 리드 생성 시 슬랙 알림, 거래 완료 시 시트 자동 기록이 필요합니다.",
    category: "automation",
    requiredSkills: ["n8n", "API 연동", "Python"],
    budgetMin: 500000,
    budgetMax: 1500000,
    startDate: now,
    deadline: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
    status: "open",
    acceptedApplicationId: null,
    contractId: null,
    aiAnalysis: null,
    applicationCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  // 프로젝트 3 - 랜딩페이지 (지원자 있음)
  const p3Ref = adminDb.collection("projects").doc("seed_project_3");
  batch.set(p3Ref, {
    clientId: "seed_client_1",
    title: "제품 랜딩페이지 디자인 + 개발",
    description:
      "B2B SaaS 제품 랜딩페이지를 Figma 디자인부터 Next.js 구현까지 해주세요. 영문/한국어 모두 지원 필요.",
    category: "landing",
    requiredSkills: ["Figma", "Next.js", "디자인 시스템"],
    budgetMin: 1000000,
    budgetMax: 2500000,
    startDate: now,
    deadline: Timestamp.fromDate(new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)),
    status: "in_review",
    acceptedApplicationId: null,
    contractId: null,
    aiAnalysis: {
      features: [
        { name: "Figma 디자인", price: 800000 },
        { name: "Next.js 개발", price: 1200000 },
        { name: "반응형 처리", price: 200000 },
      ],
      totalEstimate: 2200000,
      report: "랜딩페이지 디자인 및 개발 예상 단가입니다.",
    },
    applicationCount: 2,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  // 지원서들
  const app1Ref = adminDb.collection("applications").doc("seed_app_1");
  batch.set(app1Ref, {
    projectId: "seed_project_3",
    freelancerId: "seed_freelancer_1",
    coverLetter: "Next.js 전문가로 랜딩페이지를 빠르게 구현해드릴 수 있습니다. 포트폴리오를 참고해주세요.",
    proposedBudget: 2000000,
    estimatedDays: 14,
    status: "pending",
    createdAt: now,
    deletedAt: null,
  });

  const app2Ref = adminDb.collection("applications").doc("seed_app_2");
  batch.set(app2Ref, {
    projectId: "seed_project_3",
    freelancerId: "seed_freelancer_2",
    coverLetter: "UI/UX 디자인과 개발을 원스톱으로 해드립니다. Figma → 코드 파이프라인이 빠릅니다.",
    proposedBudget: 2200000,
    estimatedDays: 18,
    status: "pending",
    createdAt: now,
    deletedAt: null,
  });

  await batch.commit();

  return apiOk({
    message: "시드 데이터가 생성됐습니다.",
    created: {
      users: ["seed_freelancer_1", "seed_freelancer_2", "seed_freelancer_3", "seed_client_1"],
      projects: ["seed_project_1", "seed_project_2", "seed_project_3"],
      applications: ["seed_app_1", "seed_app_2"],
    },
  });
}
