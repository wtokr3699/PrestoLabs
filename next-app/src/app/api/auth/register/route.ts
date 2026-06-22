import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { apiError, apiOk } from "@/lib/auth-middleware";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { name, role, idToken } = await req.json();

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // 이미 도큐먼트가 있으면 업데이트하지 않음
    const existing = await adminDb.collection("users").doc(uid).get();
    if (existing.exists) {
      return apiOk({ uid, existing: true });
    }

    await adminDb.collection("users").doc(uid).set({
      name: name ?? "사용자",
      email: decoded.email ?? "",
      role: role ?? null,
      avatarUrl: decoded.picture ?? null,
      bio: null,
      profileComplete: false,
      skills: [],
      hourlyRate: null,
      portfolioUrl: null,
      avgRating: 0,
      reviewCount: 0,
      companyName: null,
      businessField: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      deletedAt: null,
    });

    return apiOk({ uid, existing: false }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "등록 실패";
    return apiError(message, 400);
  }
}
