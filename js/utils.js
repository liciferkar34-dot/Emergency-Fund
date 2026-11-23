import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { t, getLang } from "./i18n.js";

export function formatINR(num) {
  const n = Number(num || 0);
  const prefix = n < 0 ? "-₹" : "₹";
  return prefix + Math.abs(n).toLocaleString("en-IN");
}

export function getCurrentMonthKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export function isAfterDueDay(dueDay = 5) {
  return new Date().getDate() > Number(dueDay || 5);
}

// Write Immutable Audit Log Entry
export async function logAudit({ actionType, messageBn, messageEn, remark = "", actorUid, actorName, actorRole, meta = {} }) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      actionType,
      messageBn,
      messageEn,
      remark,
      actorUid: actorUid || "system",
      actorName: actorName || "System",
      actorRole: actorRole || "system",
      meta,
      createdAt: serverTimestamp(),
      timestampIso: new Date().toISOString()
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

// Universal Undo / Redo Manager (Persisted in sessionStorage so Undo/Redo works across actions)
const undoStack = [];
const redoStack = [];

export function pushUndoAction(action) {
  // action = { labelBn, labelEn, undoFn: async () => {}, redoFn: async () => {} }
  undoStack.push(action);
  redoStack.length = 0;
  renderUndoRedoBar();
}

