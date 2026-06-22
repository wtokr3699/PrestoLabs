import { NextRequest } from "next/server";
import { apiError } from "./auth-middleware";

export function validateSeedAccess(req: NextRequest): Response | null {
  const configuredSecret = process.env.SEED_SECRET;

  if (!configuredSecret) {
    return process.env.NODE_ENV === "production"
      ? apiError("시드 데이터는 개발 환경에서만 사용 가능합니다.", 403)
      : null;
  }

  const secret = req.headers.get("x-seed-secret");
  return secret === configuredSecret ? null : apiError("인증 실패", 401);
}
