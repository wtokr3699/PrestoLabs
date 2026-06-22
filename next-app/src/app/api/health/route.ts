export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. 환경변수 확인 (값 노출 안 함)
  results.hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
  results.hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
  results.hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;

  // 2. Firebase Admin 초기화 테스트
  try {
    const { getApps } = await import("firebase-admin/app");
    results.appsCount = getApps().length;
  } catch (err) {
    results.appsError = String(err);
  }

  // 3. adminDb import 테스트
  try {
    const { adminDb } = await import("@/lib/firebaseAdmin");
    results.adminDbOk = !!adminDb;
  } catch (err) {
    results.adminDbError = String(err);
  }

  // 4. Firestore 간단 쿼리 테스트
  try {
    const { adminDb } = await import("@/lib/firebaseAdmin");
    const snap = await adminDb.collection("projects").limit(1).get();
    results.firestoreOk = true;
    results.firestoreDocCount = snap.size;
  } catch (err) {
    results.firestoreError = String(err);
  }

  return Response.json(results);
}
