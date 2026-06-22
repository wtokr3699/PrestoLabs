import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);

    const snap = await adminDb
      .collection("notifications")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return apiOk({ notifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "조회 실패";
    return apiError(message, 500);
  }
}
