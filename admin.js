import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, orderBy, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loadingEl  = document.getElementById("admin-loading");
const deniedEl   = document.getElementById("admin-denied");
const contentEl  = document.getElementById("admin-content");
const tbody      = document.getElementById("requests-tbody");
const totalEl    = document.getElementById("total-count");
const pendingEl  = document.getElementById("pending-count");
const doneEl     = document.getElementById("done-count");
const noReqEl    = document.getElementById("no-requests");

document.getElementById("admin-logout-btn")?.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    loadingEl.hidden = true;
    deniedEl.hidden = false;
    return;
  }

  // Check admin role
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists() || userDoc.data().role !== "admin") {
    loadingEl.hidden = true;
    deniedEl.hidden = false;
    return;
  }

  loadingEl.hidden = true;
  contentEl.hidden = false;
  await loadRequests();
});

async function loadRequests() {
  try {
    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    totalEl.textContent = snapshot.size;

    if (snapshot.empty) {
      noReqEl.hidden = false;
      pendingEl.textContent = "0";
      doneEl.textContent = "0";
      return;
    }

    let pending = 0;
    let done = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;

      if (data.status === "pending") pending++;
      else done++;

      const date = data.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleDateString("ko-KR")
        : "-";

      const desc = data.description
        ? data.description.length > 40
          ? data.description.slice(0, 40) + "…"
          : data.description
        : "-";

      const tr = document.createElement("tr");
      tr.dataset.id = id;
      tr.innerHTML = `
        <td><span class="tag-pill">${data.service || "-"}</span></td>
        <td>${data.budget || "-"}</td>
        <td>${data.deadline || "-"}</td>
        <td class="desc-cell" title="${data.description || ""}">${desc}</td>
        <td>${data.userEmail || "비회원"}</td>
        <td>
          <span class="status-pill ${data.status === "done" ? "status-done" : "status-pending"}">
            ${data.status === "done" ? "검토완료" : "대기"}
          </span>
        </td>
        <td>${date}</td>
        <td>
          ${data.status === "pending"
            ? `<button class="mark-done-btn ghost-btn" data-id="${id}" type="button">완료</button>`
            : ""}
        </td>
      `;
      tbody.appendChild(tr);
    });

    pendingEl.textContent = pending;
    doneEl.textContent = done;

    // Mark as done buttons
    document.querySelectorAll(".mark-done-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const reqId = btn.dataset.id;
        await updateDoc(doc(db, "requests", reqId), { status: "done" });
        tbody.innerHTML = "";
        totalEl.textContent = "0";
        await loadRequests();
      });
    });

  } catch (err) {
    console.error("요청 로드 실패:", err);
  }
}
