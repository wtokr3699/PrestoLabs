import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiOk } from "@/lib/auth-middleware";
import { validateSeedAccess } from "@/lib/seedAccess";
import { Timestamp } from "firebase-admin/firestore";

// 날짜 헬퍼
function daysAgo(n: number) {
  return Timestamp.fromDate(new Date(Date.now() - n * 86400_000));
}
function daysFromNow(n: number) {
  return Timestamp.fromDate(new Date(Date.now() + n * 86400_000));
}

// ─── 의뢰인 ────────────────────────────────────────────────────────────────
const CLIENTS = [
  {
    id: "rich_client_1",
    name: "정현수",
    email: "jung.hyunsu@rich.test",
    companyName: "커머스랩",
    businessField: "전자상거래",
  },
  {
    id: "rich_client_2",
    name: "한지수",
    email: "han.jisu@rich.test",
    companyName: "헬스케어플러스",
    businessField: "의료",
  },
  {
    id: "rich_client_3",
    name: "윤도현",
    email: "yun.dohyun@rich.test",
    companyName: "에듀테크",
    businessField: "교육",
  },
  {
    id: "rich_client_4",
    name: "오소연",
    email: "oh.soyeon@rich.test",
    companyName: "핀테크스타트업",
    businessField: "금융",
  },
];

// ─── 전문가 ────────────────────────────────────────────────────────────────
const EXPERTS = [
  {
    id: "rich_expert_1",
    name: "장민준",
    email: "jang.minjun@rich.test",
    bio: "Spring Boot + React 풀스택 개발자. 금융권 및 공공기관 프로젝트 5년 경력. 안정성 높은 백엔드 아키텍처 설계 전문.",
    skills: ["Java", "Spring Boot", "React", "PostgreSQL", "AWS"],
    hourlyRate: 100000,
    avgRating: 4.9,
    reviewCount: 22,
  },
  {
    id: "rich_expert_2",
    name: "송지은",
    email: "song.jieun@rich.test",
    bio: "브랜드 아이덴티티 디자이너. BI 시스템, 패키지 디자인, 웹 디자인을 담당합니다. 국내외 수상 이력 보유.",
    skills: ["Figma", "Adobe Illustrator", "브랜딩", "UI/UX", "모션 디자인"],
    hourlyRate: 70000,
    avgRating: 4.7,
    reviewCount: 31,
  },
  {
    id: "rich_expert_3",
    name: "최재원",
    email: "choi.jaewon@rich.test",
    bio: "데이터 엔지니어 & 자동화 전문가. Airflow, dbt, 파이썬으로 데이터 파이프라인을 구축합니다. BI 대시보드(Tableau, Looker) 개발 경험 풍부.",
    skills: ["Python", "Airflow", "dbt", "SQL", "Tableau"],
    hourlyRate: 95000,
    avgRating: 4.8,
    reviewCount: 15,
  },
  {
    id: "rich_expert_4",
    name: "임서현",
    email: "lim.seohyun@rich.test",
    bio: "iOS/Android 네이티브 & React Native 앱 개발 전문. 출시 앱 10개 이상, 누적 다운로드 50만 이상의 실전 경험.",
    skills: ["Swift", "Kotlin", "React Native", "Firebase", "앱스토어 최적화"],
    hourlyRate: 110000,
    avgRating: 5.0,
    reviewCount: 18,
  },
  {
    id: "rich_expert_5",
    name: "강유진",
    email: "kang.yujin@rich.test",
    bio: "글로벌 마케팅 전략가. 영미권 콘텐츠 마케팅, SEO, 퍼포먼스 광고를 담당합니다. SaaS 기업 MAU 3배 성장 사례 보유.",
    skills: ["퍼포먼스 마케팅", "SEO", "콘텐츠 전략", "Google Ads", "영어 카피라이팅"],
    hourlyRate: 80000,
    avgRating: 4.6,
    reviewCount: 9,
  },
];

