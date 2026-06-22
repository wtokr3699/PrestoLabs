import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);

    const rawSnap = await adminDb
      .collection("applications")
      .where("freelancerId", "==", uid)
      .get();

    const snap = {
      docs: rawSnap.docs.sort((a, b) => {
        const ta = a.data().createdAt?.seconds ?? 0;
        const tb = b.data().createdAt?.seconds ?? 0;
        return tb - ta;
      }),
    };

    const applications = await Promise.all(
      snap.docs.map(async (d) => {
        const app = { id: d.id, ...d.data() };
        // 프로젝트 제목 조회
        try {
          const projectId = (app as Record<string, unknown>).projectId as string;
          const pSnap = await adminDb.collection("projects").doc(projectId).get();
          const projectData = pSnap.data();
          return {
            ...app,
            projectTitle: projectData?.title ?? null,
            contractId: projectData?.contractId ?? null,
          };
        } catch {
          return app;
        }
      })
    );

    return apiOk({ applications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "조회 실패";
    return apiError(message, 500);
  }
}
