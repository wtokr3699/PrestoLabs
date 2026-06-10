const serviceSearchForm = document.getElementById("service-search-form");
const serviceSearchInput = document.getElementById("service-search");
const categoryGrid = document.getElementById("category-grid");
const resetFilterButton = document.getElementById("reset-filter");
const serviceCards = Array.from(document.querySelectorAll(".service-card"));
const expertCards = Array.from(document.querySelectorAll(".expert-card"));
const categoryButtons = Array.from(document.querySelectorAll(".category-card"));
const keywordButtons = Array.from(document.querySelectorAll(".keyword-chip"));
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
  categoryButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.service === service);
  });
}

function updateSelectChips(service) {
  serviceChipButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.service === service);
  });
}

function updateFilterButtons(service) {
  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.service === service);
  });
}

function applyServiceFilter(service) {
  activeService = service;
  updateCategoryButtons(service);
  updateSelectChips(service === "all" ? "landing" : service);
  updateFilterButtons(service);

  serviceCards.forEach((card) => {
    const isVisible = service === "all" || card.dataset.service === service;
    card.hidden = !isVisible;
  });

  expertCards.forEach((card) => {
    const isVisible = service === "all" || card.dataset.service === service;
    card.hidden = !isVisible;
  });
}

function findServiceFromText(text) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return "all";
  }

  const matched = Object.entries(serviceLabels).find(([, label]) =>
    label.toLowerCase().includes(normalized)
  );

  if (matched) {
    return matched[0];
  }

  if (normalized.includes("랜딩")) return "landing";
  if (normalized.includes("홈페이지")) return "website";
  if (normalized.includes("자동화")) return "automation";
  if (normalized.includes("mvp")) return "mvp";
  if (normalized.includes("관리자")) return "admin";
  if (normalized.includes("챗봇")) return "chatbot";

  return "all";
}

function updatePreview() {
  const selectedServiceButton =
    serviceChipButtons.find((button) => button.classList.contains("is-selected")) ||
    serviceChipButtons[0];

  const selectedService = selectedServiceButton.textContent.trim();
  const summary =
    ideaInput.value.trim() ||
    "아이디어 설명을 입력하면 AI가 요구사항, 범위, 추천 전문가 유형을 정리합니다.";

  previewList.innerHTML = "";

  [
    `서비스: ${selectedService}`,
    `예산: ${budgetSelect.value}`,
    `일정: ${deadlineSelect.value}`,
    `요약: ${summary.length > 72 ? `${summary.slice(0, 72)}...` : summary}`,
  ].forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    previewList.appendChild(item);
  });
}

serviceSearchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const service = findServiceFromText(serviceSearchInput.value);
  applyServiceFilter(service);
  updateSelectChips(service === "all" ? "landing" : service);
  updatePreview();
  document.getElementById("categories")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

categoryGrid?.addEventListener("click", (event) => {
  const target = event.target.closest(".category-card");
  if (!target) return;
  const service = target.dataset.service || "all";
  applyServiceFilter(service);
  updatePreview();
});

keywordButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const service = button.dataset.service || "all";
    serviceSearchInput.value = serviceLabels[service] || "";
    applyServiceFilter(service);
    updateSelectChips(service);
    updatePreview();
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const service = button.dataset.service || "all";
    applyServiceFilter(service);
  });
});

serviceChipButtons.forEach((button) => {
  button.addEventListener("click", () => {
    updateSelectChips(button.dataset.service || "landing");
    updatePreview();
  });
});

panelSubmit?.addEventListener("click", () => {
  updatePreview();
});

budgetSelect?.addEventListener("change", updatePreview);
deadlineSelect?.addEventListener("change", updatePreview);
ideaInput?.addEventListener("input", updatePreview);
resetFilterButton?.addEventListener("click", () => applyServiceFilter("all"));

applyServiceFilter("all");
updatePreview();