// ─── 완료 프로젝트 + 매칭 중 프로젝트 ──────────────────────────────────────
const RICH_PROJECTS = [
  // 완료된 프로젝트
  {
    id: "rich_proj_c1",
    clientId: "rich_client_1",
    title: "쇼핑몰 상품 상세 페이지 리뉴얼",
    description: "모바일 전환율을 높이기 위한 상품 상세 페이지 리디자인 및 React 구현. 이미지 최적화, 리뷰 UI 개선 포함.",
    category: "website",
    requiredSkills: ["React", "Next.js", "Figma"],
    budgetMin: 2000000, budgetMax: 3500000,
    status: "completed",
    acceptedExpertId: "expert_oh_hyukjin",
    createdDaysAgo: 70, deadlineDaysAgo: 30,
    aiAnalysis: {
      features: [
        { name: "페이지 디자인 (Figma)", estimatedPrice: 600000 },
        { name: "React 컴포넌트 개발", estimatedPrice: 1200000 },
        { name: "이미지 최적화 처리", estimatedPrice: 300000 },
        { name: "모바일 반응형", estimatedPrice: 400000 },
      ],
      totalEstimate: 2500000,
      report: "모바일 퍼스트 리디자인 기준으로 2,500만원이 예상됩니다. React 컴포넌트화로 유지보수 비용을 절감할 수 있습니다.",
    },
  },
  {
    id: "rich_proj_c2",
    clientId: "rich_client_2",
    title: "병원 예약 알림 자동화 구축",
    description: "예약 확정 문자, 당일 리마인더, 노쇼 시 자동 캔슬 처리를 n8n + Twilio로 자동화합니다.",
    category: "automation",
    requiredSkills: ["n8n", "API 연동", "Python"],
    budgetMin: 800000, budgetMax: 1500000,
    status: "completed",
    acceptedExpertId: "rich_expert_3",
    createdDaysAgo: 50, deadlineDaysAgo: 15,
    aiAnalysis: null,
  },
  {
    id: "rich_proj_c3",
    clientId: "rich_client_3",
    title: "온라인 강의 플랫폼 랜딩페이지",
    description: "영어 교육 스타트업의 메인 랜딩페이지. 수강 후기 섹션, 커리큘럼 소개, CTA 최적화 중심으로 디자인 및 개발.",
    category: "landing",
    requiredSkills: ["Next.js", "Figma", "TailwindCSS"],
    budgetMin: 1200000, budgetMax: 2000000,
    status: "completed",
    acceptedExpertId: "expert_kim_boram",
    createdDaysAgo: 60, deadlineDaysAgo: 20,
    aiAnalysis: {
      features: [
        { name: "Figma 디자인 (전체)", estimatedPrice: 700000 },
        { name: "Next.js 구현", estimatedPrice: 900000 },
        { name: "CTA A/B 테스트 설정", estimatedPrice: 200000 },
      ],
      totalEstimate: 1800000,
      report: "랜딩페이지 특성상 디자인 품질이 전환율을 직접 좌우합니다. Figma → 코드 파이프라인을 통해 빠른 반복이 가능합니다.",
    },
  },
  // 진행 중인 프로젝트
  {
    id: "rich_proj_ip1",
    clientId: "rich_client_4",
    title: "핀테크 대출 비교 플랫폼 개발",
    description: "은행별 대출 금리를 실시간 비교하고 신청까지 할 수 있는 웹 플랫폼. 금융 API 연동, 사용자 인증, 관리자 CMS 포함.",
    category: "website",
    requiredSkills: ["React", "Node.js", "PostgreSQL", "AWS"],
    budgetMin: 15000000, budgetMax: 25000000,
    status: "in_progress",
    acceptedExpertId: "rich_expert_1",
    createdDaysAgo: 40, deadlineDaysFromNow: 50,
    aiAnalysis: {
      features: [
        { name: "금융 API 연동 모듈", estimatedPrice: 4000000 },
        { name: "사용자 인증 & 보안", estimatedPrice: 3000000 },
        { name: "대출 비교 UI", estimatedPrice: 5000000 },
        { name: "관리자 CMS", estimatedPrice: 4000000 },
        { name: "AWS 인프라 구성", estimatedPrice: 2000000 },
      ],
      totalEstimate: 18000000,
      report: "금융 규제 준수와 보안이 핵심입니다. API 연동 복잡도와 보안 요구사항을 고려하면 1.8억원 수준이 적정합니다.",
    },
  },
  {
    id: "rich_proj_ip2",
    clientId: "rich_client_3",
    title: "영어 단어 학습 iOS 앱 개발",
    description: "스페이스드 반복 알고리즘 기반 영어 단어 학습 앱. 발음 녹음 비교, 오답 노트, 학습 통계 기능 포함. App Store 출시 목표.",
    category: "mvp",
    requiredSkills: ["Swift", "Firebase", "앱스토어 최적화"],
    budgetMin: 8000000, budgetMax: 12000000,
    status: "in_progress",
    acceptedExpertId: "rich_expert_4",
    createdDaysAgo: 30, deadlineDaysFromNow: 40,
    aiAnalysis: null,
  },
  // 매칭된 프로젝트
  {
    id: "rich_proj_m1",
    clientId: "rich_client_1",
    title: "데이터 분석 대시보드 구축",
    description: "주문, 고객, 매출 데이터를 실시간으로 시각화하는 내부 대시보드. Looker Studio 연동 또는 자체 개발 모두 검토 중.",
    category: "admin",
    requiredSkills: ["Python", "SQL", "Tableau", "dbt"],
    budgetMin: 5000000, budgetMax: 9000000,
    status: "matched",
    acceptedExpertId: "rich_expert_3",
    createdDaysAgo: 25, deadlineDaysFromNow: 35,
    aiAnalysis: {
      features: [
        { name: "데이터 파이프라인 설계", estimatedPrice: 2000000 },
        { name: "대시보드 UI 개발", estimatedPrice: 3000000 },
        { name: "자동화 리포트 설정", estimatedPrice: 1500000 },
      ],
      totalEstimate: 6500000,
      report: "데이터 인프라 현황에 따라 범위가 달라질 수 있습니다. 기존 DB 스키마 파악 후 최적 접근법을 결정 권장합니다.",
    },
  },
  // 지원자 검토 중인 프로젝트
  {
    id: "rich_proj_r1",
    clientId: "rich_client_2",
    title: "의료 기관용 환자 포털 웹앱",
    description: "예약 조회, 검사 결과 확인, 의료진 메시지 기능을 갖춘 환자 셀프 서비스 웹앱. HIPAA 준수 요구.",
    category: "website",
    requiredSkills: ["React", "Node.js", "PostgreSQL"],
    budgetMin: 10000000, budgetMax: 18000000,
    status: "in_review",
    createdDaysAgo: 15, deadlineDaysFromNow: 25,
    aiAnalysis: null,
  },
  {
    id: "rich_proj_r2",
    clientId: "rich_client_4",
    title: "투자 포트폴리오 트래커 앱",
    description: "국내외 주식, ETF, 코인 포트폴리오를 통합 관리하는 모바일 앱. 실시간 시세 연동, 수익률 계산, 알림 기능.",
    category: "mvp",
    requiredSkills: ["React Native", "Firebase", "API 연동"],
    budgetMin: 6000000, budgetMax: 10000000,
    status: "in_review",
    createdDaysAgo: 10, deadlineDaysFromNow: 20,
    aiAnalysis: null,
  },
  // 모집 중 프로젝트
  {
    id: "rich_proj_o1",
    clientId: "rich_client_1",
    title: "글로벌 쇼핑몰 SEO 최적화 캠페인",
    description: "미국 시장을 타겟으로 한 영어 SEO 콘텐츠 전략 수립 및 6개월 운영. 월간 리포트 포함.",
    category: "marketing",
    requiredSkills: ["SEO", "영어 카피라이팅", "콘텐츠 전략"],
    budgetMin: 2000000, budgetMax: 4000000,
    status: "open",
    createdDaysAgo: 5, deadlineDaysFromNow: 45,
    aiAnalysis: null,
  },
  {
    id: "rich_proj_o2",
    clientId: "rich_client_2",
    title: "원격 의료 상담 챗봇 개발",
    description: "증상 체크리스트를 통해 적합한 진료과를 추천하는 AI 챗봇. 카카오채널 또는 자체 웹 임베드 형식으로 개발.",
    category: "chatbot",
    requiredSkills: ["Python", "OpenAI API", "Node.js"],
    budgetMin: 3000000, budgetMax: 5000000,
    status: "open",
    createdDaysAgo: 3, deadlineDaysFromNow: 30,
    aiAnalysis: null,
  },
  {
    id: "rich_proj_o3",
    clientId: "rich_client_3",
    title: "B2B SaaS 기업 브랜드 리뉴얼",
    description: "5년 된 교육 SaaS 브랜드의 전면 리뉴얼. 로고, 컬러 팔레트, 타이포그래피, 웹사이트 가이드라인 포함.",
    category: "design",
    requiredSkills: ["Figma", "브랜딩", "Adobe Illustrator"],
    budgetMin: 4000000, budgetMax: 7000000,
    status: "open",
    createdDaysAgo: 7, deadlineDaysFromNow: 60,
    aiAnalysis: null,
  },
];

