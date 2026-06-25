import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const { projectId, rating, comment, tags } = await req.json();

    if (!projectId || !comment) {
      return apiError("필수 항목을 모두 입력해주세요.", 400);
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return apiError("별점은 1~5 사이의 정수여야 합니다.", 400);
    }

    // 프로젝트 완료 상태 확인
    const projectSnap = await adminDb.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) return apiError("프로젝트를 찾을 수 없습니다.", 404);
    const project = projectSnap.data()!;
    if (project.status !== "completed") return apiError("완료된 프로젝트에만 리뷰를 작성할 수 있습니다.", 400);

    // 리뷰 작성자 역할 확인
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const role = userSnap.data()?.role as "client" | "freelancer";

    // 계약서에서 상대방 uid 찾기
    const allContracts = await adminDb
      .collection("contracts")
      .where("projectId", "==", projectId)
      .get();
    const completedContract = allContracts.docs.find((d) => d.data().status === "completed");
    if (!completedContract) return apiError("완료된 계약서를 찾을 수 없습니다.", 404);
    const contract = completedContract.data();

    const isClient = contract.clientId === uid;
    const isFreelancer = contract.freelancerId === uid;
    if (!isClient && !isFreelancer) return apiError("이 프로젝트의 참여자가 아닙니다.", 403);

    const revieweeId = isClient ? contract.freelancerId : contract.clientId;

    // 자기 자신에게는 리뷰 작성 불가 (자기리뷰로 평점 조작 방지)
    if (revieweeId === uid) {
      return apiError("본인에게는 리뷰를 작성할 수 없습니다.", 403);
    }

    // 중복 리뷰 방지
    const reviewsByProject = await adminDb
      .collection("reviews")
      .where("projectId", "==", projectId)
      .get();
    const alreadyReviewed = reviewsByProject.docs.some((d) => d.data().reviewerId === uid);
    if (alreadyReviewed) return apiError("이미 리뷰를 작성했습니다.", 409);

    const now = Timestamp.now();

    // 리뷰 생성
    await adminDb.collection("reviews").add({
      projectId,
      reviewerId: uid,
      revieweeId,
      reviewerRole: role,
      rating: ratingNum,
      comment,
      tags: tags ?? [],
      createdAt: now,
    });

    // 리뷰이의 평균 별점 업데이트 (트랜잭션)
    await adminDb.runTransaction(async (tx) => {
      const userRef = adminDb.collection("users").doc(revieweeId);
      const userDoc = await tx.get(userRef);
      const userData = userDoc.data()!;
      const currentCount = userData.reviewCount ?? 0;
      const currentAvg = userData.avgRating ?? 0;
      const newCount = currentCount + 1;
      const newAvg = (currentAvg * currentCount + ratingNum) / newCount;
      tx.update(userRef, { avgRating: newAvg, reviewCount: newCount });
    });

    return apiOk({ success: true }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "리뷰 작성 실패";
    return apiError(message, 400);
  }
}
