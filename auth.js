import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, GoogleAuthProvider, OAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
try { getAnalytics(app); } catch (_) {}

// --- DOM refs ---
const overlay = document.getElementById("auth-overlay");
const closeBtn = document.getElementById("auth-close");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const loggedOutActions = document.getElementById("logged-out-actions");
const loggedInActions = document.getElementById("logged-in-actions");
const userNameDisplay = document.getElementById("user-name-display");

const authTabs = Array.from(document.querySelectorAll(".auth-tab"));
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginError = document.getElementById("login-error");
const signupError = document.getElementById("signup-error");

const roleCards = Array.from(document.querySelectorAll(".role-card"));
let selectedRole = "user";

// Flag: 로그인 후 자동 제출 여부
let pendingSubmit = false;

// --- Modal open / close ---
function openAuth(tab) {
  overlay.removeAttribute("hidden");
  switchTab(tab);
  document.body.style.overflow = "hidden";
}

function closeAuth() {
  overlay.setAttribute("hidden", "");
  document.body.style.overflow = "";
  loginForm.reset();
  signupForm.reset();
  hideError(loginError);
  hideError(signupError);
  selectedRole = "user";
  roleCards.forEach((c) => c.classList.toggle("is-selected", c.dataset.role === "user"));
}

function switchTab(tab) {
  authTabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === tab));
  loginForm.hidden = tab !== "login";
  signupForm.hidden = tab !== "signup";
}

loginBtn?.addEventListener("click", () => openAuth("login"));
signupBtn?.addEventListener("click", () => openAuth("signup"));
closeBtn?.addEventListener("click", closeAuth);
overlay?.addEventListener("click", (e) => { if (e.target === overlay) closeAuth(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) closeAuth(); });

authTabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));

// --- Role selection ---
roleCards.forEach((card) => {
  card.addEventListener("click", () => {
    roleCards.forEach((c) => c.classList.remove("is-selected"));
    card.classList.add("is-selected");
    selectedRole = card.dataset.role;
  });
});

// --- Social sign-in ---
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

async function handleSocialUser(user) {
  const userDocRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) {
    await setDoc(userDocRef, {
      name: user.displayName || "",
      email: user.email || "",
      role: selectedRole,
      createdAt: serverTimestamp(),
    });
  }
}

async function socialSignIn(provider, errorEl) {
  hideError(errorEl);
  try {
    const result = await signInWithPopup(auth, provider);
    await handleSocialUser(result.user);
    closeAuth();
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
      showError(errorEl, toKoreanError(err.code));
    }
  }
}

document.getElementById("google-login-btn")?.addEventListener("click", () => socialSignIn(googleProvider, loginError));
document.getElementById("apple-login-btn")?.addEventListener("click", () => socialSignIn(appleProvider, loginError));
document.getElementById("google-signup-btn")?.addEventListener("click", () => socialSignIn(googleProvider, signupError));
document.getElementById("apple-signup-btn")?.addEventListener("click", () => socialSignIn(appleProvider, signupError));

// --- Error helpers ---
function showError(el, msg) {
  el.textContent = msg;
  el.removeAttribute("hidden");
}

function hideError(el) {
  el.setAttribute("hidden", "");
  el.textContent = "";
}

function toKoreanError(code) {
  const map = {
    "auth/user-not-found": "등록되지 않은 이메일입니다.",
    "auth/wrong-password": "비밀번호가 올바르지 않습니다.",
    "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
    "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
    "auth/invalid-email": "올바른 이메일 형식이 아닙니다.",
    "auth/too-many-requests": "잠시 후 다시 시도해주세요.",
    "auth/popup-blocked": "팝업이 차단됐습니다. 팝업 허용 후 다시 시도해주세요.",
    "auth/account-exists-with-different-credential": "이미 다른 방법으로 가입된 이메일입니다.",
    "auth/operation-not-allowed": "이메일 회원가입이 비활성화되어 있습니다.",
    "auth/network-request-failed": "네트워크 오류가 발생했습니다. 다시 시도해주세요.",
  };
  return map[code] ?? `오류가 발생했습니다. (${code ?? "unknown"})`;
}

