import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function initAdmin() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID ?? "prestolabs-753ec";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // \n 리터럴과 실제 개행 모두 처리
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const privateKey = rawKey.includes("\\n")
    ? rawKey.replace(/\\n/g, "\n")
    : rawKey;

  if (!clientEmail || !privateKey) {
    console.warn("[Firebase Admin] 서비스 계정 환경변수가 설정되지 않았습니다.");
    initializeApp({ projectId });
    return;
  }

  try {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    console.log("[Firebase Admin] 초기화 성공");
  } catch (err) {
    console.error("[Firebase Admin] cert() 초기화 오류:", err);
    // 크레덴셜 없이 재시도 (읽기 전용 쿼리는 실패하지만 모듈 자체는 로드됨)
    if (getApps().length === 0) {
      initializeApp({ projectId });
    }
  }
}

initAdmin();

export const adminDb = getFirestore();
export const adminAuth = getAuth();
