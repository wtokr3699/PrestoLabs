import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";
import { addNotificationToBatch } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const appSnap = await adminDb.collection("applications").doc(id).get();
    if (!appSnap.exists) return apiError("지원서를 찾을 수 없습니다.", 404);
    const application = appSnap.data()!;

    // 프로젝트 소유자 확인
    const projectSnap = await adminDb.collection("projects").doc(application.projectId).get();
    if (!projectSnap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = projectSnap.data()!;
    if (project.clientId !== uid) return apiError("권한이 없습니다.", 403);

    const { agreedBudget } = await req.json();
    if (!agreedBudget) return apiError("합의 금액을 입력해주세요.", 400);

    const now = Timestamp.now();
    const batch = adminDb.batch();
    const projectId = application.projectId;

    // 선택된 지원서 수락
    batch.update(appSnap.ref, { status: "accepted", acceptedAt: now });

    // 다른 pending 지원자 일괄 자동 거절 (Trigger 3)
    const allProjectApps = await adminDb
      .collection("applications")
      .where("projectId", "==", projectId)
      .get();
    const otherApps = { docs: allProjectApps.docs.filter((d) => d.data().status === "pending") };

    for (const otherDoc of otherApps.docs) {
      if (otherDoc.id === id) continue;
      batch.update(otherDoc.ref, { status: "auto_rejected", updatedAt: now });
      addNotificationToBatch(batch, {
        userId: otherDoc.data().freelancerId,
        type: "application_auto_rejected",
        projectId,
        applicationId: otherDoc.id,
      });
    }

    // 프로젝트 상태 → matched
    batch.update(adminDb.collection("projects").doc(projectId), {
      status: "matched",
      acceptedApplicationId: id,
      updatedAt: now,
    });

    // 계약서 자동 생성
    const freelancerSnap = await adminDb.collection("users").doc(application.freelancerId).get();
    const clientSnap = await adminDb.collection("users").doc(uid).get();
    const freelancerName = freelancerSnap.data()?.name ?? "프리랜서";
    const clientName = clientSnap.data()?.name ?? "의뢰인";

    const terms = `
[WorkBridge 프로젝트 계약서]

프로젝트명: ${project.title}
의뢰인: ${clientName}
프리랜서: ${freelancerName}
합의 금액: ${agreedBudget.toLocaleString()}원
예상 기간: ${application.estimatedDays}일

양 당사자는 위 조건에 따라 프로젝트를 진행함에 동의합니다.
    `.trim();

    const contractRef = adminDb.collection("contracts").doc();
    const deadline = project.deadline?.toDate() ?? new Date();
    batch.set(contractRef, {
      projectId,
      clientId: uid,
      freelancerId: application.freelancerId,
      applicationId: id,
      terms,
      agreedBudget,
      startDate: now,
      endDate: Timestamp.fromDate(deadline),
      clientSigned: false,
      freelancerSigned: false,
      clientSignedAt: null,
      freelancerSignedAt: null,
      status: "draft",
      createdAt: now,
    });

    // 프로젝트에 contractId 연결
    batch.update(adminDb.collection("projects").doc(projectId), {
      contractId: contractRef.id,
    });

    // 수락된 프리랜서에게 알림 (Trigger 2)
    addNotificationToBatch(batch, {
      userId: application.freelancerId,
      type: "application_accepted",
      projectId,
      applicationId: id,
    });

    await batch.commit();
    return apiOk({ success: true, contractId: contractRef.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "수락 실패";
    return apiError(message, 400);
  }
}
