import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, enableIndexedDbPersistence, doc, getDoc, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL, ADMIN_PHONE } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { ADMIN_EMAIL, ADMIN_PHONE };

// Enable offline persistence for cached balances without internet
enableIndexedDbPersistence(db).catch(() => {});

// Bilingual Dictionary
export const I18N = {
  en: {
    appName: "Peer Fund",
    tagline: "Emergency Mutual Fund",
    login: "Login",
    register: "Register",
    emailOrPhone: "Email ID or 10-Digit Mobile",
    password: "Password",
    confirmPassword: "Retype Password",
    fullName: "Full Name",
    email: "Email ID",
    phone: "10-Digit Mobile Number",
    forgotPw: "Forgot Password?",
    resetPw: "Reset Password",
    sendReset: "Send Reset Link",
    home: "Home",
    ledger: "Ledger",
    loans: "Loans",
    profile: "Profile",
    totalBalance: "Available Corpus Balance",
    collected: "Total Collected",
    disbursed: "Total Disbursed",
    payUpi: "Pay ₹1,000 (UPI)",
    requestFund: "Request Fund",
    members: "Members",
    auditLog: "Audit Log",
    monthlyPdf: "Monthly PDF",
    rules: "Rules",
    recentActivity: "Recent Verified Activity",
    pendingApprovalTitle: "Pending Admin Approval",
    pendingApprovalMsg: "Your account has been created and is waiting for Admin approval. Once approved, you can access the Peer Fund dashboard.",
    logout: "Logout",
    active: "Active",
    pending: "Pending",
    overdue: "Overdue",
    approve: "Approve",
    reject: "Reject",
    waMsg: "Hi, your ₹1,000 Peer Fund contribution for this month is pending. Please pay via UPI from the app."
  },
  bn: {
    appName: "পিয়ার ফান্ড",
    tagline: "ইমার্জেন্সি মিউচুয়াল ফান্ড",
    login: "লগইন",
    register: "রেজিস্ট্রেশন",
    emailOrPhone: "ইমেইল বা ১০ সংখ্যার মোবাইল নম্বর",
    password: "পাসওয়ার্ড",
    confirmPassword: "পুনরায় পাসওয়ার্ড দিন",
    fullName: "সম্পূর্ণ নাম",
    email: "ইমেইল আইডি",
    phone: "১০ সংখ্যার মোবাইল নম্বর",
    forgotPw: "পাসওয়ার্ড ভুলে গেছেন?",
    resetPw: "পাসওয়ার্ড রিসেট",
    sendReset: "রিসেট লিংক পাঠান",
    home: "হোম",
    ledger: "হিসাব",
    loans: "আবেদন",
    profile: "অ্যাকাউন্ট",
    totalBalance: "মোট ফান্ডের ব্যালেন্স",
    collected: "মোট জমা",
    disbursed: "প্রদত্ত লোন",
    payUpi: "₹১,০০০ জমা দিন (UPI)",
    requestFund: "ফান্ড রিকোয়েস্ট",
    members: "সদস্যরা",
    auditLog: "অডিট লগ",
    monthlyPdf: "মাসিক PDF",
    rules: "নিয়মাবলী",
    recentActivity: "সাম্প্রতিক ভেরিফায়েড লেনদেন",
    pendingApprovalTitle: "অ্যাডমিন অনুমোদনের অপেক্ষায়",
    pendingApprovalMsg: "আপনার অ্যাকাউন্ট তৈরি হয়েছে এবং অ্যাডমিনের অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন পেলে আপনি ফান্ডের সমস্ত হিসাব দেখতে পারবেন।",
    logout: "লগআউট",
    active: "সক্রিয়",
    pending: "অপেক্ষারত",
    overdue: "বকেয়া",
    approve: "অনুমোদন",
    reject: "বাতিল",
    waMsg: "ভাই, এই মাসের ₹১,০০০ ফান্ডের চাঁদা বাকি আছে, অ্যাপ থেকে UPI করে দিও।"
  }
};

export function getLang() {
  return localStorage.getItem("pf_lang") || "en";
}

export function setLang(lang) {
  localStorage.setItem("pf_lang", lang);
  applyTranslations();
  window.dispatchEvent(new CustomEvent("pf-lang-change", { detail: lang }));
}

export function toggleLang() {
  setLang(getLang() === "en" ? "bn" : "en");
}

export function t(key) {
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}

export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = t(k);
    } else {
      el.textContent = t(k);
    }
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.textContent = getLang() === "en" ? "বাংলা" : "EN";
  });
}

export function showToast(msg, duration = 3000) {
  let el = document.getElementById("pf-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "pf-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), duration);
}