export function renderUndoRedoBar() {
  const bar = document.getElementById("undo-redo-bar");
  if (!bar) return;
  const undoBtn = document.getElementById("global-undo-btn");
  const redoBtn = document.getElementById("global-redo-btn");
  const labelEl = document.getElementById("undo-redo-label");

  if (undoStack.length === 0 && redoStack.length === 0) {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");

  if (undoBtn) {
    undoBtn.disabled = undoStack.length === 0;
    undoBtn.classList.toggle("opacity-40", undoStack.length === 0);
  }
  if (redoBtn) {
    redoBtn.disabled = redoStack.length === 0;
    redoBtn.classList.toggle("opacity-40", redoStack.length === 0);
  }
  if (labelEl) {
    const lang = getLang();
    const top = undoStack[undoStack.length - 1] || redoStack[redoStack.length - 1];
    labelEl.textContent = top ? (lang === "bn" ? top.labelBn : top.labelEn) : "";
  }
}

export function initUndoRedoControls() {
  const undoBtn = document.getElementById("global-undo-btn");
  const redoBtn = document.getElementById("global-redo-btn");
  if (undoBtn) {
    undoBtn.addEventListener("click", async () => {
      if (undoStack.length === 0) return;
      const act = undoStack.pop();
      undoBtn.disabled = true;
      try {
        await act.undoFn();
        redoStack.push(act);
      } catch (e) {
        alert("Undo error: " + e.message);
      }
      renderUndoRedoBar();
    });
  }
  if (redoBtn) {
    redoBtn.addEventListener("click", async () => {
      if (redoStack.length === 0) return;
      const act = redoStack.pop();
      redoBtn.disabled = true;
      try {
        await act.redoFn();
        undoStack.push(act);
      } catch (e) {
        alert("Redo error: " + e.message);
      }
      renderUndoRedoBar();
    });
  }
  window.addEventListener("languageChanged", renderUndoRedoBar);
}

// Reusable Bilingual Remarks / Reason Modal
export function askForRemarks({ titleBn, titleEn, required = true } = {}) {
  return new Promise((resolve) => {
    let modal = document.getElementById("global-remarks-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "global-remarks-modal";
      modal.className = "fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4";
      modal.innerHTML = `
        <div class="fintech-card w-full max-w-md p-6">
          <h3 id="grm-title" class="text-lg font-extrabold text-[#0A3C2A] mb-1"></h3>
          <p class="text-xs text-gray-500 mb-3" data-i18n="remarksModalSub">${t("remarksModalSub")}</p>
          <textarea id="grm-input" rows="3" class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0A3C2A] mb-3" placeholder="${t("remarksInputPh")}"></textarea>
          <p id="grm-err" class="hidden text-xs text-red-600 font-bold mb-2">দয়া করে কারণ লিখুন / Please enter a remark.</p>
          <div class="flex gap-2">
            <button type="button" id="grm-cancel" class="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs">${t("cancelBtn")}</button>
            <button type="button" id="grm-confirm" class="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs">${t("confirmActionBtn")}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const lang = getLang();
    document.getElementById("grm-title").textContent =
      lang === "bn" ? (titleBn || t("remarksModalTitle")) : (titleEn || t("remarksModalTitle"));
    const input = document.getElementById("grm-input");
    const err = document.getElementById("grm-err");
    input.value = "";
    input.placeholder = t("remarksInputPh");
    err.classList.add("hidden");
    modal.classList.remove("hidden");
    input.focus();

    const cleanup = (val) => {
      modal.classList.add("hidden");
      resolve(val);
    };

    document.getElementById("grm-cancel").onclick = () => cleanup(null);
    document.getElementById("grm-confirm").onclick = () => {
      const val = input.value.trim();
      if (required && !val) {
        err.classList.remove("hidden");
        return;
      }
      cleanup(val || "No remarks");
    };
  });
}

// 4-Digit App PIN Lock Check
export function enforcePinLock() {
  const savedPin = localStorage.getItem("peerfund_app_pin");
  const unlocked = sessionStorage.getItem("peerfund_pin_unlocked");
  if (!savedPin || unlocked === "1") return;

  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 fintech-gradient z-[100] flex items-center justify-center p-4 text-white";
  overlay.innerHTML = `
    <div class="fintech-card w-full max-w-xs p-6 text-center text-gray-900">
      <div class="w-12 h-12 rounded-2xl fintech-gradient text-[#5CDDAB] flex items-center justify-center font-extrabold text-xl mx-auto mb-3">🔒</div>
      <h2 class="font-extrabold text-lg text-[#0A3C2A]">App PIN Lock</h2>
      <p class="text-xs text-gray-500 mb-4">৪ সংখ্যার সিকিউরিটি PIN দিন / Enter 4-digit PIN</p>
      <input type="password" id="pin-unlock-input" maxlength="4" inputmode="numeric" placeholder="••••"
        class="w-full text-center tracking-[0.6em] font-extrabold text-xl py-2.5 rounded-xl border border-gray-300 mb-3 focus:outline-none focus:border-[#0A3C2A]" />
      <p id="pin-unlock-err" class="hidden text-xs text-red-600 font-bold mb-2">ভুল PIN / Incorrect PIN</p>
      <button id="pin-unlock-btn" class="w-full mint-btn py-2.5 rounded-xl text-sm">Unlock</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const inp = overlay.querySelector("#pin-unlock-input");
  const check = () => {
    if (inp.value === savedPin) {
      sessionStorage.setItem("peerfund_pin_unlocked", "1");
      overlay.remove();
    } else {
      overlay.querySelector("#pin-unlock-err").classList.remove("hidden");
      inp.value = "";
    }
  };
  overlay.querySelector("#pin-unlock-btn").addEventListener("click", check);
  inp.addEventListener("keyup", (e) => {
    if (inp.value.length === 4 || e.key === "Enter") check();
  });
}

// Compress uploaded image to lightweight Base64 JPEG
export function compressImageToBase64(file, maxWidth = 600, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.type === "application/pdf") {
      if (file.size > 750 * 1024) {
        return reject(new Error("PDF size must be under 750KB"));
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function requireApprovedUser(onReady) {
  enforcePinLock();
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        window.location.href = "login.html";
        return;
      }
      const userData = { uid: user.uid, ...snap.data() };
      if (userData.approvalStatus !== "approved") {
        if (!window.location.pathname.endsWith("dashboard.html")) {
          window.location.href = "dashboard.html";
          return;
        }
      }
      onReady(user, userData);
    } catch (err) {
      console.error("Auth check error:", err);
    }
  });
}

export function setupCommonUI() {
  initUndoRedoControls();
  document.querySelectorAll(".logout-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      sessionStorage.removeItem("peerfund_pin_unlocked");
      await signOut(auth);
      window.location.href = "index.html";
    });
  });

  const updateOnlineStatus = () => {
    const banner = document.getElementById("offline-banner");
    if (!banner) return;
    if (navigator.onLine) {
      banner.classList.add("hidden");
    } else {
      banner.classList.remove("hidden");
    }
  };
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();
}

