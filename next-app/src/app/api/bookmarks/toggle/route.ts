import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const { projectId } = await req.json();

    if (!projectId) return apiError("projectId가 필요합니다.", 400);

    const existing = await adminDb
      .collection("bookmarks")
      .where("userId", "==", uid)
      .where("projectId", "==", projectId)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      const isDeleted = !!doc.data().deletedAt;
      if (isDeleted) {
        // 복구 (토글 온)
        await doc.ref.update({ deletedAt: null, createdAt: Timestamp.now() });
        return apiOk({ bookmarked: true });
      } else {
        // 소프트 딜리트 (토글 오프)
        await doc.ref.update({ deletedAt: Timestamp.now() });
        return apiOk({ bookmarked: false });
      }
    }

    // 새 북마크 생성
    await adminDb.collection("bookmarks").add({
      userId: uid,
      projectId,
      createdAt: Timestamp.now(),
      deletedAt: null,
    });

    return apiOk({ bookmarked: true }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "북마크 처리 실패";
    return apiError(message, 400);
  }
}