// --- Login ---
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError(loginError);
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    closeAuth();
  } catch (err) {
    showError(loginError, toKoreanError(err.code));
  }
});

// --- Sign up ---
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError(signupError);
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: name });
    try {
      await setDoc(doc(db, "users", user.uid), {
        name, email, role: selectedRole, createdAt: serverTimestamp(),
      });
    } catch (_) {}
    closeAuth();
  } catch (err) {
    showError(signupError, toKoreanError(err.code));
  }
});

// --- Logout ---
logoutBtn?.addEventListener("click", () => signOut(auth));

// --- Request submission ---

function showSubmitError(msg) {
  const errEl = document.getElementById("submit-error");
  if (!errEl) return;
  errEl.textContent = msg;
  errEl.removeAttribute("hidden");
}

function clearSubmitError() {
  const errEl = document.getElementById("submit-error");
  if (errEl) errEl.setAttribute("hidden", "");
}

function showSuccessState() {
  // 3단계 숨기고 성공 페이지 표시
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`req-page-${i}`);
    if (el) el.hidden = true;
  }
  const successEl = document.getElementById("req-page-success");
  if (successEl) successEl.hidden = false;

  // 스텝 트래커 전체 완료 표시
  document.querySelectorAll(".step-node").forEach((node) => {
    node.classList.remove("is-active");
    node.classList.add("is-done");
  });
}

async function doSubmitRequest() {
  clearSubmitError();

  const description = document.getElementById("idea-input")?.value.trim() ?? "";
  if (!description) {
    showSubmitError("아이디어 설명을 입력해주세요.");
    return;
  }

  const selectedChip = document.querySelector(".select-chip.is-selected");
  const service = selectedChip?.textContent.trim() ?? "";
  const budget = document.getElementById("budget-select")?.value ?? "";
  const deadline = document.getElementById("deadline-select")?.value ?? "";

  const btn = document.getElementById("panel-submit");
  btn.textContent = "제출 중...";
  btn.disabled = true;

  try {
    await addDoc(collection(db, "requests"), {
      service,
      budget,
      deadline,
      description,
      userId: auth.currentUser?.uid ?? null,
      userEmail: auth.currentUser?.email ?? null,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    showSuccessState();
  } catch {
    btn.textContent = "AI 요청서 제출";
    btn.disabled = false;
    showSubmitError("제출에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}

document.getElementById("panel-submit")?.addEventListener("click", async () => {
  // 설명 입력 검증을 먼저 수행
  clearSubmitError();
  const description = document.getElementById("idea-input")?.value.trim() ?? "";
  if (!description) {
    showSubmitError("아이디어 설명을 입력해주세요.");
    return;
  }

  // 로그인하지 않은 경우 인증 모달 열기 → 로그인 후 자동 제출
  if (!auth.currentUser) {
    pendingSubmit = true;
    openAuth("signup");
    return;
  }
  await doSubmitRequest();
});

// --- Auth state ---
onAuthStateChanged(auth, async (user) => {
  const adminLink = document.getElementById("admin-link");

  if (user) {
    loggedOutActions.hidden = true;
    loggedInActions.hidden = false;

    let roleBadge = "";
    try {
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const role = docSnap.data().role;
        roleBadge = role === "expert" ? " · 고수" : " · 유저";
        if (adminLink) adminLink.hidden = role !== "admin";
      }
    } catch {
      // Firestore read failed — display name only
    }

    userNameDisplay.textContent = (user.displayName || user.email) + roleBadge;

    // 로그인 전에 제출을 시도했다면 자동으로 제출
    if (pendingSubmit) {
      pendingSubmit = false;
      closeAuth();
      await doSubmitRequest();
    }
  } else {
    loggedOutActions.hidden = false;
    loggedInActions.hidden = true;
    if (adminLink) adminLink.hidden = true;
  }
});
