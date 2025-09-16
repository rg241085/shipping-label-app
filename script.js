// ==== Firebase SDK & Firestore CDN IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ====== Firebase CONFIG =======
const firebaseConfig = {
  apiKey: "AIzaSyAHEmynzgATruM4urv8LANZrbPmtSvxM9s",
  authDomain: "shipping-label-app-2495f.firebaseapp.com",
  projectId: "shipping-label-app-2495f",
  storageBucket: "shipping-label-app-2495f.appspot.com",
  messagingSenderId: "795393678883",
  appId: "1:795393678883:web:7ea82e207d672cffe21b96"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.db = db; // console tests के लिए

// ---------- Helpers ----------
const safeLower = (v) => (v ?? "").toString().toLowerCase();

// ======= FIRESTORE Utility Functions (with error reporting) =======
async function getAllFromFirestore(colName) {
  try {
    const snapshot = await getDocs(collection(db, colName));
    const arr = [];
    snapshot.forEach((docSnap) => arr.push({ ...docSnap.data(), id: docSnap.id }));
    return arr;
  } catch (e) {
    console.error(`Firestore read failed [${colName}]:`, e);
    alert("Read failed: " + (e?.message || e));
    return [];
  }
}
async function addToFirestore(colName, data) {
  try {
    const ref = await addDoc(collection(db, colName), data);
    return ref.id;
  } catch (e) {
    console.error(`Firestore write failed [${colName}]:`, e);
    alert("Write failed: " + (e?.message || e));
    throw e;
  }
}
async function updateInFirestore(colName, id, data) {
  try {
    await setDoc(doc(db, colName, id), data);
  } catch (e) {
    console.error(`Firestore update failed [${colName}/${id}]:`, e);
    alert("Update failed: " + (e?.message || e));
    throw e;
  }
}
async function deleteFromFirestore(colName, id) {
  try {
    await deleteDoc(doc(db, colName, id));
  } catch (e) {
    console.error(`Firestore delete failed [${colName}/${id}]:`, e);
    alert("Delete failed: " + (e?.message || e));
    throw e;
  }
}

// ========== DOM Elements ==========
const receiverForm = document.getElementById("receiverForm");
const saveReceiverBtn = document.getElementById("saveReceiverBtn");
const saveUseReceiverBtn = document.getElementById("saveUseReceiverBtn");
const receiverList = document.getElementById("receiverList");
const receiverSearch = document.getElementById("receiverSearch");

const senderList = document.getElementById("senderList");
const senderSearch = document.getElementById("senderSearch");
const senderModal = document.getElementById("senderModal");
const addSenderBtn = document.getElementById("addSenderBtn");
const closeSenderModal = document.getElementById("closeSenderModal");
const senderForm = document.getElementById("senderForm");
const senderModalTitle = document.getElementById("senderModalTitle");

const labelPreview = document.getElementById("labelPreview");
const pdfBtn = document.getElementById("pdfBtn");
const printBtn = document.getElementById("printBtn");

let lastUsedReceiverIndex = null;
let selectedSenderIndex = 0;
let receiverListArr = [];
let senderListArr = [];
let selectedReceiverIndexes = [];

// ========== RECEIVER LOGIC ==========
function updateLabelPreviewWithForm() {
  let d = {
    name: receiverForm.receiverName.value.trim(),
    address: receiverForm.receiverAddress.value.trim(),
    mobile: receiverForm.receiverMobile.value.trim(),
    pin: receiverForm.receiverPin.value.trim(),
    city: receiverForm.receiverCity.value.trim(),
    state: receiverForm.receiverState.value.trim(),
  };
  let sender = senderListArr[selectedSenderIndex] || {};
  labelPreview.innerHTML = `<b>To:</b><br>
    <b>${d.name || "Name"}</b><br>
    ${d.address || "Address"}<br>
    ${d.city || "City"}, ${d.state || "State"} - ${d.pin || "Pin"}<br>
    <b>Mobile:</b> ${d.mobile || "Mobile"}<br><br>
    <b>From:</b><br>
    <b>${sender.name || "Sender Name"}</b><br>
    ${sender.address || "Sender Address"}<br>
    ${sender.city || "Sender City"}, ${sender.state || "Sender State"} - ${sender.pin || "Pin"}<br>
    <b>Mobile:</b> ${sender.mobile || "Sender Mobile"}`;
}
["receiverName", "receiverAddress", "receiverMobile", "receiverPin", "receiverCity", "receiverState"].forEach((id) => {
  document.getElementById(id).addEventListener("input", updateLabelPreviewWithForm);
});

// --- Show Receivers List (Firestore से) ---
async function showReceiversList(filter = "") {
  const f = safeLower(filter);
  receiverListArr = await getAllFromFirestore("receivers");
  receiverList.innerHTML = "";
  receiverListArr
    .filter((r) =>
      safeLower(r.name).includes(f) ||
      safeLower(r.mobile).includes(f) ||
      safeLower(r.city).includes(f) ||
      safeLower(r.pin).includes(f) ||
      safeLower(r.state).includes(f)
    )
    .forEach((receiver, i) => {
      let tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" class="receiver-checkbox" value="${i}"></td>
        <td>${receiver.name || ""}</td>
        <td>${receiver.mobile || ""}</td>
        <td>${receiver.city || ""}</td>
        <td>${receiver.pin || ""}</td>
        <td>${receiver.state || ""}</td>
        <td>
          <div class="addressAction">
            <button type="button" onclick="editReceiver(${i})">Edit</button>
            <button type="button" onclick="deleteReceiver(${i})">Delete</button>
            <button type="button" onclick="useReceiver(${i})">Use</button>
          </div>
        </td>
      `;
      receiverList.appendChild(tr);
    });
}

window.editReceiver = function (i) {
  const d = receiverListArr[i];
  fillFormWithReceiver(i);
  receiverForm.receiverIndex.value = i;
  receiverForm.receiverName.focus();
};
window.deleteReceiver = async function (i) {
  if (!confirm("क्या आप वाकई इस Receiver को डिलीट करना चाहते हैं?")) return;
  if (!confirm("फिर से कन्फर्म करें — Receiver डिलीट हो जाएगा!")) return;
  await deleteFromFirestore("receivers", receiverListArr[i].id);
  showReceiversList(receiverSearch.value);
  updateLabelPreviewWithForm();
};
window.useReceiver = function (i) {
  fillFormWithReceiver(i);
  lastUsedReceiverIndex = i;
};
function fillFormWithReceiver(i) {
  const d = receiverListArr[i] || {};
  receiverForm.receiverIndex.value = i;
  receiverForm.receiverName.value = d.name || "";
  receiverForm.receiverAddress.value = d.address || "";
  receiverForm.receiverMobile.value = d.mobile || "";
  receiverForm.receiverPin.value = d.pin || "";
  receiverForm.receiverCity.value = d.city || "";
  receiverForm.receiverState.value = d.state || "";
  updateLabelPreviewWithForm();
}
receiverSearch.oninput = function () {
  showReceiversList(receiverSearch.value);
};
showReceiversList();
updateLabelPreviewWithForm();

saveReceiverBtn.onclick = function () {
  saveReceiver(false);
};
saveUseReceiverBtn.onclick = function () {
  saveReceiver(true);
};
async function saveReceiver(useAfter) {
  const d = {
    name: receiverForm.receiverName.value.trim(),
    address: receiverForm.receiverAddress.value.trim(),
    mobile: receiverForm.receiverMobile.value.trim(),
    pin: receiverForm.receiverPin.value.trim(),
    city: receiverForm.receiverCity.value.trim(),
    state: receiverForm.receiverState.value.trim(),
  };
  if (!d.name || !d.address || !d.mobile || !d.pin || !d.city || !d.state) {
    alert("सभी फ़ील्ड भरें (All fields must be filled)");
    return;
  }
  if (!/^\d{10}$/.test(d.mobile)) {
    alert("Mobile Number 10 digit का और Numeric होना चाहिए");
    receiverForm.receiverMobile.focus();
    return;
  }
  if (!/^\d{6}$/.test(d.pin)) {
    alert("Pin Code 6 digit का और Numeric होना चाहिए");
    receiverForm.receiverPin.focus();
    return;
  }
  const idx = receiverForm.receiverIndex.value;
  if (idx !== "") {
    await updateInFirestore("receivers", receiverListArr[idx].id, d);
  } else {
    await addToFirestore("receivers", d);
  }
  await showReceiversList(receiverSearch.value);
  receiverForm.reset();
  receiverForm.receiverIndex.value = "";
  updateLabelPreviewWithForm();

  // Save & Use (optional)
  if (useAfter) {
    // अभी just preview अपडेट हो चुका है—अगर चाहें तो कोई अतिरिक्त action यहाँ दें
  }
}
receiverForm.onreset = function () {
  receiverForm.receiverIndex.value = "";
  lastUsedReceiverIndex = null;
  updateLabelPreviewWithForm();
};

// ========== SENDER MASTER ==========
async function showSenders(filter = "") {
  const f = safeLower(filter);
  senderListArr = await getAllFromFirestore("senders");
  senderList.innerHTML = "";
  senderListArr
    .filter(
      (s) =>
        safeLower(s.name).includes(f) ||
        safeLower(s.mobile).includes(f) ||
        safeLower(s.city).includes(f) ||
        safeLower(s.pin).includes(f) ||
        safeLower(s.state).includes(f)
    )
    .forEach((sender, i) => {
      let div = document.createElement("div");
      div.className = "sender-entry";
      div.innerHTML = `
        <input class="sender-radio" name="senderRadio" type="radio" value="${i}" ${
        i == selectedSenderIndex ? "checked" : ""
      } onchange="selectSender(${i})">
        <div class="sender-info">
          <span>${sender.name || ""}</span>
          <small>${sender.mobile || ""}</small>
          <small>${sender.city || ""}, ${sender.state || ""} - ${sender.pin || ""}</small>
        </div>
        <div class="sender-actions">
          <button onclick="editSender(${i})" title="Edit">✏️</button>
          <button onclick="deleteSender(${i})" title="Delete">🗑️</button>
        </div>
      `;
      senderList.appendChild(div);
    });
}
window.selectSender = function (i) {
  selectedSenderIndex = i;
  showSenders(senderSearch.value);
  updateLabelPreviewWithForm();
};
window.editSender = function (i) {
  openSenderModal(true, i);
};
window.deleteSender = async function (i) {
  if (!confirm("क्या आप वाकई इस Sender को डिलीट करना चाहते हैं?")) return;
  if (!confirm("फिर से कन्फर्म करें — Sender डिलीट हो जाएगा!")) return;
  await deleteFromFirestore("senders", senderListArr[i].id);
  await showSenders(senderSearch.value);
  updateLabelPreviewWithForm();
};
senderSearch.oninput = function () {
  showSenders(senderSearch.value);
};
showSenders();

addSenderBtn.onclick = () => openSenderModal(false);
closeSenderModal.onclick = () => closeModal();
window.onclick = function (e) {
  if (e.target == senderModal) closeModal();
};
function openSenderModal(isEdit, idx) {
  senderModal.style.display = "block";
  senderForm.reset();
  senderForm.senderIndex.value = "";
  senderModalTitle.textContent = isEdit ? "Edit Sender" : "Add Sender";
  if (isEdit) {
    const d = senderListArr[idx] || {};
    senderForm.senderIndex.value = idx;
    senderForm.senderName.value = d.name || "";
    senderForm.senderAddress.value = d.address || "";
    senderForm.senderMobile.value = d.mobile || "";
    senderForm.senderPin.value = d.pin || "";
    senderForm.senderCity.value = d.city || "";
    senderForm.senderState.value = d.state || "";
  }
  senderForm.senderName.focus();
}
function closeModal() {
  senderModal.style.display = "none";
  senderForm.reset();
  senderForm.senderIndex.value = "";
}
senderForm.onsubmit = async function (e) {
  e.preventDefault();
  const d = {
    name: senderForm.senderName.value.trim(),
    address: senderForm.senderAddress.value.trim(),
    mobile: senderForm.senderMobile.value.trim(),
    pin: senderForm.senderPin.value.trim(),
    city: senderForm.senderCity.value.trim(),
    state: senderForm.senderState.value.trim(),
  };
  if (!d.name || !d.address || !d.mobile || !d.pin || !d.city || !d.state) {
    alert("सभी फ़ील्ड भरें (All fields must be filled)");
    senderForm.senderName.focus();
    return;
  }
  if (!/^\d{10}$/.test(d.mobile)) {
    alert("Mobile Number 10 digit का और Numeric होना चाहिए");
    senderForm.senderMobile.focus();
    return;
  }
  if (!/^\d{6}$/.test(d.pin)) {
    alert("Pin Code 6 digit का और Numeric होना चाहिए");
    senderForm.senderPin.focus();
    return;
  }
  const idx = senderForm.senderIndex.value;
  if (idx !== "") {
    await updateInFirestore("senders", senderListArr[idx].id, d);
  } else {
    await addToFirestore("senders", d);
  }
  await showSenders(senderSearch.value);
  closeModal();
};
senderForm.onreset = function () {
  senderForm.senderIndex.value = "";
};

// ==== MULTI SELECT RECEIVER LOGIC ====
receiverList.onclick = function (e) {
  if (e.target.classList.contains("receiver-checkbox")) {
    const idx = Number(e.target.value);
    if (e.target.checked) {
      if (!selectedReceiverIndexes.includes(idx)) selectedReceiverIndexes.push(idx);
    } else {
      selectedReceiverIndexes = selectedReceiverIndexes.filter((i) => i !== idx);
    }
    highlightSelectedRows();
  }
};
document.getElementById("selectAllReceivers").onclick = function () {
  const checkboxes = document.querySelectorAll(".receiver-checkbox");
  selectedReceiverIndexes = [];
  checkboxes.forEach((chk) => {
    chk.checked = this.checked;
    if (this.checked) selectedReceiverIndexes.push(Number(chk.value));
  });
  highlightSelectedRows();
};
function highlightSelectedRows() {
  const rows = receiverList.querySelectorAll("tr");
  rows.forEach((row, i) => {
    if (selectedReceiverIndexes.includes(i)) row.classList.add("selected");
    else row.classList.remove("selected");
  });
}

// ==== MULTI PRINT ====
document.getElementById("multiPrintBtn").onclick = function () {
  let allLabels = "";
  selectedReceiverIndexes.forEach((idx) => {
    let d = receiverListArr[idx] || {};
    let sender = senderListArr[selectedSenderIndex] || {};
    allLabels += `<div class="labelBox" style="margin-bottom: 18px; border:2px solid #1789fa;border-radius:7px;padding:13px 10px;">
      <b>To:</b><br>
      <b>${d.name || "Name"}</b><br>
      ${d.address || "Address"}<br>
      ${d.city || "City"}, ${d.state || "State"} - ${d.pin || "Pin"}<br>
      <b>Mobile:</b> ${d.mobile || "Mobile"}<br><br>
      <b>From:</b><br>
      <b>${sender.name || "Sender Name"}</b><br>
      ${sender.address || "Sender Address"}<br>
      ${sender.city || "Sender City"}, ${sender.state || "Sender State"} - ${sender.pin || "Pin"}<br>
      <b>Mobile:</b> ${sender.mobile || "Sender Mobile"}
    </div>`;
  });
  if (!allLabels) {
    alert("Please select at least one receiver!");
    return;
  }
  let printWindow = window.open("", "", "width=800,height=600");
  let style = `<style>
    body{font-family:'Segoe UI',Arial,sans-serif;}
    .labelBox{margin-bottom:18px; border:2px solid #1789fa; border-radius:7px; padding:13px 10px; max-width:99vw;}
    .labelBox b{font-size:1.02em;}
  </style>`;
  printWindow.document.write(`<html><head><title>Print Labels</title>${style}</head><body>${allLabels}</body></html>`);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 450);
};

// ==== MULTI PDF ====
document.getElementById("multiPdfBtn").onclick = function () {
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!jsPDF) {
    alert("jsPDF library लोड नहीं हुई!");
    return;
  }
  let doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a6" });
  let first = true;
  selectedReceiverIndexes.forEach((idx) => {
    if (!first) doc.addPage();
    first = false;
    let d = receiverListArr[idx] || {};
    let sender = senderListArr[selectedSenderIndex] || {};
    let y = 12;
    doc.setFontSize(13);
    doc.text("To:", 10, y);
    y += 5;
    doc.text(d.name || "", 12, y);
    y += 5;
    doc.text(d.address || "", 12, y);
    y += 5;
    doc.text(`${d.city || ""}, ${d.state || ""} - ${d.pin || ""}`, 12, y);
    y += 5;
    doc.text("Mobile: " + (d.mobile || ""), 12, y);
    y += 7;
    doc.text("From:", 10, y);
    y += 5;
    doc.text(sender.name || "", 12, y);
    y += 5;
    doc.text(sender.address || "", 12, y);
    y += 5;
    doc.text(`${sender.city || ""}, ${sender.state || ""} - ${sender.pin || ""}`, 12, y);
    y += 5;
    doc.text("Mobile: " + (sender.mobile || ""), 12, y);
  });
  doc.save("multiple-labels.pdf");
};

// ==== MULTI EXCEL (CSV) ====
document.getElementById("multiExcelBtn").onclick = function () {
  let csv = "Name,Mobile,Address,City,Pin,State\n";
  selectedReceiverIndexes.forEach((idx) => {
    let d = receiverListArr[idx] || {};
    csv += `"${d.name || ""}","${d.mobile || ""}","${(d.address || "").replace(/"/g, '""')}","${d.city || ""}","${d.pin || ""}","${d.state || ""}"\n`;
  });
  let blob = new Blob([csv], { type: "text/csv" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "receivers.csv";
  a.click();
};

// ==== Single Print/PDF (Preview) ====
printBtn.onclick = function () {
  let labelHtml = labelPreview.innerHTML;
  let printWindow = window.open("", "", "width=500,height=550");
  let style = `<style>
    body{font-family:'Segoe UI',Arial,sans-serif;}
    .labelBox{margin-bottom:18px; border:2px solid #1789fa; border-radius:7px; padding:13px 10px; max-width:99vw;}
    .labelBox b{font-size:1.02em;}
  </style>`;
  printWindow.document.write(
    `<html><head><title>Print Label</title>${style}</head><body><div class='labelBox'>${labelHtml}</div></body></html>`
  );
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 450);
};

pdfBtn.onclick = function () {
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!jsPDF) {
    alert("jsPDF library लोड नहीं हुई!");
    return;
  }
  let d = {
    name: receiverForm.receiverName.value.trim() || "Name",
    address: receiverForm.receiverAddress.value.trim() || "Address",
    mobile: receiverForm.receiverMobile.value.trim() || "Mobile",
    pin: receiverForm.receiverPin.value.trim() || "Pin",
    city: receiverForm.receiverCity.value.trim() || "City",
    state: receiverForm.receiverState.value.trim() || "State",
  };
  let sender = senderListArr[selectedSenderIndex] || {};
  let doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a6" });
  let y = 12;
  doc.setFontSize(13);
  doc.text("To:", 10, y);
  y += 5;
  doc.text(d.name, 12, y);
  y += 5;
  doc.text(d.address, 12, y);
  y += 5;
  doc.text(`${d.city}, ${d.state} - ${d.pin}`, 12, y);
  y += 5;
  doc.text("Mobile: " + d.mobile, 12, y);
  y += 7;
  doc.text("From:", 10, y);
  y += 5;
  doc.text(sender.name || "Sender Name", 12, y);
  y += 5;
  doc.text(sender.address || "Sender Address", 12, y);
  y += 5;
  doc.text(`${sender.city || "Sender City"}, ${sender.state || "Sender State"} - ${sender.pin || "Pin"}`, 12, y);
  y += 5;
  doc.text("Mobile: " + (sender.mobile || "Sender Mobile"), 12, y);
  doc.save("label.pdf");
};
