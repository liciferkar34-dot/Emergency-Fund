import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  addDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
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

// Role Badge Styling: Admin = Red Highlight, Co-Admin = Yellow Highlight, Member = Mint Green
export function getRoleBadgeClasses(role) {
  const r = (role || "member").toLowerCase();
  if (r === "admin") {
    return "bg-red-600 text-white border border-red-300 shadow-sm";
  }
  if (r === "co_admin") {
    return "bg-amber-400 text-slate-950 border border-amber-200 shadow-sm";
  }
  return "bg-[#5CDDAB] text-[#013A20]";
}

export function applyRoleBadge(el, role) {
  if (!el) return;
  const r = (role || "member").toLowerCase();
  el.textContent = r === "co_admin" ? "CO-ADMIN" : r.toUpperCase();
  el.className = `px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${getRoleBadgeClasses(r)}`;
}

// High-End Animated Banking Popup Modal
export function showFintechPopup({ titleBn, titleEn, msgBn, msgEn, type = "success", actionUrl = "", actionLabelBn = "", actionLabelEn = "" }) {
  let modal = document.getElementById("fintech-fancy-popup");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "fintech-fancy-popup";
    modal.className = "fixed inset-0 bg-black/70 backdrop-blur-md z-[95] flex items-center justify-center p-4";
    modal.innerHTML = `
      <div class="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden animate-pop-in border border-emerald-200/60">
        <div id="ffp-banner" class="fintech-gradient pt-6 pb-8 px-6 text-center text-white relative">
          <div id="ffp-icon-wrap" class="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl shadow-xl border-2 border-white/25"></div>
          <span class="inline-block px-2.5 py-0.5 rounded-full bg-white/15 text-[#5CDDAB] text-[10px] font-extrabold tracking-widest uppercase">
            PEER FUND VERIFIED
          </span>
        </div>
        <div class="p-6 text-center -mt-3 bg-white rounded-t-3xl relative">
          <h3 id="ffp-title" class="text-xl font-extrabold text-[#0A3C2A] mb-2"></h3>
          <p id="ffp-msg" class="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6"></p>
          <div class="flex gap-2.5">
            <button id="ffp-close-btn" class="flex-1 py-3 rounded-2xl mint-btn text-sm font-extrabold">OK / ঠিক আছে</button>
            <a id="ffp-action-btn" href="#" class="hidden flex-1 py-3 rounded-2xl bg-[#0A3C2A] text-[#5CDDAB] font-extrabold text-sm flex items-center justify-center shadow"></a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const lang = getLang();
  const banner = document.getElementById("ffp-banner");
  const iconWrap = document.getElementById("ffp-icon-wrap");
  if (type === "error") {
    banner.className = "bg-gradient-to-br from-red-800 to-red-950 pt-6 pb-8 px-6 text-center text-white relative";
    iconWrap.className = "w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl shadow-xl bg-red-500 text-white border-2 border-white/30";
    iconWrap.textContent = "⚠️";
  } else if (type === "info") {
    banner.className = "bg-gradient-to-br from-amber-700 to-amber-950 pt-6 pb-8 px-6 text-center text-white relative";
    iconWrap.className = "w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl shadow-xl bg-amber-400 text-slate-950 border-2 border-white/30";
    iconWrap.textContent = "🔔";
  } else {
    banner.className = "fintech-gradient pt-6 pb-8 px-6 text-center text-white relative";
    iconWrap.className = "w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl shadow-xl bg-[#5CDDAB] text-[#013A20] border-2 border-white/40 font-extrabold";
    iconWrap.textContent = "✓";
  }

  document.getElementById("ffp-title").textContent = lang === "bn" ? titleBn : titleEn;
  document.getElementById("ffp-msg").textContent = lang === "bn" ? msgBn : msgEn;

  const actionBtn = document.getElementById("ffp-action-btn");
  if (actionUrl) {
    actionBtn.href = actionUrl;
    actionBtn.textContent = lang === "bn" ? (actionLabelBn || "দেখুন →") : (actionLabelEn || "Open →");
    actionBtn.classList.remove("hidden");
  } else {
    actionBtn.classList.add("hidden");
  }

  modal.classList.remove("hidden");
  document.getElementById("ffp-close-btn").onclick = () => {
    modal.classList.add("hidden");
  };
}

// High-End Animated Fintech Input Popup Modal (Replaces plain browser prompt)
export function showFintechInputPopup({
  titleBn,
  titleEn,
  subBn = "",
  subEn = "",
  placeholderBn = "",
  placeholderEn = "",
  initialValue = "",
  inputType = "text", // "pin" | "textarea" | "text"
  icon = "✨",
  badgeText = "PEER FUND",
  confirmBn = "সেভ করুন",
  confirmEn = "Save",
  validateFn = null // (val, lang) => errorStringOrNull
}) {
  return new Promise((resolve) => {
    let modal = document.getElementById("fintech-input-popup");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fintech-input-popup";
      modal.className = "fixed inset-0 bg-black/70 backdrop-blur-md z-[96] flex items-center justify-center p-4";
      modal.innerHTML = `
        <div class="bg-white rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden animate-pop-in border border-emerald-200/60">
          <div class="fintech-gradient pt-5 pb-7 px-6 text-center text-white relative">
            <div id="fip-icon" class="w-14 h-14 rounded-2xl mx-auto mb-2.5 flex items-center justify-center text-2xl shadow-xl bg-[#5CDDAB] text-[#013A20] border-2 border-white/40 font-extrabold"></div>
            <span id="fip-badge" class="inline-block px-2.5 py-0.5 rounded-full bg-white/15 text-[#5CDDAB] text-[10px] font-extrabold tracking-widest uppercase"></span>
          </div>
          <div class="p-6 -mt-3 bg-white rounded-t-3xl relative">
            <h3 id="fip-title" class="text-lg font-extrabold text-[#0A3C2A] text-center mb-1"></h3>
            <p id="fip-sub" class="text-xs text-gray-500 text-center mb-4 leading-relaxed"></p>
            <div id="fip-field-wrap" class="mb-2"></div>
            <p id="fip-err" class="hidden text-xs text-red-600 font-bold text-center mb-3"></p>
            <div class="flex gap-2.5 mt-4">
              <button type="button" id="fip-cancel-btn" class="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-extrabold transition">Cancel / বাতিল</button>
              <button type="button" id="fip-confirm-btn" class="flex-1 py-3 rounded-2xl mint-btn text-xs sm:text-sm font-extrabold"></button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const lang = getLang();
    document.getElementById("fip-icon").textContent = icon;
    document.getElementById("fip-badge").textContent = badgeText;
    document.getElementById("fip-title").textContent = lang === "bn" ? titleBn : titleEn;

    const subEl = document.getElementById("fip-sub");
    const subText = lang === "bn" ? subBn : subEn;
    subEl.textContent = subText;
    subEl.classList.toggle("hidden", !subText);

    const errEl = document.getElementById("fip-err");
    errEl.classList.add("hidden");
    errEl.textContent = "";

    const wrap = document.getElementById("fip-field-wrap");
    const ph = lang === "bn" ? placeholderBn : placeholderEn;

    if (inputType === "pin") {
      wrap.innerHTML = `<input type="password" id="fip-input" maxlength="4" inputmode="numeric" pattern="[0-9]*" placeholder="••••"
        class="w-full text-center tracking-[0.6em] font-extrabold text-2xl py-3 rounded-2xl border-2 border-emerald-200 focus:outline-none focus:border-[#0A3C2A] bg-emerald-50/40 text-[#0A3C2A]" />`;
    } else if (inputType === "textarea") {
      wrap.innerHTML = `<textarea id="fip-input" rows="3" placeholder="${ph}"
        class="w-full px-3.5 py-2.5 rounded-2xl border-2 border-emerald-200 focus:outline-none focus:border-[#0A3C2A] text-sm bg-emerald-50/30 text-gray-900"></textarea>`;
    } else {
      wrap.innerHTML = `<input type="text" id="fip-input" placeholder="${ph}"
        class="w-full px-3.5 py-2.5 rounded-2xl border-2 border-emerald-200 focus:outline-none focus:border-[#0A3C2A] text-sm bg-emerald-50/30 text-gray-900" />`;
    }

    const inputEl = document.getElementById("fip-input");
    inputEl.value = initialValue || "";

    const confirmBtn = document.getElementById("fip-confirm-btn");
    confirmBtn.textContent = lang === "bn" ? confirmBn : confirmEn;

    modal.classList.remove("hidden");
    setTimeout(() => {
      inputEl.focus();
      if (inputType !== "pin" && inputEl.value) {
        inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
      }
    }, 80);

    const cleanup = (val) => {
      modal.classList.add("hidden");
      resolve(val);
    };

    const submitHandler = () => {
      const val = inputEl.value;
      if (validateFn) {
        const errMsg = validateFn(val, lang);
        if (errMsg) {
          errEl.textContent = errMsg;
          errEl.classList.remove("hidden");
          inputEl.focus();
          return;
        }
      }
      cleanup(val);
    };

    document.getElementById("fip-cancel-btn").onclick = () => cleanup(null);
    confirmBtn.onclick = submitHandler;
    inputEl.onkeydown = (e) => {
      if (e.key === "Enter" && inputType !== "textarea") {
        e.preventDefault();
        submitHandler();
      }
    };
  });
}

