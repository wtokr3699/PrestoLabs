import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";
import { buildNotificationDoc } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { uid } = await verifyAuth(req);
    const { id } = await params;

    const { agreedBudget } = await req.json();
    const budget = Number(agreedBudget);
    if (!Number.isFinite(budget) || budget <= 0) {
      return apiError("유효한 합의 금액을 입력해주세요.", 400);
    }

    const appRef = adminDb.collection("applications").doc(id);
    const appSnap = await appRef.get();
    if (!appSnap.exists) return apiError("지원서를 찾을 수 없습니다.", 404);
    const application = appSnap.data()!;

    const projectRef = adminDb.collection("projects").doc(application.projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = projectSnap.data()!;

    // 프로젝트 소유자 확인 (clientId는 변하지 않으므로 트랜잭션 밖에서 확인)
    if (project.clientId !== uid) return apiError("권한이 없습니다.", 403);

    // 계약서에 들어갈 이름 (변하지 않는 정보, 트랜잭션 밖 읽기)
    const [freelancerSnap, clientSnap] = await Promise.all([
      adminDb.collection("users").doc(application.freelancerId).get(),
      adminDb.collection("users").doc(uid).get(),
    ]);
    const freelancerName = freelancerSnap.data()?.name ?? "프리랜서";
    const clientName = clientSnap.data()?.name ?? "의뢰인";

    const projectId = application.projectId;
    const contractRef = adminDb.collection("contracts").doc();

    // 핵심 상태 전환은 트랜잭션으로 원자적 처리 (중복 수락 / 재매칭 방지)
    await adminDb.runTransaction(async (tx) => {
      const freshAppSnap = await tx.get(appRef);
      const freshProjectSnap = await tx.get(projectRef);
      const freshApp = freshAppSnap.data();
      const freshProject = freshProjectSnap.data();
      if (!freshApp || !freshProject) {
        throw new Error("데이터를 찾을 수 없습니다.");
      }

      // 상태 가드: 지원서는 pending, 프로젝트는 아직 매칭 전이어야 함
      if (freshApp.status !== "pending") {
        throw new Error("이미 처리된 지원서입니다.");
      }
      if (!["open", "in_review", "selecting"].includes(freshProject.status)) {
        throw new Error("이미 매칭되었거나 마감된 프로젝트입니다.");
      }

      // 다른 pending 지원자 조회 (모든 읽기는 쓰기 전에 수행)
      const allAppsSnap = await tx.get(
        adminDb.collection("applications").where("projectId", "==", projectId)
      );

      const now = Timestamp.now();

      // 선택된 지원서 수락
      tx.update(appRef, { status: "accepted", acceptedAt: now });

      // 다른 pending 지원자 일괄 자동 거절 + 알림 (Trigger 3)
      for (const otherDoc of allAppsSnap.docs) {
        if (otherDoc.id === id) continue;
        if (otherDoc.data().status !== "pending") continue;
        tx.update(otherDoc.ref, { status: "auto_rejected", updatedAt: now });
        tx.set(
          adminDb.collection("notifications").doc(),
          buildNotificationDoc({
            userId: otherDoc.data().freelancerId,
            type: "application_auto_rejected",
            projectId,
            applicationId: otherDoc.id,
          })
        );
      }

      // 계약서 자동 생성
      const deadline = freshProject.deadline?.toDate() ?? new Date();
      const terms = `
[WorkBridge 프로젝트 계약서]

프로젝트명: ${freshProject.title}
의뢰인: ${clientName}
프리랜서: ${freelancerName}
합의 금액: ${budget.toLocaleString()}원
예상 기간: ${freshApp.estimatedDays}일

양 당사자는 위 조건에 따라 프로젝트를 진행함에 동의합니다.
      `.trim();

      tx.set(contractRef, {
        projectId,
        clientId: uid,
        freelancerId: freshApp.freelancerId,
        applicationId: id,
        terms,
        agreedBudget: budget,
        startDate: now,
        endDate: Timestamp.fromDate(deadline),
        clientSigned: false,
        freelancerSigned: false,
        clientSignedAt: null,
        freelancerSignedAt: null,
        status: "draft",
        createdAt: now,
      });

      // 프로젝트 상태 → matched + 계약 연결
      tx.update(projectRef, {
        status: "matched",
        acceptedApplicationId: id,
        contractId: contractRef.id,
        updatedAt: now,
      });

      // 수락된 프리랜서에게 알림 (Trigger 2)
      tx.set(
        adminDb.collection("notifications").doc(),
        buildNotificationDoc({
          userId: freshApp.freelancerId,
          type: "application_accepted",
          projectId,
          applicationId: id,
        })
      );
    });

    return apiOk({ success: true, contractId: contractRef.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "수락 실패";
    const status = message.includes("이미") ? 409 : 400;
    return apiError(message, status);
  }
}
