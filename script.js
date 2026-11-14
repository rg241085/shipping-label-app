// ===================== Firebase Imports =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ===================== Settings =====================
// true  = Google login zaroori (data safe rahega)
// false = bina login ke chalega (sirf testing ke liye)
const REQUIRE_LOGIN = true;

const firebaseConfig = {
  apiKey: "AIzaSyAHEmynzgATruM4urv8LANZrbPmtSvxM9s",
  authDomain: "shipping-label-app-2495f.firebaseapp.com",
  projectId: "shipping-label-app-2495f",
  storageBucket: "shipping-label-app-2495f.appspot.com",
  messagingSenderId: "795393678883",
  appId: "1:795393678883:web:7ea82e207d672cffe21b96",
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const auth = getAuth(fbApp);

// ===================== Constants =====================
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
  "Other",
];
const FIELDS = ["Name", "Address", "Mobile", "Pin", "City", "State"];
const SENDER_KEY = "sl_selectedSenderId";
const FONT_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">';

// Label ki CSS — preview, print aur PDF teeno yahi use karte hain (ek hi jagah)
const LABEL_CSS = `
.lbl{box-sizing:border-box;width:100%;aspect-ratio:105/148;background:#fff;color:#111;border:2px solid #111;border-radius:6px;display:flex;flex-direction:column;font-family:'Inter','Noto Sans Devanagari',Arial,sans-serif;font-size:12.5px;line-height:1.38;overflow:hidden}
.lbl *{box-sizing:border-box}
.lbl-bar{background:#111;color:#fff;font-weight:700;letter-spacing:.22em;font-size:.82em;padding:.5em 1em}
.lbl-to{flex:1;min-height:0;padding:.9em 1em;display:flex;flex-direction:column;gap:.35em}
.lbl-name{font-size:1.45em;font-weight:700;text-transform:uppercase;overflow-wrap:anywhere;line-height:1.2}
.lbl-addr{font-size:1.05em;overflow-wrap:anywhere}
.lbl-city{font-size:1.05em;font-weight:600}
.lbl-pin{display:inline-flex;align-self:flex-start;border:2px solid #111;border-radius:4px;overflow:hidden;margin-top:.35em}
.lbl-pin span{background:#111;color:#fff;font-weight:700;font-size:.8em;padding:0 .6em;display:flex;align-items:center}
.lbl-pin b{font-size:1.55em;letter-spacing:.18em;padding:.1em .5em}
.lbl-mob{font-size:1.1em;margin-top:.2em}
.lbl-from{border-top:2px dashed #111;padding:.7em 1em .8em;font-size:.88em}
.lbl-from-tag{font-weight:700;font-size:.8em;letter-spacing:.22em;color:#555;margin-bottom:.2em}
.lbl-from-body{overflow-wrap:anywhere}
.lbl .ph{color:#9aa3ad}
.sheet{width:105mm;height:148mm;padding:4mm;background:#fff;box-sizing:border-box}
.sheet .lbl{height:100%;aspect-ratio:auto;font-size:14px}
`;

// ===================== Helpers =====================
const $ = (id) => document.getElementById(id);
const lower = (v) => (v ?? "").toString().toLowerCase();
const esc = (v) =>
  (v ?? "").toString()
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const escLines = (v) => esc(v).replace(/\n/g, "<br>");
const normState = (s) => lower(s).replace(/&/g, "and").replace(/[^a-z]/g, "");
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const today = () => new Date().toISOString().slice(0, 10);

function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  $("toasts").appendChild(el);
  setTimeout(() => {
    el.classList.add("hide");
    setTimeout(() => el.remove(), 300);
  }, type === "error" ? 5000 : 2800);
}