// ─── 지원서 ────────────────────────────────────────────────────────────────
// 지원서는 상태에 따라 다르게 구성
const APPLICATIONS_RICH = [
  // rich_proj_c1 (completed) — 오혁진 수락됨
  {
    id: "rich_app_c1_1",
    projectId: "rich_proj_c1",
    freelancerId: "expert_oh_hyukjin",
    coverLetter: "Next.js 랜딩페이지 전문 개발자로 3년간 20개 이상 납품했습니다. 모바일 퍼스트 접근으로 전환율 최적화에 자신 있습니다.",
    proposedBudget: 2500000,
    estimatedDays: 14,
    status: "accepted",
  },
  {
    id: "rich_app_c1_2",
    projectId: "rich_proj_c1",
    freelancerId: "expert_kim_yoha",
    coverLetter: "Vue/Nuxt 전문이지만 React도 능숙합니다. 쇼핑몰 상세페이지 리뉴얼 경험 있습니다.",
    proposedBudget: 2200000,
    estimatedDays: 18,
    status: "auto_rejected",
  },
  // rich_proj_c2 (completed) — 최재원 수락됨
  {
    id: "rich_app_c2_1",
    projectId: "rich_proj_c2",
    freelancerId: "rich_expert_3",
    coverLetter: "n8n + Twilio 자동화를 다수 구현했습니다. 예약 시스템 특성상 엣지케이스 처리가 중요한데, 경험이 많습니다.",
    proposedBudget: 1200000,
    estimatedDays: 7,
    status: "accepted",
  },
  {
    id: "rich_app_c2_2",
    projectId: "rich_proj_c2",
    freelancerId: "expert_lee_isaac",
    coverLetter: "Python과 API 연동으로 자동화 파이프라인 구축 경험이 있습니다. n8n보다 직접 코드가 더 유지보수에 유리합니다.",
    proposedBudget: 1400000,
    estimatedDays: 10,
    status: "auto_rejected",
  },
  // rich_proj_c3 (completed) — 김보람 수락됨
  {
    id: "rich_app_c3_1",
    projectId: "rich_proj_c3",
    freelancerId: "expert_kim_boram",
    coverLetter: "교육 플랫폼 랜딩페이지 3개 납품 이력 있습니다. Figma → Next.js 파이프라인으로 빠르게 진행합니다.",
    proposedBudget: 1700000,
    estimatedDays: 12,
    status: "accepted",
  },
  {
    id: "rich_app_c3_2",
    projectId: "rich_proj_c3",
    freelancerId: "expert_kim_yoha",
    coverLetter: "랜딩페이지 SEO 최적화와 CTA 최적화 경험을 합쳐서 전환율 높은 페이지를 만들어드릴 수 있습니다.",
    proposedBudget: 1500000,
    estimatedDays: 10,
    status: "auto_rejected",
  },
  // rich_proj_ip1 (in_progress) — 장민준 수락됨
  {
    id: "rich_app_ip1_1",
    projectId: "rich_proj_ip1",
    freelancerId: "rich_expert_1",
    coverLetter: "금융 API 연동 프로젝트를 다수 진행했습니다. 보안 아키텍처 설계부터 AWS 배포까지 전담합니다.",
    proposedBudget: 18000000,
    estimatedDays: 60,
    status: "accepted",
  },
  {
    id: "rich_app_ip1_2",
    projectId: "rich_proj_ip1",
    freelancerId: "expert_oh_hyukjin",
    coverLetter: "Node.js + React 기반 금융 서비스 개발 경험 있습니다. 팀 협업도 가능합니다.",
    proposedBudget: 16000000,
    estimatedDays: 55,
    status: "auto_rejected",
  },
  // rich_proj_ip2 (in_progress) — 임서현 수락됨
  {
    id: "rich_app_ip2_1",
    projectId: "rich_proj_ip2",
    freelancerId: "rich_expert_4",
    coverLetter: "Swift 네이티브 앱 10개 이상 출시 경험. 스페이스드 반복 알고리즘은 SuperMemo 방식으로 구현해본 경험 있습니다.",
    proposedBudget: 10000000,
    estimatedDays: 45,
    status: "accepted",
  },
  {
    id: "rich_app_ip2_2",
    projectId: "rich_proj_ip2",
    freelancerId: "expert_kim_taemin",
    coverLetter: "React Native로 학습 앱을 빠르게 개발할 수 있습니다. 크로스플랫폼 장점을 살려 iOS/Android 동시 출시 가능합니다.",
    proposedBudget: 8500000,
    estimatedDays: 40,
    status: "auto_rejected",
  },
  // rich_proj_m1 (matched) — 최재원 수락됨
  {
    id: "rich_app_m1_1",
    projectId: "rich_proj_m1",
    freelancerId: "rich_expert_3",
    coverLetter: "Airflow + dbt로 데이터 파이프라인 구축 후 Looker Studio 연동까지 한 번에 담당합니다.",
    proposedBudget: 6500000,
    estimatedDays: 30,
    status: "accepted",
  },
  {
    id: "rich_app_m1_2",
    projectId: "rich_proj_m1",
    freelancerId: "expert_lee_isaac",
    coverLetter: "Python + PostgreSQL 기반 데이터 파이프라인 경험 다수. Tableau 대시보드 구축도 가능합니다.",
    proposedBudget: 7000000,
    estimatedDays: 35,
    status: "auto_rejected",
  },
  // rich_proj_r1 (in_review) — pending 지원자들
  {
    id: "rich_app_r1_1",
    projectId: "rich_proj_r1",
    freelancerId: "rich_expert_1",
    coverLetter: "의료 정보시스템 개발 경험이 있습니다. 보안 규정 준수(개인정보보호법, HIPAA 참고 사례)를 철저히 이행합니다.",
    proposedBudget: 15000000,
    estimatedDays: 90,
    status: "pending",
  },
  {
    id: "rich_app_r1_2",
    projectId: "rich_proj_r1",
    freelancerId: "expert_oh_hyukjin",
    coverLetter: "React + Node.js 기반 의료 관련 SaaS를 개발한 경험이 있습니다. 환자 UX에 대한 이해가 높습니다.",
    proposedBudget: 13000000,
    estimatedDays: 80,
    status: "pending",
  },
  {
    id: "rich_app_r1_3",
    projectId: "rich_proj_r1",
    freelancerId: "expert_lee_isaac",
    coverLetter: "Django + PostgreSQL로 의료 데이터 관리 시스템을 구축한 레퍼런스가 있습니다.",
    proposedBudget: 14000000,
    estimatedDays: 85,
    status: "pending",
  },
  // rich_proj_r2 (in_review) — pending 지원자들
  {
    id: "rich_app_r2_1",
    projectId: "rich_proj_r2",
    freelancerId: "rich_expert_4",
    coverLetter: "금융 데이터 연동 경험 있는 React Native 앱 개발자입니다. 실시간 시세 WebSocket 연동 구현 가능합니다.",
    proposedBudget: 8500000,
    estimatedDays: 50,
    status: "pending",
  },
  {
    id: "rich_app_r2_2",
    projectId: "rich_proj_r2",
    freelancerId: "expert_kim_taemin",
    coverLetter: "투자 관련 앱을 React Native로 개발한 경험이 있습니다. 포트폴리오 계산 로직과 차트 UI 모두 구현 가능합니다.",
    proposedBudget: 7500000,
    estimatedDays: 45,
    status: "pending",
  },
];

