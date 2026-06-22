import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

const PROJECTS = [
  {
    id: "proj_001",
    title: "쇼핑몰 메인 리뉴얼 랜딩페이지",
    description: "기존 쇼핑몰의 메인 랜딩페이지를 전면 리뉴얼합니다. 모바일 퍼스트 디자인, 빠른 로딩, 전환율 최적화가 핵심입니다. Figma 시안 제공 예정.",
    category: "landing",
    requiredSkills: ["Next.js", "TailwindCSS", "Figma"],
    budgetMin: 1500000, budgetMax: 3000000,
    daysFromNow: 21, status: "open",
  },
  {
    id: "proj_002",
    title: "병원 예약 관리 시스템 개발",
    description: "소규모 의원을 위한 환자 예약, 진료 기록, 문자 알림 기능이 포함된 관리 시스템입니다. 웹 기반으로 PC/태블릿 모두 지원해야 합니다.",
    category: "admin",
    requiredSkills: ["React", "Node.js", "PostgreSQL"],
    budgetMin: 5000000, budgetMax: 10000000,
    daysFromNow: 45, status: "open",
  },
  {
    id: "proj_003",
    title: "인스타그램 → 구글 시트 자동화",
    description: "인스타그램 비즈니스 계정의 DM 문의를 자동으로 구글 시트에 정리하고 담당자에게 슬랙 알림을 보내는 자동화를 구현해주세요.",
    category: "automation",
    requiredSkills: ["n8n", "API 연동", "Google Sheets"],
    budgetMin: 300000, budgetMax: 800000,
    daysFromNow: 10, status: "open",
  },
  {
    id: "proj_004",
    title: "영어 학습 모바일 앱 MVP",
    description: "단어 플래시카드, 발음 연습, 학습 통계 기능을 가진 영어 학습 앱입니다. iOS/Android 동시 출시 목표. 백엔드 API 포함.",
    category: "mvp",
    requiredSkills: ["React Native", "Firebase", "TypeScript"],
    budgetMin: 8000000, budgetMax: 15000000,
    daysFromNow: 60, status: "open",
  },
  {
    id: "proj_005",
    title: "부동산 중개 서비스 웹사이트",
    description: "지역 부동산 중개소를 위한 매물 등록, 검색, 문의 기능이 있는 웹사이트입니다. 관리자 페이지에서 매물을 직접 관리할 수 있어야 합니다.",
    category: "website",
    requiredSkills: ["Next.js", "React", "Figma"],
    budgetMin: 3000000, budgetMax: 6000000,
    daysFromNow: 30, status: "open",
  },
  {
    id: "proj_006",
    title: "고객 응대 AI 챗봇 구축",
    description: "쇼핑몰 고객센터 FAQ를 학습한 챗봇을 웹사이트에 임베드합니다. 자주 묻는 질문 자동 답변, 상담원 연결 기능 포함.",
    category: "chatbot",
    requiredSkills: ["Python", "OpenAI API", "Node.js"],
    budgetMin: 2000000, budgetMax: 4000000,
    daysFromNow: 25, status: "in_review",
  },
  {
    id: "proj_007",
    title: "SaaS 대시보드 UI 디자인",
    description: "B2B SaaS 제품의 분석 대시보드 UI를 Figma로 디자인해주세요. 차트, 테이블, 필터 컴포넌트 포함. 다크모드 지원 필요.",
    category: "design",
    requiredSkills: ["Figma", "UI/UX", "디자인 시스템"],
    budgetMin: 1500000, budgetMax: 2500000,
    daysFromNow: 14, status: "open",
  },
  {
    id: "proj_008",
    title: "뉴스레터 구독자 확보 캠페인",
    description: "스타트업 뉴스레터 구독자를 1,000명에서 5,000명으로 늘리기 위한 콘텐츠 마케팅 전략 수립 및 실행. 3개월 집행 예산 포함.",
    category: "marketing",
    requiredSkills: ["콘텐츠 전략", "SEO", "퍼포먼스 마케팅"],
    budgetMin: 1000000, budgetMax: 3000000,
    daysFromNow: 90, status: "open",
  },
  {
    id: "proj_009",
    title: "재고 관리 ERP 모듈 개발",
    description: "기존 ERP 시스템에 연동되는 재고 추적, 발주 자동화, 입출고 현황 모듈을 개발합니다. REST API 연동 문서 제공.",
    category: "admin",
    requiredSkills: ["Python", "Django", "REST API"],
    budgetMin: 7000000, budgetMax: 12000000,
    daysFromNow: 50, status: "open",
  },
  {
    id: "proj_010",
    title: "피트니스 센터 예약 앱",
    description: "헬스장 수업 예약, 출석 체크, 회원권 관리 기능을 가진 앱입니다. 관리자 웹과 회원 모바일 앱 모두 필요합니다.",
    category: "mvp",
    requiredSkills: ["React Native", "React", "Firebase"],
    budgetMin: 6000000, budgetMax: 10000000,
    daysFromNow: 40, status: "open",
  },
];

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-seed-secret");
  if (process.env.SEED_SECRET && secret !== process.env.SEED_SECRET) {
    return apiError("인증 실패", 401);
  }

  const batch = adminDb.batch();
  const now = Timestamp.now();

  // 의뢰인 계정 (프로젝트 등록용)
  const clientRef = adminDb.collection("users").doc("seed_client_main");
  batch.set(clientRef, {
    email: "client@workbridge.test",
    name: "워크브릿지",
    role: "client",
    companyName: "WorkBridge",
    businessField: "플랫폼",
    profileComplete: true,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  for (const p of PROJECTS) {
    const deadline = Timestamp.fromDate(
      new Date(Date.now() + p.daysFromNow * 24 * 60 * 60 * 1000)
    );
    const ref = adminDb.collection("projects").doc(p.id);
    batch.set(ref, {
      clientId: "seed_client_main",
      title: p.title,
      description: p.description,
      category: p.category,
      requiredSkills: p.requiredSkills,
      budgetMin: p.budgetMin,
      budgetMax: p.budgetMax,
      startDate: now,
      deadline,
      status: p.status,
      acceptedApplicationId: null,
      contractId: null,
      aiAnalysis: null,
      applicationCount: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  await batch.commit();

  return apiOk({
    message: `프로젝트 ${PROJECTS.length}개가 등록됐습니다.`,
    projects: PROJECTS.map((p) => ({ id: p.id, title: p.title, status: p.status })),
  });
}
