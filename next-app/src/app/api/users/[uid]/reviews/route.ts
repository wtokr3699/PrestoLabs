import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { apiError, apiOk } from "@/lib/auth-middleware";

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    const snap = await adminDb
      .collection("reviews")
      .where("revieweeId", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return apiOk({ reviews });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "조회 실패";
    return apiError(message, 500);
  }
}