// Send Real-Time Group Notification
export async function sendGroupNotification({ titleBn, titleEn, bodyBn, bodyEn, targetPage = "dashboard.html", actorUid = "" }) {
  try {
    await addDoc(collection(db, "notifications"), {
      titleBn,
      titleEn,
      bodyBn,
      bodyEn,
      targetPage,
      actorUid,
      createdAt: serverTimestamp(),
      timestampIso: new Date().toISOString()
    });
  } catch (e) {
    console.error("Notification write error:", e);
  }
}

// Initialize Notification Bell & Live Listener across all authenticated pages
export function initNotificationCenter(currentUid, isAdmin = false) {
  const bellBtns = document.querySelectorAll(".notif-bell-btn");
  if (bellBtns.length === 0) return;

  let modal = document.getElementById("global-notif-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "global-notif-modal";
    modal.className = "hidden fixed inset-0 bg-black/65 backdrop-blur-sm z-[85] flex items-center justify-center p-4";
    modal.innerHTML = `
      <div class="fintech-card w-full max-w-md p-5 max-h-[85vh] flex flex-col animate-pop-in">
        <div class="flex justify-between items-center pb-3 mb-3 border-b border-gray-100">
          <h3 class="font-extrabold text-base text-[#0A3C2A] flex items-center gap-2">
            <span>🔔</span><span data-i18n="notifTitle">${t("notifTitle")}</span>
          </h3>
          <button id="close-notif-modal" class="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold">✕</button>
        </div>
        <button id="enable-push-btn" class="mb-3 w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#0A3C2A] font-bold text-xs hover:bg-emerald-100 transition">
          📲 <span data-i18n="enableBrowserNotif">${t("enableBrowserNotif")}</span>
        </button>
        <div id="notif-items-list" class="space-y-2.5 overflow-y-auto flex-1 pr-1"></div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("close-notif-modal").addEventListener("click", () => {
      modal.classList.add("hidden");
    });
    document.getElementById("enable-push-btn").addEventListener("click", async () => {
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          showFintechPopup({
            titleBn: "নোটিফিকেশন চালু হয়েছে!",
            titleEn: "Notifications Enabled!",
            msgBn: "এখন থেকে লোন বা মাসিক চাঁদা জমা হলেই আপনার ফোনে নোটিফিকেশন চলে আসবে।",
            msgEn: "You will now receive instant alerts for loans and monthly deposits."
          });
        }
      }
    });
  }

  let notifList = [];
  let initialLoad = true;
  const pageLoadIso = new Date().toISOString();

  function updateBellBadges() {
    const lastSeen = localStorage.getItem("peerfund_last_seen_notif") || "1970-01-01T00:00:00.000Z";
    const unread = notifList.filter((n) => (n.timestampIso || "") > lastSeen).length;
    document.querySelectorAll(".notif-badge").forEach((badge) => {
      if (unread > 0) {
        badge.textContent = unread > 9 ? "9+" : String(unread);
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    });
  }

  function renderNotifList() {
    const container = document.getElementById("notif-items-list");
    if (!container) return;
    const lang = getLang();
    if (notifList.length === 0) {
      container.innerHTML = `<p class="text-xs text-gray-500 text-center py-8">${t("notifEmpty")}</p>`;
      return;
    }
    container.innerHTML = notifList.map((n) => {
      const title = lang === "bn" ? (n.titleBn || n.titleEn) : (n.titleEn || n.titleBn);
      const body = lang === "bn" ? (n.bodyBn || n.bodyEn) : (n.bodyEn || n.bodyBn);
      const timeStr = n.timestampIso ? new Date(n.timestampIso).toLocaleString("en-IN") : "";
      return `
        <div class="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 flex items-start justify-between gap-2">
          <a href="${n.targetPage || "dashboard.html"}" class="block flex-1 min-w-0">
            <div class="flex justify-between items-start gap-2">
              <p class="font-extrabold text-xs sm:text-sm text-[#0A3C2A]">${title}</p>
              <span class="text-[10px] text-gray-400 shrink-0">${timeStr}</span>
            </div>
            <p class="text-xs text-gray-700 mt-1 leading-relaxed">${body}</p>
            <p class="text-[11px] font-bold text-emerald-700 mt-1.5">${t("tapToOpenPage")}</p>
          </a>
          ${isAdmin ? `<button data-nid="${n.id}" class="del-notif-btn p-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold shrink-0" title="Delete">🗑️</button>` : ""}
        </div>
      `;
    }).join("");

    container.querySelectorAll(".del-notif-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteDoc(doc(db, "notifications", btn.dataset.nid));
      });
    });
  }

  onSnapshot(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(30)), (snap) => {
    notifList = [];
    snap.forEach((d) => notifList.push({ id: d.id, ...d.data() }));
    updateBellBadges();
    renderNotifList();

    if (!initialLoad && notifList.length > 0) {
      const newest = notifList[0];
      if ((newest.timestampIso || "") > pageLoadIso && newest.actorUid !== currentUid) {
        const lang = getLang();
        const title = lang === "bn" ? newest.titleBn : newest.titleEn;
        const body = lang === "bn" ? newest.bodyBn : newest.bodyEn;
        if ("Notification" in window && Notification.permission === "granted") {
          const push = new Notification(title, { body, icon: "./icon.svg" });
          push.onclick = () => {
            window.focus();
            window.location.href = newest.targetPage || "dashboard.html";
          };
        }
      }
    }
    initialLoad = false;
  });

  bellBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      localStorage.setItem("peerfund_last_seen_notif", new Date().toISOString());
      updateBellBadges();
      renderNotifList();
      modal.classList.remove("hidden");
    });
  });

  window.addEventListener("languageChanged", renderNotifList);
}

// Write Audit Log Entry
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

// Universal Undo / Redo Manager
const undoStack = [];
const redoStack = [];

export function pushUndoAction(action) {
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
        showFintechPopup({ type: "error", titleBn: "Undo ত্রুটি", titleEn: "Undo Error", msgBn: e.message, msgEn: e.message });
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
        showFintechPopup({ type: "error", titleBn: "Redo ত্রুটি", titleEn: "Redo Error", msgBn: e.message, msgEn: e.message });
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
        <div class="fintech-card w-full max-w-md p-6 animate-pop-in">
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
  if (!savedPin || !/^[0-9]{4}$/.test(savedPin) || unlocked === "1") return;

  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 fintech-gradient z-[100] flex items-center justify-center p-4 text-white";
  overlay.innerHTML = `
    <div class="fintech-card w-full max-w-xs p-6 text-center text-gray-900 animate-pop-in">
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
  setTimeout(() => inp.focus(), 100);
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
      } else {
        initNotificationCenter(user.uid, userData.role === "admin");
      }
      onReady(user, userData);
    } catch (err) {
      console.error("Auth check error:", err);
    }
  });
}


