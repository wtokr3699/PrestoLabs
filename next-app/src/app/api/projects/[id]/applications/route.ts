import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";
import { addNotificationToBatch } from "@/lib/notifications";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const projectSnap = await adminDb.collection("projects").doc(id).get();
    if (!projectSnap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = projectSnap.data()!;

    const isClient = project.clientId === uid;

    let query = adminDb.collection("applications").where("projectId", "==", id);
    // 프리랜서는 본인 지원서만 조회
    if (!isClient) {
      query = query.where("freelancerId", "==", uid);
    }

    const snap = await query.orderBy("createdAt", "desc").get();
    const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

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

    // 프로젝트 확인
    const projectSnap = await adminDb.collection("projects").doc(id).get();
    if (!projectSnap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = projectSnap.data()!;

    if (!["open", "in_review"].includes(project.status)) {
      return apiError("현재 지원을 받지 않는 프로젝트입니다.", 400);
    }

    // 중복 지원 방지
    const existing = await adminDb
      .collection("applications")
      .where("projectId", "==", id)
      .where("freelancerId", "==", uid)
      .limit(1)
      .get();

    if (!existing.empty) return apiError("이미 지원한 프로젝트입니다.", 409);

    const body = await req.json();
    const { coverLetter, proposedBudget, estimatedDays } = body;

    if (!coverLetter || !proposedBudget || !estimatedDays) {
      return apiError("지원서 내용을 모두 입력해주세요.", 400);
    }

    const batch = adminDb.batch();
    const now = Timestamp.now();

    // 지원서 생성
    const appRef = adminDb.collection("applications").doc();
    batch.set(appRef, {
      projectId: id,
      freelancerId: uid,
      coverLetter,
      proposedBudget,
      estimatedDays,
      status: "pending",
      createdAt: now,
      deletedAt: null,
    });

    // 지원자 수 카운터 증가
    batch.update(adminDb.collection("projects").doc(id), {
      applicationCount: (project.applicationCount ?? 0) + 1,
      status: project.status === "open" ? "in_review" : project.status,
      updatedAt: now,
    });

    // 의뢰인에게 알림 (Trigger 1)
    addNotificationToBatch(batch, {
      userId: project.clientId,
      type: "application_received",
      projectId: id,
      applicationId: appRef.id,
    });

    await batch.commit();
    return apiOk({ id: appRef.id }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "지원 실패";
    return apiError(message, 400);
  }
}
