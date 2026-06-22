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

    const batch = adminDb.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, { read: true });
    }
    await batch.commit();

    return apiOk({ updated: snap.size });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "업데이트 실패";
    return apiError(message, 400);
  }
}