// ─── 리뷰 ────────────────────────────────────────────────────────────────
const REVIEWS = [
  // rich_proj_c1 완료 — 의뢰인이 오혁진에게
  {
    id: "rich_review_1",
    projectId: "rich_proj_c1",
    reviewerId: "rich_client_1",
    revieweeId: "expert_oh_hyukjin",
    reviewerRole: "client",
    rating: 5,
    comment: "React 전환 후 모바일 전환율이 눈에 띄게 개선됐습니다. 마감도 정확히 지켜주셨고, 중간 피드백도 빠르게 반영해주셨어요.",
    tags: ["빠른 납기", "소통 원활", "기술력 우수"],
  },
  // rich_proj_c2 완료 — 의뢰인이 최재원에게
  {
    id: "rich_review_2",
    projectId: "rich_proj_c2",
    reviewerId: "rich_client_2",
    revieweeId: "rich_expert_3",
    reviewerRole: "client",
    rating: 5,
    comment: "n8n 자동화 구현이 기대 이상이었습니다. 예약 노쇼 처리 로직이 완벽하게 작동하고, 이후 수정도 쉽게 할 수 있도록 문서화해주셨어요.",
    tags: ["문서화 꼼꼼", "일정 준수", "결과물 만족"],
  },
  // rich_proj_c3 완료 — 의뢰인이 김보람에게
  {
    id: "rich_review_3",
    projectId: "rich_proj_c3",
    reviewerId: "rich_client_3",
    revieweeId: "expert_kim_boram",
    reviewerRole: "client",
    rating: 5,
    comment: "디자인 감각이 탁월하고 요구사항을 정확히 파악해서 구현해주셨습니다. Figma → 코드 전환도 완벽했고, 반응형도 깔끔했습니다.",
    tags: ["디자인 탁월", "정확한 구현", "소통 원활"],
  },
  // 기존 시드 프로젝트 완료 케이스 — seed_project_3
  {
    id: "rich_review_4",
    projectId: "seed_project_3",
    reviewerId: "seed_client_1",
    revieweeId: "seed_freelancer_1",
    reviewerRole: "client",
    rating: 5,
    comment: "랜딩페이지를 기간 내에 깔끔하게 납품해주셨습니다. 수정 요청도 빠르게 처리해주셔서 만족스럽게 마무리됐습니다.",
    tags: ["빠른 수정", "납기 준수", "결과물 만족"],
  },
  // proj_006 완료 케이스
  {
    id: "rich_review_5",
    projectId: "proj_006",
    reviewerId: "seed_client_main",
    revieweeId: "expert_park_yubin",
    reviewerRole: "client",
    rating: 4,
    comment: "챗봇 FAQ 설정과 UI 연동을 잘 마무리해주셨습니다. 응답 속도 개선은 추가 협의가 필요했지만 전반적으로 만족합니다.",
    tags: ["성실한 작업", "결과물 만족"],
  },
];

