import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";

export async function PATCH(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);

    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", uid)
      .where("read", "==", false)
      .get();

    // Firestore 배치 쓰기 한도(500)를 넘지 않도록 청크 분할
    const CHUNK = 450;
    for (let i = 0; i < snap.docs.length; i += CHUNK) {
      const batch = adminDb.batch();
      for (const doc of snap.docs.slice(i, i + CHUNK)) {
        batch.update(doc.ref, { read: true });
      }
      await batch.commit();
    }

    return apiOk({ updated: snap.size });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "업데이트 실패";
    return apiError(message, 400);
  }
}