export function formatINR(num) {
  const n = Number(num || 0);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function getGreeting() {
  const h = new Date().getHours();
  const bn = getLang() === "bn";
  if (h < 12) return bn ? "শুভ সকাল," : "Good morning,";
  if (h < 17) return bn ? "শুভ অপরাহ্ণ," : "Good afternoon,";
  return bn ? "শুভ সন্ধ্যা," : "Good evening,";
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getInitials(name) {
  return (name || "PF").trim().split(/\s+/).map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

export function renderAvatar(user, extraClass = "") {
  if (user && user.photoBase64) {
    return `<img src="${user.photoBase64}" class="avatar ${extraClass}" alt="Avatar">`;
  }
  return `<div class="avatar ${extraClass}">${getInitials(user?.name)}</div>`;
}

// SHA-256 helper for 4-digit PIN Lock
export async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// 4-Digit PIN Lock Gate (runs once per session if user enabled PIN)
export function initPinLock() {
  const savedHash = localStorage.getItem("pf_pin_hash");
  if (!savedHash || sessionStorage.getItem("pf_pin_unlocked") === "1") return;

  const overlay = document.createElement("div");
  overlay.className = "pin-overlay open";
  overlay.innerHTML = `
    <div class="brand-logo" style="width:54px;height:54px;font-size:22px;margin-bottom:12px;">PF</div>
    <h2 style="font-size:20px;">${getLang() === "bn" ? "৪ সংখ্যার পিন দিন" : "Enter 4-Digit App PIN"}</h2>
    <p style="font-size:12px;opacity:.8;margin-top:4px;">Peer Fund Security Lock</p>
    <div class="pin-dots" id="pin-dots">
      <div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div><div class="pin-dot"></div>
    </div>
    <div class="pin-pad">
      ${[1,2,3,4,5,6,7,8,9,"C",0,"⌫"].map(k => `<button class="pin-key" data-k="${k}">${k}</button>`).join("")}
    </div>
  `;
  document.body.appendChild(overlay);

  let entered = "";
  const updateDots = () => {
    overlay.querySelectorAll(".pin-dot").forEach((d, i) => d.classList.toggle("filled", i < entered.length));
  };

  overlay.querySelectorAll(".pin-key").forEach(btn => {
    btn.addEventListener("click", async () => {
      const k = btn.dataset.k;
      if (k === "C") entered = "";
      else if (k === "⌫") entered = entered.slice(0, -1);
      else if (entered.length < 4) entered += k;
      updateDots();
      if (entered.length === 4) {
        const h = await sha256(entered);
        if (h === savedHash) {
          sessionStorage.setItem("pf_pin_unlocked", "1");
          overlay.remove();
        } else {
          showToast(getLang() === "bn" ? "ভুল পিন! আবার চেষ্টা করুন" : "Incorrect PIN! Try again");
          entered = "";
          updateDots();
        }
      }
    });
  });
}

// Auth Guard for Protected Pages
export function requireApprovedUser(callback) {
  applyTranslations();
  initPinLock();
  onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      window.location.href = "index.html";
      return;
    }
    try {
      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (!snap.exists()) {
        await signOut(auth);
        window.location.href = "index.html";
        return;
      }
      const userData = { uid: fbUser.uid, ...snap.data() };
      if (userData.approvalStatus !== "approved") {
        window.location.href = "index.html?pending=1";
        return;
      }
      callback(userData);
    } catch (err) {
      console.error(err);
      showToast("Error loading profile: " + err.message);
    }
  });
}

// Immutable Audit Log Writer
export async function writeAuditLog(actor, action, detailsEn, detailsBn) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      actorUid: actor.uid,
      actorName: actor.name || actor.email,
      actorRole: actor.role || "member",
      action,
      detailsEn,
      detailsBn: detailsBn || detailsEn,
      createdAt: serverTimestamp(),
      clientTime: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Audit log error:", e);
  }
}

