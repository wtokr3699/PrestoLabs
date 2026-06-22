import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAuth, apiError, apiOk } from "@/lib/auth-middleware";
import type { DocumentData } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const userSnap = await adminDb.collection("users").doc(uid).get();

    if (!userSnap.exists || userSnap.data()?.role !== "admin") {
      return apiError("권한이 없습니다.", 403);
    }

    const [usersSnap, projectsSnap, appsSnap, contractsSnap, paymentsSnap] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("projects").get(),
      adminDb.collection("applications").get(),
      adminDb.collection("contracts").get(),
      adminDb.collection("payments").where("status", "==", "released").get(),
    ]);

    const users = usersSnap.docs.map((d) => d.data());
    const projects = projectsSnap.docs.map((d) => d.data()).filter((p) => !p.deletedAt);
    const totalRevenue = paymentsSnap.docs.reduce((sum, d) => {
      const fee = d.data().fee;
      return sum + (typeof fee === "number" ? fee : 0);
    }, 0);

    return apiOk({
      totalUsers: users.length,
      clients: users.filter((u: DocumentData) => u.role === "client").length,
      freelancers: users.filter((u: DocumentData) => u.role === "freelancer").length,
      totalProjects: projects.length,
      openProjects: projects.filter((p: DocumentData) => p.status === "open" || p.status === "in_review").length,
      completedProjects: projects.filter((p: DocumentData) => p.status === "completed").length,
      totalApplications: appsSnap.size,
      totalContracts: contractsSnap.size,
      totalRevenue,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "관리자 통계 조회 실패";
    return apiError(message, 401);
  }
}