function confirmBox(message, okText = "Delete") {
  return new Promise((resolve) => {
    const modal = $("confirmModal");
    $("confirmText").textContent = message;
    $("confirmOk").textContent = okText;
    modal.hidden = false;
    $("confirmOk").focus();
    const done = (v) => {
      modal.hidden = true;
      $("confirmOk").onclick = $("confirmCancel").onclick = modal.onclick = null;
      document.removeEventListener("keydown", onKey);
      resolve(v);
    };
    const onKey = (e) => e.key === "Escape" && done(false);
    $("confirmOk").onclick = () => done(true);
    $("confirmCancel").onclick = () => done(false);
    modal.onclick = (e) => e.target === modal && done(false);
    document.addEventListener("keydown", onKey);
  });
}

// Button ko kaam chalne tak disable rakhta hai (double click se duplicate save nahi hoga)
async function withBusy(buttons, task) {
  buttons.forEach((b) => (b.disabled = true));
  try {
    return await task();
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

function fbError(prefix, e) {
  console.error(prefix, e);
  const msg = e?.code === "permission-denied" ? "Permission nahi hai (login / Firestore rules check karein)" : e?.message || e;
  toast(`${prefix}: ${msg}`, "error");
}

// ===================== State =====================
const state = {
  receivers: [],
  senders: [],
  selectedIds: new Set(),
  senderId: (() => { try { return localStorage.getItem(SENDER_KEY); } catch { return null; } })(),
  unsub: [],
  loaded: { receivers: false, senders: false },
};
const currentSender = () => state.senders.find((s) => s.id === state.senderId) || null;
const currentReceiverId = () => $("receiverId").value;

// ===================== Form helpers =====================
function fillStateSelects() {
  const opts = `<option value="">State chunein</option>` + STATES.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  document.querySelectorAll(".state-select").forEach((sel) => (sel.innerHTML = opts));
}

function readForm(prefix) {
  const g = (f) => $(prefix + f).value.trim();
  return { name: g("Name"), address: g("Address"), mobile: g("Mobile"), pin: g("Pin"), city: g("City"), state: g("State") };
}

function writeForm(prefix, d = {}) {
  FIELDS.forEach((f) => ($(prefix + f).value = d[f.toLowerCase()] || ""));
  if (d.state && !STATES.includes(d.state)) {
    // purana data jiska state list mein nahi hai
    const sel = $(prefix + "State");
    sel.insertAdjacentHTML("beforeend", `<option value="${esc(d.state)}">${esc(d.state)}</option>`);
    sel.value = d.state;
  }
}

function clearInvalid(prefix) {
  FIELDS.forEach((f) => $(prefix + f).classList.remove("invalid"));
}

function validate(d, prefix) {
  clearInvalid(prefix);
  const rules = [
    ["Name", !!d.name, "Name bharein"],
    ["Address", !!d.address, "Address bharein"],
    ["Mobile", /^\d{10}$/.test(d.mobile), "Mobile number 10 digit ka hona chahiye"],
    ["Pin", /^\d{6}$/.test(d.pin), "Pin code 6 digit ka hona chahiye"],
    ["City", !!d.city, "City bharein"],
    ["State", !!d.state, "State chunein"],
  ];
  const failed = rules.filter(([, ok]) => !ok);
  failed.forEach(([f]) => $(prefix + f).classList.add("invalid"));
  if (failed.length) {
    $(prefix + failed[0][0]).focus();
    toast(failed[0][2], "error");
    return false;
  }
  return true;
}

// Mobile/Pin mein sirf number
function digitsOnly(id) {
  $(id).addEventListener("input", (e) => {
    const clean = e.target.value.replace(/\D/g, "");
    if (clean !== e.target.value) e.target.value = clean;
  });
}

// Pin code se City/State apne aap (agar khali ho)
async function pinLookup(prefix) {
  const pin = $(prefix + "Pin").value;
  if (!/^\d{6}$/.test(pin)) return;
  const cityEl = $(prefix + "City");
  const stateEl = $(prefix + "State");
  if (cityEl.value && stateEl.value) return;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const json = await res.json();
    const po = json?.[0]?.PostOffice?.[0];
    if (!po || $(prefix + "Pin").value !== pin) return;
    if (!cityEl.value) cityEl.value = po.District || "";
    if (!stateEl.value) {
      const match = STATES.find((s) => normState(s) === normState(po.State));
      if (match) stateEl.value = match;
    }
    if (prefix === "receiver") updatePreview();
  } catch {
    /* API na chale to koi baat nahi */
  }
}

// ===================== Label =====================
function labelHtml(r = {}, s = {}) {
  const v = (x, ph) => (x ? esc(x) : `<span class="ph">${ph}</span>`);
  const lines = (x, ph) => (x ? escLines(x) : `<span class="ph">${ph}</span>`);
  return `<div class="lbl">
    <div class="lbl-bar">SHIP TO</div>
    <div class="lbl-to">
      <div class="lbl-name">${v(r.name, "Receiver Name")}</div>
      <div class="lbl-addr">${lines(r.address, "Address")}</div>
      <div class="lbl-city">${v(r.city, "City")}, ${v(r.state, "State")}</div>
      <div class="lbl-pin"><span>PIN</span><b>${v(r.pin, "------")}</b></div>
      <div class="lbl-mob">Mob: <b>${v(r.mobile, "----------")}</b></div>
    </div>
    <div class="lbl-from">
      <div class="lbl-from-tag">FROM</div>
      <div class="lbl-from-body">
        <b>${v(s.name, "Sender Name")}</b><br>
        ${lines(s.address, "Sender Address")}<br>
        ${v(s.city, "City")}, ${v(s.state, "State")} - ${v(s.pin, "Pin")}<br>
        Mob: ${v(s.mobile, "Mobile")}
      </div>
    </div>
  </div>`;
}

function updatePreview() {
  $("labelPreview").innerHTML = labelHtml(readForm("receiver"), currentSender() || {});
}

// ===================== Print (hidden iframe — popup blocker ka issue nahi) =====================
function printLabels(htmlList, layout) {
  const pageCss =
    layout === "a4x4"
      ? `@page{size:A4;margin:0}
         .a4{width:210mm;height:297mm;display:grid;grid-template-columns:105mm 105mm;grid-template-rows:148.5mm 148.5mm;break-after:page;page-break-after:always}
         .a4:last-child{break-after:auto;page-break-after:auto}`
      : `@page{size:105mm 148mm;margin:0}
         .page{break-after:page;page-break-after:always}
         .page:last-child{break-after:auto;page-break-after:auto}`;

  const body =
    layout === "a4x4"
      ? chunk(htmlList, 4).map((g) => `<div class="a4">${g.map((h) => `<div class="sheet">${h}</div>`).join("")}</div>`).join("")
      : htmlList.map((h) => `<div class="sheet page">${h}</div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shipping Labels</title>${FONT_LINK}
    <style>html,body{margin:0;padding:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}${LABEL_CSS}${pageCss}</style>
    </head><body>${body}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);
  const d = iframe.contentDocument;
  d.open();
  d.write(html);
  d.close();

  setTimeout(async () => {
    try { await iframe.contentDocument.fonts.ready; } catch { /* ignore */ }
    const w = iframe.contentWindow;
    w.onafterprint = () => setTimeout(() => iframe.remove(), 100);
    w.focus();
    w.print();
    setTimeout(() => iframe.isConnected && iframe.remove(), 60000);
  }, 400);
}

// ===================== PDF (html2canvas — Hindi text bhi sahi aata hai) =====================
async function makePdf(htmlList, filename, layout) {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF || !window.html2canvas) {
    toast("PDF library load nahi hui. Internet check karein.", "error");
    return;
  }
  const area = $("renderArea");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: layout === "a4x4" ? "a4" : "a6" });
  try {
    await document.fonts.ready;
    for (let i = 0; i < htmlList.length; i++) {
      area.innerHTML = `<div class="sheet">${htmlList[i]}</div>`;
      const canvas = await window.html2canvas(area.firstElementChild, { scale: 3, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/jpeg", 0.92);
      if (layout === "a4x4") {
        const pos = i % 4;
        if (i > 0 && pos === 0) pdf.addPage();
        pdf.addImage(img, "JPEG", (pos % 2) * 105, Math.floor(pos / 2) * 148.5, 105, 148);
      } else {
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", 0, 0, 105, 148);
      }
    }
    pdf.save(filename);
  } catch (e) {
    console.error(e);
    toast("PDF banane mein error aaya", "error");
  } finally {
    area.innerHTML = "";
  }
}

// ===================== Receivers =====================
function filteredReceivers() {
  const f = lower($("receiverSearch").value.trim());
  if (!f) return state.receivers;
  return state.receivers.filter((r) =>
    ["name", "mobile", "city", "pin", "state", "address"].some((k) => lower(r[k]).includes(f))
  );
}

function renderReceivers() {
  const list = filteredReceivers();
  const activeId = currentReceiverId();
  $("receiverCount").textContent = state.receivers.length;
  $("receiverList").innerHTML = list
    .map((r) => {
      const sel = state.selectedIds.has(r.id);
      return `<tr data-id="${esc(r.id)}" class="${sel ? "selected" : ""} ${r.id === activeId ? "active" : ""}">
        <td class="col-check"><input type="checkbox" class="row-check" ${sel ? "checked" : ""}></td>
        <td><div class="cell-name">${esc(r.name)}</div><div class="cell-sub" title="${esc(r.address)}">${esc(r.address)}</div></td>
        <td>${esc(r.mobile)}</td>
        <td>${esc(r.city)}</td>
        <td>${esc(r.pin)}</td>
        <td>${esc(r.state)}</td>
        <td class="col-action"><div class="actions">
          <button type="button" class="btn btn-sm btn-soft" data-act="use">Use</button>
          <button type="button" class="icon-btn" data-act="edit" title="Edit">✏️</button>
          <button type="button" class="icon-btn danger" data-act="delete" title="Delete">🗑️</button>
        </div></td>
      </tr>`;
    })
    .join("");

  const empty = $("receiverEmpty");
  empty.hidden = list.length > 0;
  empty.textContent = !state.loaded.receivers
    ? "Loading..."
    : state.receivers.length
      ? "Search se koi receiver nahi mila"
      : "Abhi koi receiver save nahi hai";
  updateSelectionUI(list);
}

function updateSelectionUI(visible = filteredReceivers()) {
  const all = $("selectAll");
  const selVisible = visible.filter((r) => state.selectedIds.has(r.id)).length;
  all.checked = visible.length > 0 && selVisible === visible.length;
  all.indeterminate = selVisible > 0 && selVisible < visible.length;
  document.querySelectorAll(".sel-count").forEach((el) => (el.textContent = state.selectedIds.size));
}

function selectedReceivers() {
  return state.receivers.filter((r) => state.selectedIds.has(r.id));
}

function setReceiverMode(id) {
  $("receiverId").value = id || "";
  const badge = $("receiverMode");
  badge.textContent = id ? "Editing" : "New";
  badge.classList.toggle("edit", !!id);
  renderReceivers();
}

function loadReceiverIntoForm(id, focus) {
  const r = state.receivers.find((x) => x.id === id);
  if (!r) return;
  writeForm("receiver", r);
  clearInvalid("receiver");
  setReceiverMode(id);
  updatePreview();
  if (focus) $("receiverName").focus();
  if (window.innerWidth < 1100) window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetReceiverForm() {
  $("receiverForm").reset();
}

async function saveReceiver(useAfter) {
  const d = readForm("receiver");
  if (!validate(d, "receiver")) return;
  const id = currentReceiverId();

  if (!id) {
    const dup = state.receivers.find((r) => r.mobile === d.mobile);
    if (dup && !(await confirmBox(`Is mobile (${d.mobile}) se "${dup.name}" pehle se save hai. Phir bhi naya save karein?`, "Haan, Save"))) return;
  }

  const buttons = [$("saveReceiverBtn"), $("saveUseReceiverBtn")];
  try {
    const savedId = await withBusy(buttons, async () => {
      if (id) {
        await updateDoc(doc(db, "receivers", id), { ...d, updatedAt: serverTimestamp() });
        return id;
      }
      const ref = await addDoc(collection(db, "receivers"), { ...d, createdAt: serverTimestamp() });
      return ref.id;
    });
    toast(id ? "Receiver update ho gaya" : "Receiver save ho gaya", "success");
    if (useAfter) {
      setReceiverMode(savedId); // form bhara rahega, label print ke liye ready
      updatePreview();
    } else {
      resetReceiverForm();
    }
  } catch (e) {
    fbError("Save nahi hua", e);
  }
}

async function deleteReceiver(id) {
  const r = state.receivers.find((x) => x.id === id);
  if (!r) return;
  if (!(await confirmBox(`"${r.name}" (${r.mobile}) ko hamesha ke liye delete karein?`))) return;
  try {
    await deleteDoc(doc(db, "receivers", id));
    state.selectedIds.delete(id);
    if (currentReceiverId() === id) resetReceiverForm();
    toast("Receiver delete ho gaya", "success");
  } catch (e) {
    fbError("Delete nahi hua", e);
  }
}

// ===================== Senders =====================
function renderSenders() {
  const f = lower($("senderSearch").value.trim());
  const list = f
    ? state.senders.filter((s) => ["name", "mobile", "city", "pin", "state"].some((k) => lower(s[k]).includes(f)))
    : state.senders;
  const box = $("senderList");

  if (!state.loaded.senders) {
    box.innerHTML = `<div class="loading">Loading...</div>`;
    return;
  }
  if (!list.length) {
    box.innerHTML = `<div class="empty">${state.senders.length ? "Koi sender nahi mila" : "Pehle ek sender add karein"}</div>`;
    return;
  }
  box.innerHTML = list
    .map((s) => {
      const active = s.id === state.senderId;
      return `<div class="sender-item ${active ? "active" : ""}" data-id="${esc(s.id)}">
        <input type="radio" name="senderRadio" ${active ? "checked" : ""} tabindex="-1">
        <div class="sender-info">
          <b>${esc(s.name)}</b>
          <small>${esc(s.mobile)}</small>
          <small>${esc(s.city)}, ${esc(s.state)} - ${esc(s.pin)}</small>
        </div>
        <div class="sender-actions">
          <button type="button" class="icon-btn" data-act="edit" title="Edit">✏️</button>
          <button type="button" class="icon-btn danger" data-act="delete" title="Delete">🗑️</button>
        </div>
      </div>`;
    })
    .join("");
}

function selectSender(id) {
  state.senderId = id;
  try { localStorage.setItem(SENDER_KEY, id || ""); } catch { /* ignore */ }
  renderSenders();
  updatePreview();
}

function openSenderModal(id) {
  const form = $("senderForm");
  form.reset();
  clearInvalid("sender");
  $("senderId").value = "";
  $("senderModalTitle").textContent = id ? "Edit Sender" : "Add Sender";
  if (id) {
    writeForm("sender", state.senders.find((s) => s.id === id));
    $("senderId").value = id;
  }
  $("senderModal").hidden = false;
  $("senderName").focus();
}

function closeSenderModal() {
  $("senderModal").hidden = true;
}

async function saveSender(e) {
  e.preventDefault();
  const d = readForm("sender");
  if (!validate(d, "sender")) return;
  const id = $("senderId").value;
  try {
    const savedId = await withBusy([$("saveSenderBtn")], async () => {
      if (id) {
        await updateDoc(doc(db, "senders", id), { ...d, updatedAt: serverTimestamp() });
        return id;
      }
      const ref = await addDoc(collection(db, "senders"), { ...d, createdAt: serverTimestamp() });
      return ref.id;
    });
    toast(id ? "Sender update ho gaya" : "Sender save ho gaya", "success");
    if (!id && !currentSender()) selectSender(savedId);
    closeSenderModal();
  } catch (err) {
    fbError("Sender save nahi hua", err);
  }
}

async function deleteSender(id) {
  const s = state.senders.find((x) => x.id === id);
  if (!s) return;
  if (!(await confirmBox(`Sender "${s.name}" ko delete karein?`))) return;
  try {
    await deleteDoc(doc(db, "senders", id));
    toast("Sender delete ho gaya", "success");
  } catch (e) {
    fbError("Delete nahi hua", e);
  }
}

// ===================== Excel (CSV) =====================
function exportCsv() {
  const rows = state.selectedIds.size ? selectedReceivers() : filteredReceivers();
  if (!rows.length) {
    toast("Export ke liye koi receiver nahi hai", "error");
    return;
  }
  const cell = (v) => {
    let s = (v ?? "").toString();
    if (/^[=+\-@]/.test(s)) s = "'" + s; // Excel formula injection se bachav
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = ["Name", "Mobile", "Address", "City", "Pin", "State"];
  const lines = rows.map((r) => [r.name, r.mobile, r.address, r.city, r.pin, r.state].map(cell).join(","));
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n"); // BOM = Excel mein Hindi sahi dikhega
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `receivers-${today()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${rows.length} receiver export hue`, "success");
}

// ===================== Firestore realtime =====================
function subscribe(col, key, after) {
  return onSnapshot(
    collection(db, col),
    (snap) => {
      state[key] = snap.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .sort((a, b) => lower(a.name).localeCompare(lower(b.name)));
      state.loaded[key] = true;
      after();
    },
    (err) => fbError(`${col} load nahi hua`, err)
  );
}

function startData() {
  stopData();
  state.unsub = [
    subscribe("receivers", "receivers", () => {
      // jo receiver delete ho gaye unhe selection se hatao
      const ids = new Set(state.receivers.map((r) => r.id));
      state.selectedIds.forEach((id) => !ids.has(id) && state.selectedIds.delete(id));
      if (currentReceiverId() && !ids.has(currentReceiverId())) setReceiverMode("");
      renderReceivers();
    }),
    subscribe("senders", "senders", () => {
      if (!currentSender() && state.senders.length) selectSender(state.senders[0].id);
      renderSenders();
      updatePreview();
    }),
  ];
}

function stopData() {
  state.unsub.forEach((u) => u());
  state.unsub = [];
  state.receivers = [];
  state.senders = [];
  state.selectedIds.clear();
  state.loaded = { receivers: false, senders: false };
}

// ===================== Events =====================
function bindEvents() {
  // Receiver form
  ["receiverName", "receiverAddress", "receiverMobile", "receiverPin", "receiverCity", "receiverState"].forEach((id) => {
    $(id).addEventListener("input", updatePreview);
    $(id).addEventListener("change", updatePreview);
    $(id).addEventListener("input", () => $(id).classList.remove("invalid"));
  });
  ["receiverMobile", "receiverPin", "senderMobile", "senderPin"].forEach(digitsOnly);
  $("receiverPin").addEventListener("input", () => pinLookup("receiver"));
  $("senderPin").addEventListener("input", () => pinLookup("sender"));

  $("saveReceiverBtn").onclick = () => saveReceiver(false);
  $("saveUseReceiverBtn").onclick = () => saveReceiver(true);
  $("receiverForm").addEventListener("reset", () => {
    // reset event values clear hone se pehle chalta hai, isliye setTimeout
    setTimeout(() => {
      clearInvalid("receiver");
      setReceiverMode("");
      updatePreview();
    });
  });

  // Receiver table (event delegation)
  $("receiverList").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const id = tr.dataset.id;
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "use") loadReceiverIntoForm(id, false);
    else if (act === "edit") loadReceiverIntoForm(id, true);
    else if (act === "delete") deleteReceiver(id);
    else if (e.target.classList.contains("row-check")) {
      e.target.checked ? state.selectedIds.add(id) : state.selectedIds.delete(id);
      tr.classList.toggle("selected", e.target.checked);
      updateSelectionUI();
    }
  });
  $("selectAll").addEventListener("change", (e) => {
    filteredReceivers().forEach((r) => (e.target.checked ? state.selectedIds.add(r.id) : state.selectedIds.delete(r.id)));
    renderReceivers();
  });
  $("receiverSearch").addEventListener("input", renderReceivers);

  // Single label
  const singleLabel = () => {
    const d = readForm("receiver");
    if (!validate(d, "receiver")) return null;
    const s = currentSender();
    if (!s) {
      toast("Pehle ek Sender chunein / add karein", "error");
      return null;
    }
    return labelHtml(d, s);
  };
  $("printBtn").onclick = () => {
    const h = singleLabel();
    if (h) printLabels([h], "a6");
  };
  $("pdfBtn").onclick = async () => {
    const h = singleLabel();
    if (!h) return;
    const name = readForm("receiver").name.replace(/[^\wऀ-ॿ]+/g, "_").slice(0, 40) || "label";
    await withBusy([$("pdfBtn")], () => makePdf([h], `label-${name}.pdf`, "a6"));
  };

  // Multi label
  const multiLabels = () => {
    const list = selectedReceivers();
    if (!list.length) {
      toast("Kam se kam ek receiver select karein", "error");
      return null;
    }
    const s = currentSender();
    if (!s) {
      toast("Pehle ek Sender chunein / add karein", "error");
      return null;
    }
    return list.map((r) => labelHtml(r, s));
  };
  $("multiPrintBtn").onclick = () => {
    const l = multiLabels();
    if (l) printLabels(l, $("printLayout").value);
  };
  $("multiPdfBtn").onclick = async () => {
    const l = multiLabels();
    if (!l) return;
    const btn = $("multiPdfBtn");
    await withBusy([btn], () => makePdf(l, `labels-${today()}.pdf`, $("printLayout").value));
  };
  $("multiExcelBtn").onclick = exportCsv;

  // Senders
  $("senderSearch").addEventListener("input", renderSenders);
  $("senderList").addEventListener("click", (e) => {
    const item = e.target.closest(".sender-item");
    if (!item) return;
    const id = item.dataset.id;
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "edit") openSenderModal(id);
    else if (act === "delete") deleteSender(id);
    else selectSender(id);
  });
  $("addSenderBtn").onclick = () => openSenderModal(null);
  $("closeSenderModal").onclick = closeSenderModal;
  $("senderModal").addEventListener("click", (e) => e.target === $("senderModal") && closeSenderModal());
  $("senderForm").addEventListener("submit", saveSender);
  $("senderForm").addEventListener("reset", () => setTimeout(() => clearInvalid("sender")));
  ["senderName", "senderAddress", "senderMobile", "senderPin", "senderCity", "senderState"].forEach((id) =>
    $(id).addEventListener("input", () => $(id).classList.remove("invalid"))
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("senderModal").hidden && $("confirmModal").hidden) closeSenderModal();
  });

  // Auth
  $("loginBtn").onclick = async () => {
    try {
      await withBusy([$("loginBtn")], () => signInWithPopup(auth, new GoogleAuthProvider()));
    } catch (e) {
      if (e?.code === "auth/popup-closed-by-user") return;
      fbError("Login nahi hua", e);
    }
  };
  $("logoutBtn").onclick = () => signOut(auth);
}

// ===================== Start =====================
function showApp(user) {
  $("authScreen").hidden = true;
  $("app").hidden = false;
  $("userInfo").textContent = user ? user.displayName || user.email : "";
  $("logoutBtn").hidden = !user;
  startData();
  renderReceivers();
  renderSenders();
  updatePreview();
}

function showLogin() {
  stopData();
  resetReceiverForm();
  $("app").hidden = true;
  $("authScreen").hidden = false;
}

function init() {
  const style = document.createElement("style");
  style.textContent = LABEL_CSS;
  document.head.appendChild(style);

  fillStateSelects();
  bindEvents();

  if (REQUIRE_LOGIN) {
    onAuthStateChanged(auth, (user) => (user ? showApp(user) : showLogin()));
  } else {
    showApp(null);
  }
}

init();