export async function POST(req: NextRequest) {
  const denied = validateSeedAccess(req);
  if (denied) return denied;

  const now = Timestamp.now();

  // ── Batch 1: 의뢰인 + 전문가 ──
  const batch1 = adminDb.batch();

  for (const c of CLIENTS) {
    batch1.set(adminDb.collection("users").doc(c.id), {
      email: c.email,
      name: c.name,
      role: "client",
      bio: null,
      companyName: c.companyName,
      businessField: c.businessField,
      profileComplete: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  for (const e of EXPERTS) {
    batch1.set(adminDb.collection("users").doc(e.id), {
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

  await batch1.commit();

  // ── Batch 2: 프로젝트 ──
  const batch2 = adminDb.batch();

  for (const p of RICH_PROJECTS) {
    const deadline =
      "deadlineDaysAgo" in p
        ? daysAgo(p.deadlineDaysAgo as number)
        : daysFromNow((p as { deadlineDaysFromNow?: number }).deadlineDaysFromNow ?? 30);

    const createdAt = daysAgo(p.createdDaysAgo);

    // accepted 지원서가 있으면 applicationCount 계산
    const appCount = APPLICATIONS_RICH.filter((a) => a.projectId === p.id).length;

    batch2.set(adminDb.collection("projects").doc(p.id), {
      clientId: p.clientId,
      title: p.title,
      description: p.description,
      category: p.category,
      requiredSkills: p.requiredSkills,
      budgetMin: p.budgetMin,
      budgetMax: p.budgetMax,
      startDate: createdAt,
      deadline,
      status: p.status,
      acceptedApplicationId:
        p.status === "completed" || p.status === "in_progress" || p.status === "matched"
          ? `${p.id.replace("rich_proj_", "rich_app_").split("_").slice(0, 3).join("_")}_1`
          : null,
      contractId: null,
      aiAnalysis: p.aiAnalysis ?? null,
      applicationCount: appCount,
      createdAt,
      updatedAt: now,
      deletedAt: null,
    });
  }

  await batch2.commit();

  // ── Batch 3: 지원서 ──
  const batch3 = adminDb.batch();

  for (const a of APPLICATIONS_RICH) {
    batch3.set(adminDb.collection("applications").doc(a.id), {
      projectId: a.projectId,
      freelancerId: a.freelancerId,
      coverLetter: a.coverLetter,
      proposedBudget: a.proposedBudget,
      estimatedDays: a.estimatedDays,
      status: a.status,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  // proj_006을 completed로 업데이트 (기존 seed 프로젝트)
  batch3.update(adminDb.collection("projects").doc("proj_006"), {
    status: "completed",
    acceptedApplicationId: "rich_app_proj006_1",
    applicationCount: 1,
    updatedAt: now,
  });

  // proj_006 지원서 (park_yubin → completed)
  batch3.set(adminDb.collection("applications").doc("rich_app_proj006_1"), {
    projectId: "proj_006",
    freelancerId: "expert_park_yubin",
    coverLetter: "OpenAI API + Python으로 FAQ 챗봇을 구현한 경험이 있습니다. 카카오채널 연동도 가능합니다.",
    proposedBudget: 3000000,
    estimatedDays: 21,
    status: "accepted",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await batch3.commit();

  // ── Batch 4: 리뷰 + avgRating 업데이트 ──
  const batch4 = adminDb.batch();

  for (const r of REVIEWS) {
    batch4.set(adminDb.collection("reviews").doc(r.id), {
      projectId: r.projectId,
      reviewerId: r.reviewerId,
      revieweeId: r.revieweeId,
      reviewerRole: r.reviewerRole,
      rating: r.rating,
      comment: r.comment,
      tags: r.tags,
      createdAt: now,
    });
  }

  // seed_project_3을 completed로 업데이트
  batch4.update(adminDb.collection("projects").doc("seed_project_3"), {
    status: "completed",
    acceptedApplicationId: "seed_app_1",
    updatedAt: now,
  });

  // 기존 seed_app_1 수락 상태로 업데이트
  batch4.update(adminDb.collection("applications").doc("seed_app_1"), {
    status: "accepted",
    updatedAt: now,
  });
  batch4.update(adminDb.collection("applications").doc("seed_app_2"), {
    status: "auto_rejected",
    updatedAt: now,
  });

  await batch4.commit();

  return apiOk({
    message: "풍부한 목업 데이터가 생성됐습니다.",
    created: {
      clients: CLIENTS.map((c) => c.name),
      experts: EXPERTS.map((e) => e.name),
      projects: RICH_PROJECTS.map((p) => `${p.id} (${p.status})`),
      applications: APPLICATIONS_RICH.length + 1,
      reviews: REVIEWS.length,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const denied = validateSeedAccess(req);
  if (denied) return denied;

  const allIds = {
    users: [...CLIENTS.map((c) => c.id), ...EXPERTS.map((e) => e.id)],
    projects: RICH_PROJECTS.map((p) => p.id),
    applications: [...APPLICATIONS_RICH.map((a) => a.id), "rich_app_proj006_1"],
    reviews: REVIEWS.map((r) => r.id),
  };

  const batch = adminDb.batch();
  for (const id of allIds.users) batch.delete(adminDb.collection("users").doc(id));
  for (const id of allIds.projects) batch.delete(adminDb.collection("projects").doc(id));
  for (const id of allIds.applications) batch.delete(adminDb.collection("applications").doc(id));
  for (const id of allIds.reviews) batch.delete(adminDb.collection("reviews").doc(id));
  await batch.commit();

  return apiOk({ deleted: allIds });
}
