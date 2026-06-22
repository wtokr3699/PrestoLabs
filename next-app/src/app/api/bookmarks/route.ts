import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);

    const snap = await adminDb
      .collection("bookmarks")
      .where("userId", "==", uid)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "desc")
      .get();

    // 프로젝트 상세 정보를 함께 조회
    const bookmarks = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        const projectSnap = await adminDb.collection("projects").doc(data.projectId).get();
        if (!projectSnap.exists || projectSnap.data()?.deletedAt) return null;
        return {
          bookmarkId: d.id,
          ...projectSnap.data(),
          id: projectSnap.id,
        };
      })
    );

    return apiOk({ bookmarks: bookmarks.filter(Boolean) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "조회 실패";
    return apiError(message, 500);
  }
}
