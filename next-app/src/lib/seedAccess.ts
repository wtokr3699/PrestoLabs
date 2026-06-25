import { NextRequest } from "next/server";
import { apiError } from "./auth-middleware";

export function validateSeedAccess(req: NextRequest): Response | null {
  const configuredSecret = process.env.SEED_SECRET;

  // fail-closed: SEED_SECRET 미설정 시 모든 환경에서 차단.
  // (이전에는 비프로덕션에서 무인증 허용되어 프리뷰/스테이징에서 실데이터 조작 위험)
  if (!configuredSecret) {
    return apiError(
      "시드 엔드포인트가 비활성화되어 있습니다. SEED_SECRET 환경변수를 설정하세요.",
      403
    );
  }

  const secret = req.headers.get("x-seed-secret");
  return secret === configuredSecret ? null : apiError("인증 실패", 401);
}