export function generatePaymentReceiptPDF(tx) {
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();

  docPdf.setFillColor(10, 60, 42);
  docPdf.rect(0, 0, 210, 42, "F");

  docPdf.setTextColor(92, 221, 171);
  docPdf.setFontSize(20);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("PEER FUND - EMERGENCY MUTUAL FUND", 15, 19);

  docPdf.setTextColor(255, 255, 255);
  docPdf.setFontSize(11);
  docPdf.setFont("helvetica", "normal");
  docPdf.text("OFFICIAL VERIFIED CONTRIBUTION RECEIPT", 15, 29);

  docPdf.setTextColor(20, 40, 30);
  docPdf.setFontSize(11);
  let y = 58;
  const rows = [
    ["Receipt ID:", tx.id || "PF-TX"],
    ["Member Name:", tx.userName || "-"],
    ["Member ID:", tx.memberId || "-"],
    ["Contribution Month:", tx.month || "-"],
    ["Amount:", `INR ${Number(tx.amount || 1000).toLocaleString("en-IN")}`],
    ["Payment Mode:", tx.mode || "UPI"],
    ["UTR / Reference No:", tx.utr || "CASH-VERIFIED"],
    ["Verified By:", tx.verifiedBy || "Admin"],
    ["Verification Date:", tx.verifiedAt ? new Date(tx.verifiedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN")],
    ["Status:", "VERIFIED & CREDITED"]
  ];

  rows.forEach(([label, val]) => {
    docPdf.setFont("helvetica", "bold");
    docPdf.text(label, 20, y);
    docPdf.setFont("helvetica", "normal");
    docPdf.text(String(val), 85, y);
    docPdf.setDrawColor(230, 240, 235);
    docPdf.line(20, y + 3, 190, y + 3);
    y += 12;
  });

  docPdf.setFontSize(9);
  docPdf.setTextColor(100, 115, 110);
  docPdf.text("This is a system-generated immutable digital receipt from Peer Fund.", 20, y + 12);

  docPdf.save(`PeerFund_Receipt_${tx.userName || "Member"}_${tx.month || "Payment"}.pdf`);
}

export function generateMonthlyStatementPDF({ members, totalCollected, totalDisbursed, availableBalance, targetAmount }) {
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();

  docPdf.setFillColor(10, 60, 42);
  docPdf.rect(0, 0, 210, 40, "F");

  docPdf.setTextColor(92, 221, 171);
  docPdf.setFontSize(18);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("PEER FUND - MONTHLY GROUP STATEMENT", 15, 18);

  docPdf.setTextColor(255, 255, 255);
  docPdf.setFontSize(10);
  docPdf.setFont("helvetica", "normal");
  docPdf.text(`Generated On: ${new Date().toLocaleString("en-IN")} | Active Members: ${members.length}`, 15, 28);

  docPdf.setTextColor(20, 40, 30);
  docPdf.setFontSize(11);
  docPdf.setFont("helvetica", "bold");
  docPdf.text(`Total Collected: INR ${totalCollected.toLocaleString("en-IN")}`, 15, 52);
  docPdf.text(`Active Loans Out: INR ${totalDisbursed.toLocaleString("en-IN")}`, 110, 52);
  docPdf.text(`Available Balance: INR ${availableBalance.toLocaleString("en-IN")}`, 15, 61);
  docPdf.text(`6-Month Target: INR ${targetAmount.toLocaleString("en-IN")}`, 110, 61);

  let y = 76;
  docPdf.setFillColor(235, 247, 241);
  docPdf.rect(15, y - 6, 180, 9, "F");
  docPdf.setFontSize(9.5);
  docPdf.text("Member Name", 18, y);
  docPdf.text("ID", 75, y);
  docPdf.text("Role", 102, y);
  docPdf.text("Total Paid", 132, y);
  docPdf.text("Pending Fine", 165, y);
  y += 10;

  docPdf.setFont("helvetica", "normal");
  members.forEach((m) => {
    if (y > 275) {
      docPdf.addPage();
      y = 20;
    }
    docPdf.text(String(m.name || "-").slice(0, 24), 18, y);
    docPdf.text(String(m.memberId || "-"), 75, y);
    docPdf.text(String(m.role || "member").toUpperCase(), 102, y);
    docPdf.text(`INR ${Number(m.totalPaid || 0).toLocaleString("en-IN")}`, 132, y);
    docPdf.text(`INR ${Number(m.pendingFine || 0).toLocaleString("en-IN")}`, 165, y);
    docPdf.setDrawColor(235, 240, 238);
    docPdf.line(15, y + 3, 195, y + 3);
    y += 9;
  });

  docPdf.save(`PeerFund_Monthly_Statement_${getCurrentMonthKey()}.pdf`);
}
