import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function formatINR(num) {
  return "₹" + Number(num || 0).toLocaleString("en-IN");
}

export function getCurrentMonthKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export function isAfterFifthOfMonth() {
  return new Date().getDate() > 5;
}

// Write Immutable Audit Log Entry
export async function logAudit({ actionType, messageBn, messageEn, actorUid, actorName, actorRole, meta = {} }) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      actionType,
      messageBn,
      messageEn,
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

// Compress uploaded image to lightweight Base64 JPEG for Firestore storage
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

// Protect Authenticated Pages & Enforce Admin Approval Gate
export function requireApprovedUser(onReady) {
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
        // Redirect non-approved users to dashboard.html which renders the Approval Gate screen
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

// Setup Logout & Offline Listeners
export function setupCommonUI() {
  document.querySelectorAll(".logout-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
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

// Generate Individual Payment Receipt PDF using jsPDF
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
    ["Amount Paid:", `INR ${Number(tx.amount || 1000).toLocaleString("en-IN")}`],
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

// Generate Monthly Group Statement PDF using jsPDF
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
