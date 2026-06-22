import { NextRequest } from "next/server";
import { adminAuth } from "./firebaseAdmin";

export interface AuthUser {
  uid: string;
  email: string;
}

export async function verifyAuth(req: NextRequest): Promise<AuthUser> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("인증이 필요합니다.");

  const decoded = await adminAuth.verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email ?? "" };
}

export function apiError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return Response.json(data, { status });
}