// Compress Image to Lightweight Base64 (for Profile Picture, Payment Screenshot, Loan Proof)
export function compressImageToBase64(file, maxDim = 420, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (file.type === "application/pdf") {
      if (file.size > 450 * 1024) {
        return reject(new Error("PDF must be under 450 KB for inline storage."));
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > h && w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// PDF Receipt Generator (requires jsPDF loaded on page)
export function downloadReceiptPDF(tx) {
  if (!window.jspdf) { showToast("PDF engine loading..."); return; }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdf.setFillColor(10, 60, 42);
  pdf.rect(0, 0, 210, 36, "F");
  pdf.setTextColor(92, 221, 171);
  pdf.setFontSize(20);
  pdf.text("PEER FUND — PAYMENT RECEIPT", 15, 20);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text("Emergency Mutual Fund • Verified Digital Receipt", 15, 29);

  pdf.setTextColor(20, 40, 30);
  pdf.setFontSize(12);
  const rows = [
    ["Receipt ID", tx.id || "N/A"],
    ["Member Name", tx.userName || "N/A"],
    ["Type", tx.type || "Monthly Deposit"],
    ["Amount Paid", "INR " + Number(tx.amount || 0).toLocaleString("en-IN")],
    ["Month", tx.month || currentMonthKey()],
    ["UTR / Reference", tx.utr || "Cash / Admin Entry"],
    ["Status", (tx.status || "verified").toUpperCase()],
    ["Date", tx.clientTime ? new Date(tx.clientTime).toLocaleString() : new Date().toLocaleString()]
  ];
  let y = 52;
  rows.forEach(([k, v]) => {
    pdf.setFont(undefined, "bold");
    pdf.text(k + ":", 18, y);
    pdf.setFont(undefined, "normal");
    pdf.text(String(v), 75, y);
    y += 11;
  });
  pdf.setDrawColor(92, 221, 171);
  pdf.line(15, y + 6, 195, y + 6);
  pdf.setFontSize(9);
  pdf.setTextColor(100, 120, 110);
  pdf.text("This is a system-generated verified receipt from Peer Fund.", 15, y + 14);
  pdf.save(`PeerFund_Receipt_${tx.userName || "Member"}_${tx.month || ""}.pdf`);
}

// Monthly Group Statement PDF Generator
export function downloadMonthlyStatementPDF(members, transactions, loans) {
  if (!window.jspdf) { showToast("PDF engine loading..."); return; }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const month = currentMonthKey();
  const totalCollected = transactions.filter(t => t.status === "verified" && t.type !== "loan_disbursement").reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalDisbursed = loans.filter(l => l.status === "disbursed" || l.status === "approved").reduce((s, l) => s + Number(l.amount || 0), 0);
  const available = totalCollected - totalDisbursed;

  pdf.setFillColor(10, 60, 42);
  pdf.rect(0, 0, 210, 34, "F");
  pdf.setTextColor(92, 221, 171);
  pdf.setFontSize(18);
  pdf.text("PEER FUND — MONTHLY GROUP STATEMENT", 14, 18);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text(`Statement Month: ${month}  |  Approved Members: ${members.length}`, 14, 27);

  pdf.setTextColor(20, 40, 30);
  pdf.setFontSize(12);
  pdf.text(`Available Corpus: INR ${available.toLocaleString("en-IN")}`, 14, 46);
  pdf.text(`Total Collected: INR ${totalCollected.toLocaleString("en-IN")}   |   Total Disbursed: INR ${totalDisbursed.toLocaleString("en-IN")}`, 14, 54);

  let y = 68;
  pdf.setFontSize(11);
  pdf.setFont(undefined, "bold");
  pdf.text("Member Roster & Contributions:", 14, y);
  y += 8;
  pdf.setFontSize(10);
  pdf.text("Name", 14, y);
  pdf.text("Phone", 80, y);
  pdf.text("Role", 122, y);
  pdf.text("Total Paid", 158, y);
  y += 4;
  pdf.line(14, y, 196, y);
  y += 7;
  pdf.setFont(undefined, "normal");
  members.forEach((m) => {
    if (y > 275) { pdf.addPage(); y = 20; }
    pdf.text(String(m.name || "").slice(0, 28), 14, y);
    pdf.text(String(m.phone || ""), 80, y);
    pdf.text(String(m.role || "member"), 122, y);
    pdf.text("INR " + Number(m.totalPaid || 0).toLocaleString("en-IN"), 158, y);
    y += 8;
  });
  pdf.save(`PeerFund_Monthly_Statement_${month}.pdf`);
}

// Render Floating Bottom Nav
export function renderBottomNav(activeKey) {
  const nav = document.getElementById("bottom-nav");
  if (!nav) return;
  const items = [
    { key: "home", href: "dashboard.html", icon: "🏠", i18n: "home" },
    { key: "ledger", href: "ledger.html", icon: "📒", i18n: "ledger" },
    { key: "loans", href: "loans.html", icon: "💸", i18n: "loans" },
    { key: "profile", href: "profile.html", icon: "👤", i18n: "profile" }
  ];
  nav.innerHTML = items.map(it => `
    <a href="${it.href}" class="nav-item ${it.key === activeKey ? "active" : ""}">
      <span class="nav-icon">${it.icon}</span>
      <span data-i18n="${it.i18n}">${t(it.i18n)}</span>
    </a>
  `).join("");
}
