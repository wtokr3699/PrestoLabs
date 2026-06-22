// 기존 auth.js의 toKoreanError() 이식
export function toKoreanError(code: string): string {
  const map: Record<string, string> = {
    "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/user-not-found": "등록되지 않은 이메일입니다.",
    "auth/wrong-password": "비밀번호가 올바르지 않습니다.",
    "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
    "auth/weak-password": "비밀번호는 8자 이상이어야 합니다.",
    "auth/invalid-email": "올바른 이메일 형식이 아닙니다.",
    "auth/too-many-requests": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
    "auth/network-request-failed": "네트워크 연결을 확인해주세요.",
    "auth/popup-closed-by-user": "로그인 창이 닫혔습니다. 다시 시도해주세요.",
    "auth/cancelled-popup-request": "로그인이 취소됐습니다.",
    "auth/account-exists-with-different-credential":
      "동일한 이메일로 다른 방식으로 가입된 계정이 있습니다.",
    "auth/requires-recent-login": "보안을 위해 다시 로그인해주세요.",
    "auth/user-disabled": "비활성화된 계정입니다. 고객센터에 문의해주세요.",
  };
  return map[code] ?? "오류가 발생했습니다. 다시 시도해주세요.";
}

export function getApiError(message: string): string {
  return message || "오류가 발생했습니다. 다시 시도해주세요.";
}
