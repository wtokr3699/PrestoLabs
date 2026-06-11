const categoryGrid = document.getElementById("category-grid");
const resetFilterButton = document.getElementById("reset-filter");
const serviceCards = Array.from(document.querySelectorAll(".service-card"));
const expertCards = Array.from(document.querySelectorAll(".expert-card"));
const categoryButtons = Array.from(document.querySelectorAll(".category-card"));
const filterButtons = Array.from(document.querySelectorAll(".filter-chip"));
const serviceChipButtons = Array.from(document.querySelectorAll(".select-chip"));
const previewList = document.getElementById("preview-list");
const ideaInput = document.getElementById("idea-input");
const budgetSelect = document.getElementById("budget-select");
const deadlineSelect = document.getElementById("deadline-select");
const panelSubmit = document.getElementById("panel-submit");

const serviceLabels = {
  all: "전체 서비스",
  landing: "랜딩페이지 제작",
  website: "소상공인 홈페이지",
  automation: "업무 자동화",
  mvp: "MVP 개발",
  admin: "관리자 페이지",
  chatbot: "AI 챗봇",
};

let activeService = "all";

function updateCategoryButtons(service) {
  categoryButtons.forEach((btn) =>
    btn.classList.toggle("is-active", btn.dataset.service === service)
  );
}

function updateSelectChips(service) {
  serviceChipButtons.forEach((btn) =>
    btn.classList.toggle("is-selected", btn.dataset.service === service)
  );
}

function updateFilterButtons(service) {
  filterButtons.forEach((btn) =>
    btn.classList.toggle("is-active", btn.dataset.service === service)
  );
}

function applyServiceFilter(service) {
  activeService = service;
  updateCategoryButtons(service);
  updateSelectChips(service === "all" ? "landing" : service);

  serviceCards.forEach((card) => {
    card.hidden = service !== "all" && card.dataset.service !== service;
  });
}

function applyExpertFilter(service) {
  updateFilterButtons(service);
  expertCards.forEach((card) => {
    card.hidden = service !== "all" && card.dataset.service !== service;
  });
}

function updatePreview() {
  const selectedChip =
    serviceChipButtons.find((btn) => btn.classList.contains("is-selected")) ||
    serviceChipButtons[0];

  const selectedService = selectedChip?.textContent.trim() ?? "";
  const summary =
    ideaInput?.value.trim() ||
    "아이디어 설명을 입력하면 AI가 요구사항과 추천 전문가 유형을 정리합니다.";

  if (!previewList) return;
  previewList.innerHTML = "";

  [
    `서비스: ${selectedService}`,
    `예산: ${budgetSelect?.value ?? ""}`,
    `일정: ${deadlineSelect?.value ?? ""}`,
    `요약: ${summary.length > 72 ? summary.slice(0, 72) + "…" : summary}`,
  ].forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    previewList.appendChild(li);
  });
}

// Category grid filter
categoryGrid?.addEventListener("click", (e) => {
  const target = e.target.closest(".category-card");
  if (!target) return;
  applyServiceFilter(target.dataset.service || "all");
  updatePreview();
});

// Expert filter chips (independent of category grid)
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => applyExpertFilter(btn.dataset.service || "all"));
});

// Service chips inside request panel
serviceChipButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    updateSelectChips(btn.dataset.service || "landing");
    updatePreview();
  });
});

// Preview inputs
panelSubmit?.addEventListener("click", updatePreview);
budgetSelect?.addEventListener("change", updatePreview);
deadlineSelect?.addEventListener("change", updatePreview);
ideaInput?.addEventListener("input", updatePreview);

resetFilterButton?.addEventListener("click", () => applyServiceFilter("all"));

applyServiceFilter("all");
applyExpertFilter("all");
updatePreview();

// ── Request panel pagination ────────────────────────────────
let reqPage = 1;
const REQ_PAGES = 3;

function showReqPage(n) {
  reqPage = Math.max(1, Math.min(REQ_PAGES, n));

  for (let i = 1; i <= REQ_PAGES; i++) {
    const el = document.getElementById(`req-page-${i}`);
    if (el) el.hidden = i !== reqPage;
  }

  document.querySelectorAll(".step-node").forEach((node, idx) => {
    node.classList.toggle("is-active", idx + 1 === reqPage);
    node.classList.toggle("is-done", idx + 1 < reqPage);
  });

  if (reqPage === REQ_PAGES) updatePreview();
}

document.querySelectorAll(".req-next").forEach((btn) =>
  btn.addEventListener("click", () => showReqPage(reqPage + 1))
);

document.querySelectorAll(".req-prev").forEach((btn) =>
  btn.addEventListener("click", () => showReqPage(reqPage - 1))
);

showReqPage(1);
