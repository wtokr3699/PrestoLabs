import { Timestamp } from "firebase/firestore";

export type UserRole = "client" | "freelancer" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  profileComplete: boolean;
  // 프리랜서 전용
  skills?: string[];
  hourlyRate?: number;
  portfolioUrl?: string;
  avgRating?: number;
  reviewCount?: number;
  // 의뢰인 전용
  companyName?: string;
  businessField?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  deletedAt?: Timestamp | null;
}

export type ProjectStatus =
  | "open"
  | "in_review"
  | "matched"
  | "in_progress"
  | "submitted"
  | "completed"
  | "closed";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  open: "모집 중",
  in_review: "검토 중",
  matched: "매칭 완료",
  in_progress: "진행 중",
  submitted: "검수 대기",
  completed: "완료",
  closed: "마감",
};

export type ProjectCategory =
  | "landing"
  | "website"
  | "automation"
  | "mvp"
  | "admin"
  | "chatbot"
  | "design"
  | "marketing"
  | "other";

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  landing: "랜딩페이지",
  website: "웹사이트",
  automation: "업무 자동화",
  mvp: "MVP 개발",
  admin: "관리자 페이지",
  chatbot: "챗봇",
  design: "디자인",
  marketing: "마케팅",
  other: "기타",
};

export interface AiAnalysis {
  features: { name: string; description: string; estimatedPrice: number }[];
  totalEstimate: number;
  report: string;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: ProjectCategory;
  requiredSkills: string[];
  budgetMin: number;
  budgetMax: number;
  startDate?: Timestamp;
  deadline: Timestamp;
  status: ProjectStatus;
  acceptedApplicationId?: string;
  contractId?: string;
  aiAnalysis?: AiAnalysis;
  applicationCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "auto_rejected";

export interface Application {
  id: string;
  projectId: string;
  freelancerId: string;
  coverLetter: string;
  proposedBudget: number;
  estimatedDays: number;
  status: ApplicationStatus;
  createdAt: Timestamp;
  deletedAt?: Timestamp | null;
}

export type ContractStatus = "draft" | "active" | "completed";

export interface Contract {
  id: string;
  projectId: string;
  clientId: string;
  freelancerId: string;
  applicationId: string;
  terms: string;
  agreedBudget: number;
  startDate: Timestamp;
  endDate: Timestamp;
  clientSigned: boolean;
  freelancerSigned: boolean;
  clientSignedAt?: Timestamp;
  freelancerSignedAt?: Timestamp;
  status: ContractStatus;
  createdAt: Timestamp;
}

export type PaymentStatus = "pending" | "escrowed" | "released" | "failed" | "refunded";

export interface Payment {
  id: string;
  contractId: string;
  clientId: string;
  freelancerId: string;
  amount: number;
  fee: number;
  netAmount: number;
  pgOrderId: string;
  pgPaymentKey?: string;
  status: PaymentStatus;
  escrowedAt?: Timestamp;
  releasedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface Review {
  id: string;
  projectId: string;
  reviewerId: string;
  revieweeId: string;
  reviewerRole: "client" | "freelancer";
  rating: number;
  comment: string;
  tags: string[];
  createdAt: Timestamp;
}

export type NotificationType =
  | "application_received"
  | "application_accepted"
  | "application_auto_rejected"
  | "application_rejected"
  | "recruitment_closed";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  projectId: string;
  applicationId?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface Bookmark {
  id: string;
  userId: string;
  projectId: string;
  createdAt: Timestamp;
  deletedAt?: Timestamp | null;
}

export const NOTIFICATION_MESSAGES: Record<NotificationType, string> = {
  application_received: "님이 프로젝트에 지원했습니다.",
  application_accepted: "프로젝트 지원이 수락됐습니다.",
  application_auto_rejected: "해당 프로젝트에 다른 지원자가 선정됐습니다.",
  application_rejected: "프로젝트 지원이 거절됐습니다.",
  recruitment_closed: "프로젝트 모집이 마감됐습니다.",
};
