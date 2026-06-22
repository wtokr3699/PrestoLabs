import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);

    const snap = await adminDb
      .collection("projects")
      .where("clientId", "==", uid)
      .get();

    const projects = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p: Record<string, unknown>) => p.deletedAt === null || p.deletedAt === undefined)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const ta = (a.createdAt as { seconds?: number })?.seconds ?? 0;
        const tb = (b.createdAt as { seconds?: number })?.seconds ?? 0;
        return tb - ta;
      });
    return apiOk({ projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "조회 실패";
    return apiError(message, 500);
  }
}
