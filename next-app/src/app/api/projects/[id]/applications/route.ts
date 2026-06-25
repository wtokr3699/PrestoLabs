import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { buildNotificationDoc } from "@/lib/notifications";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const projectSnap = await adminDb.collection("projects").doc(id).get();
    if (!projectSnap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = projectSnap.data()!;

    const isClient = project.clientId === uid;

    const snap = await adminDb
      .collection("applications")
      .where("projectId", "==", id)
      .get();

    let applications = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const ta = (a.createdAt as { seconds?: number })?.seconds ?? 0;
        const tb = (b.createdAt as { seconds?: number })?.seconds ?? 0;
        return tb - ta;
      });

    // 프리랜서는 본인 지원서만
    if (!isClient) {
      applications = applications.filter((a: Record<string, unknown>) => a.freelancerId === uid);
    }

    return apiOk({ applications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "조회 실패";
    return apiError(message, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    // 프리랜서 확인
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) return apiError("사용자를 찾을 수 없습니다.", 404);
    const userData = userSnap.data()!;
    if (userData.role !== "freelancer") return apiError("프리랜서만 지원할 수 있습니다.", 403);
    if (!userData.profileComplete) return apiError("프로필을 먼저 완성해주세요.", 403);

    const body = await req.json();
    const { coverLetter, proposedBudget, estimatedDays } = body;
    if (!coverLetter || !proposedBudget || !estimatedDays) {
      return apiError("지원서 내용을 모두 입력해주세요.", 400);
    }

    const projectRef = adminDb.collection("projects").doc(id);
    // 결정적 문서 ID(projectId_uid)로 중복 지원을 원천 차단
    const appRef = adminDb.collection("applications").doc(`${id}_${uid}`);
    const now = Timestamp.now();

    // 상태 확인 + 중복 확인 + 카운터 증가를 트랜잭션으로 원자 처리
    await adminDb.runTransaction(async (tx) => {
      const [projectSnap, existingApp] = await Promise.all([
        tx.get(projectRef),
        tx.get(appRef),
      ]);

      if (!projectSnap.exists) throw new Error("프로젝트를 찾을 수 없습니다.");
      const project = projectSnap.data()!;

      // 본인이 등록한 프로젝트에는 지원할 수 없음 (자기거래 방지)
      if (project.clientId === uid) {
        throw new Error("본인이 등록한 프로젝트에는 지원할 수 없습니다.");
      }
      if (!["open", "in_review"].includes(project.status)) {
        throw new Error("현재 지원을 받지 않는 프로젝트입니다.");
      }
      if (existingApp.exists) {
        throw new Error("이미 지원한 프로젝트입니다.");
      }

      tx.set(appRef, {
        projectId: id,
        freelancerId: uid,
        coverLetter,
        proposedBudget,
        estimatedDays,
        status: "pending",
        createdAt: now,
        deletedAt: null,
      });

      tx.update(projectRef, {
        applicationCount: FieldValue.increment(1),
        status: project.status === "open" ? "in_review" : project.status,
        updatedAt: now,
      });

      // 의뢰인에게 알림 (Trigger 1)
      tx.set(
        adminDb.collection("notifications").doc(),
        buildNotificationDoc({
          userId: project.clientId,
          type: "application_received",
          projectId: id,
          applicationId: appRef.id,
          actorName: userData.name ?? undefined,
        })
      );
    });

    return apiOk({ id: appRef.id }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "지원 실패";
    const status = message.includes("본인") ? 403
      : message.includes("이미") ? 409
      : message.includes("받지 않는") ? 400
      : 400;
    return apiError(message, status);
  }
}