// Automatic Logout after 30 Minutes of Inactivity
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let inactivityWatcherStarted = false;

export function startInactivityAutoLogout() {
  if (inactivityWatcherStarted) return;
  inactivityWatcherStarted = true;

  const KEY = "peerfund_last_activity_ts";
  const now = Date.now();
  const existing = Number(localStorage.getItem(KEY) || 0);

  // If already expired before page opened, log out immediately
  if (existing > 0 && now - existing >= INACTIVITY_TIMEOUT_MS) {
    performAutoLogout();
    return;
  }

  localStorage.setItem(KEY, String(now));

  let lastWrite = now;
  const recordActivity = () => {
    const tNow = Date.now();
    // Check if already timed out before updating timestamp
    const prev = Number(localStorage.getItem(KEY) || tNow);
    if (tNow - prev >= INACTIVITY_TIMEOUT_MS) {
      performAutoLogout();
      return;
    }
    if (tNow - lastWrite > 5000) {
      lastWrite = tNow;
      localStorage.setItem(KEY, String(tNow));
    }
  };

  ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"].forEach((evt) => {
    window.addEventListener(evt, recordActivity, { passive: true });
  });

  const checkTimeout = () => {
    const last = Number(localStorage.getItem(KEY) || Date.now());
    if (Date.now() - last >= INACTIVITY_TIMEOUT_MS) {
      performAutoLogout();
    }
  };

  setInterval(checkTimeout, 15000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkTimeout();
    }
  });
}

async function performAutoLogout() {
  try {
    localStorage.removeItem("peerfund_last_activity_ts");
    sessionStorage.removeItem("peerfund_pin_unlocked");
    await signOut(auth);
  } catch (_) {}
  window.location.href = "login.html?timeout=1";
}

export function setupCommonUI() {
  initUndoRedoControls();
  startInactivityAutoLogout();
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
