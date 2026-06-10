const form = document.getElementById("idea-form");
const ideaInput = document.getElementById("idea");
const resultBox = document.getElementById("idea-result");
const resultPoints = document.getElementById("result-points");

function summarizeIdea(text) {
  const cleaned = text.trim();
  const short = cleaned.length > 64 ? `${cleaned.slice(0, 64)}...` : cleaned;

  return [
    `한 줄 요약: ${short}`,
    "권장 흐름: AI 요구사항 정리 → 적합한 실행자 추천 → 에스크로 결제 후 48시간 실행",
    "예상 결과물: 작동 가능한 MVP, 자동화 도구, 랜딩페이지 또는 내부 업무 도구",
    "검수 기준: 핵심 기능 목록, 제외 범위, 기본 수정 1~2회 포함 여부를 문서로 확정",
  ];
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = ideaInput?.value ?? "";
  if (!value.trim()) {
    ideaInput?.focus();
    return;
  }

  const lines = summarizeIdea(value);
  resultPoints.innerHTML = "";

  for (const line of lines) {
    const item = document.createElement("li");
    item.textContent = line;
    resultPoints.appendChild(item);
  }

  resultBox.hidden = false;
});
