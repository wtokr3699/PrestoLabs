import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function initAdmin() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    // 개발 환경에서 서비스 계정 키 없으면 경고만 출력
    console.warn("[Firebase Admin] 서비스 계정 환경변수가 설정되지 않았습니다.");
    // projectId만으로 초기화 (Firestore emulator 또는 로컬 개발용)
    initializeApp({ projectId: projectId ?? "prestolabs-753ec" });
    return;
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

initAdmin();

export const adminDb = getFirestore();
export const adminAuth = getAuth();
