// 예산 범위 표시. 둘 다 0/미설정이면 "예산 미정" (AI 분석 전 0~0원 노출 방지)
export function formatBudget(min?: number | null, max?: number | null): string {
  if (!min && !max) return "예산 미정";
  return `${(min ?? 0).toLocaleString()}~${(max ?? 0).toLocaleString()}원`;
}
