// ======== Utility Functions ========
function getData(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function setData(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

// ---- Receiver Master ----
const receiverForm = document.getElementById('receiverForm');
const saveReceiverBtn = document.getElementById('saveReceiverBtn');
const saveUseReceiverBtn = document.getElementById('saveUseReceiverBtn');
const receiverList = document.getElementById('receiverList');
const receiverSearch = document.getElementById('receiverSearch');

// ---- Sender Master ----
const senderList = document.getElementById('senderList');
const senderSearch = document.getElementById('senderSearch');
const senderModal = document.getElementById('senderModal');
const addSenderBtn = document.getElementById('addSenderBtn');
const closeSenderModal = document.getElementById('closeSenderModal');
const senderForm = document.getElementById('senderForm');
const senderModalTitle = document.getElementById('senderModalTitle');

// ---- Label Preview ----
const labelPreview = document.getElementById('labelPreview');
const pdfBtn = document.getElementById('pdfBtn');
const printBtn = document.getElementById('printBtn');

let lastUsedReceiverIndex = null;
let selectedSenderIndex = 0; // Default sender

// ========== RECEIVER LOGIC ==========
// Live Label Preview
function updateLabelPreviewWithForm() {
    let d = {
        name: receiverForm.receiverName.value.trim(),
        address: receiverForm.receiverAddress.value.trim(),
        mobile: receiverForm.receiverMobile.value.trim(),
        pin: receiverForm.receiverPin.value.trim(),
        city: receiverForm.receiverCity.value.trim(),
        state: receiverForm.receiverState.value.trim()
    };
    let sArr = getData('senders');
    let sender = sArr[selectedSenderIndex] || {};
    labelPreview.innerHTML =
        `<b>To:</b><br>
    <b>${d.name || 'Name'}</b><br>
    ${d.address || 'Address'}<br>
    ${d.city || 'City'}, ${d.state || 'State'} - ${d.pin || 'Pin'}<br>
    <b>Mobile:</b> ${d.mobile || 'Mobile'}<br><br>
    <b>From:</b><br>
    <b>${sender.name || 'Sender Name'}</b><br>
    ${sender.address || 'Sender Address'}<br>
    ${sender.city || 'Sender City'}, ${sender.state || 'Sender State'} - ${sender.pin || 'Pin'}<br>
    <b>Mobile:</b> ${sender.mobile || 'Sender Mobile'}`;
}
['receiverName', 'receiverAddress', 'receiverMobile', 'receiverPin', 'receiverCity', 'receiverState'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateLabelPreviewWithForm);
});

// Save Receiver (Only Save)
saveReceiverBtn.onclick = function () { saveReceiver(false); };
saveUseReceiverBtn.onclick = function () { saveReceiver(true); };

function saveReceiver(useAfter) {
    const d = {
        name: receiverForm.receiverName.value.trim(),
        address: receiverForm.receiverAddress.value.trim(),
        mobile: receiverForm.receiverMobile.value.trim(),
        pin: receiverForm.receiverPin.value.trim(),
        city: receiverForm.receiverCity.value.trim(),
        state: receiverForm.receiverState.value.trim()
    };
    // ---------- Validation ----------
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
    // -------------------------------
    let arr = getData('receivers');
    const idx = receiverForm.receiverIndex.value;
    let newIdx;
    if (idx !== '') { arr[+idx] = d; newIdx = +idx; }
    else { arr.push(d); newIdx = arr.length - 1; }
    setData('receivers', arr); showReceiversList(receiverSearch.value);
    if (useAfter) { lastUsedReceiverIndex = newIdx; fillFormWithReceiver(newIdx); }
    else { lastUsedReceiverIndex = null; }
    receiverForm.reset(); receiverForm.receiverIndex.value = '';
    updateLabelPreviewWithForm();
}
receiverForm.onreset = function () {
    receiverForm.receiverIndex.value = '';
    lastUsedReceiverIndex = null;
    updateLabelPreviewWithForm();
};

// Receiver List Table View
function showReceiversList(filter = '') {
    const arr = getData('receivers');
    receiverList.innerHTML = '';
    arr.filter(receiver =>
        receiver.name.toLowerCase().includes(filter.toLowerCase()) ||
        receiver.mobile.toLowerCase().includes(filter.toLowerCase()) ||
        receiver.city.toLowerCase().includes(filter.toLowerCase()) ||
        receiver.pin.toLowerCase().includes(filter.toLowerCase()) ||
        receiver.state.toLowerCase().includes(filter.toLowerCase())
    ).forEach((receiver, i) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
        <td><input type="checkbox" class="receiver-checkbox" value="${i}"></td>
            <td>${receiver.name}</td>
            <td>${receiver.mobile}</td>
            <td>${receiver.city}</td>
            <td>${receiver.pin}</td>
            <td>${receiver.state}</td>
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
    const arr = getData('receivers');
    fillFormWithReceiver(i);
    receiverForm.receiverIndex.value = i;
    receiverForm.receiverName.focus();
}
// --------- 2-Step Delete Warning (Receiver) -----------
window.deleteReceiver = function (i) {
    if (!confirm("क्या आप वाकई इस Receiver को डिलीट करना चाहते हैं?")) return;
    if (!confirm("फिर से कन्फर्म करें — Receiver डिलीट हो जाएगा!")) return;
    let arr = getData('receivers');
    arr.splice(i, 1); setData('receivers', arr); showReceiversList(receiverSearch.value);
    if (lastUsedReceiverIndex == i) lastUsedReceiverIndex = null;
    updateLabelPreviewWithForm();
}
window.useReceiver = function (i) {
    fillFormWithReceiver(i);
    lastUsedReceiverIndex = i;
}
function fillFormWithReceiver(i) {
    const arr = getData('receivers');
    const d = arr[i];
    receiverForm.receiverIndex.value = i;
    receiverForm.receiverName.value = d.name;
    receiverForm.receiverAddress.value = d.address;
    receiverForm.receiverMobile.value = d.mobile;
    receiverForm.receiverPin.value = d.pin;
    receiverForm.receiverCity.value = d.city;
    receiverForm.receiverState.value = d.state;
    updateLabelPreviewWithForm();
}
receiverSearch.oninput = function () { showReceiversList(receiverSearch.value); }
showReceiversList();
updateLabelPreviewWithForm();

// ========== SENDER MASTER CARD VIEW ==========
function showSenders(filter = '') {
    const arr = getData('senders');
    senderList.innerHTML = '';
    arr.filter(sender =>
        sender.name.toLowerCase().includes(filter.toLowerCase()) ||
        sender.mobile.toLowerCase().includes(filter.toLowerCase()) ||
        sender.city.toLowerCase().includes(filter.toLowerCase()) ||
        sender.pin.toLowerCase().includes(filter.toLowerCase()) ||
        sender.state.toLowerCase().includes(filter.toLowerCase())
    ).forEach((sender, i) => {
        let div = document.createElement('div');
        div.className = "sender-entry";
        div.innerHTML = `
            <input class="sender-radio" name="senderRadio" type="radio" value="${i}" ${i == selectedSenderIndex ? 'checked' : ''} onchange="selectSender(${i})">
            <div class="sender-info">
                <span>${sender.name}</span>
                <small>${sender.mobile}</small>
                <small>${sender.city || ''}, ${sender.state || ''} - ${sender.pin || ''}</small>
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
}
window.editSender = function (i) { openSenderModal(true, i); }
// --------- 2-Step Delete Warning (Sender) -----------
window.deleteSender = function (i) {
    if (!confirm("क्या आप वाकई इस Sender को डिलीट करना चाहते हैं?")) return;
    if (!confirm("फिर से कन्फर्म करें — Sender डिलीट हो जाएगा!")) return;
    let arr = getData('senders');
    arr.splice(i, 1); setData('senders', arr); showSenders(senderSearch.value);
    if (selectedSenderIndex == i) selectedSenderIndex = 0;
    showSenders(senderSearch.value);
    updateLabelPreviewWithForm();
}
senderSearch.oninput = function () { showSenders(senderSearch.value); }
showSenders();

// Sender Modal
addSenderBtn.onclick = () => openSenderModal(false);
closeSenderModal.onclick = () => closeModal();
window.onclick = function (e) { if (e.target == senderModal) closeModal(); }
function openSenderModal(isEdit, idx) {
    senderModal.style.display = 'block';
    senderForm.reset();
    senderForm.senderIndex.value = '';
    senderModalTitle.textContent = isEdit ? "Edit Sender" : "Add Sender";
    if (isEdit) {
        const arr = getData('senders');
        const d = arr[idx];
        senderForm.senderIndex.value = idx;
        senderForm.senderName.value = d.name;
        senderForm.senderAddress.value = d.address;
        senderForm.senderMobile.value = d.mobile;
        senderForm.senderPin.value = d.pin;
        senderForm.senderCity.value = d.city;
        senderForm.senderState.value = d.state;
    }
    senderForm.senderName.focus();
}
function closeModal() {
    senderModal.style.display = 'none';
    senderForm.reset();
    senderForm.senderIndex.value = '';
}
// ------- Sender Validation Added Here ---------
senderForm.onsubmit = function (e) {
    e.preventDefault();
    const d = {
        name: senderForm.senderName.value.trim(),
        address: senderForm.senderAddress.value.trim(),
        mobile: senderForm.senderMobile.value.trim(),
        pin: senderForm.senderPin.value.trim(),
        city: senderForm.senderCity.value.trim(),
        state: senderForm.senderState.value.trim()
    };
    // ---- Validation ----
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
    // ---- Save Logic as usual ----
    let arr = getData('senders');
    const idx = senderForm.senderIndex.value;
    if (idx !== '') { arr[+idx] = d; } else { arr.push(d); }
    setData('senders', arr); showSenders(senderSearch.value);
    closeModal();
};
senderForm.onreset = function () { senderForm.senderIndex.value = ''; };

// ========== PDF & PRINT LABEL ==========
printBtn.onclick = function () {
    let sArr = getData('senders');
    let sender = sArr[selectedSenderIndex] || {};
    let d = {
        name: receiverForm.receiverName.value.trim(),
        address: receiverForm.receiverAddress.value.trim(),
        mobile: receiverForm.receiverMobile.value.trim(),
        pin: receiverForm.receiverPin.value.trim(),
        city: receiverForm.receiverCity.value.trim(),
        state: receiverForm.receiverState.value.trim()
    };
    let html =
        `<b>To:</b><br>
    <b>${d.name || 'Name'}</b><br>
    ${d.address || 'Address'}<br>
    ${d.city || 'City'}, ${d.state || 'State'} - ${d.pin || 'Pin'}<br>
    <b>Mobile:</b> ${d.mobile || 'Mobile'}<br><br>
    <b>From:</b><br>
    <b>${sender.name || 'Sender Name'}</b><br>
    ${sender.address || 'Sender Address'}<br>
    ${sender.city || 'Sender City'}, ${sender.state || 'Sender State'} - ${sender.pin || 'Pin'}<br>
    <b>Mobile:</b> ${sender.mobile || 'Sender Mobile'}`;

    let printWindow = window.open('', '', 'width=600,height=400');
    let style = `<style>
      body{font-family:'Segoe UI',Arial,sans-serif;}
      .labelBox{border:2px solid #1789fa;border-radius:7px;padding:13px 10px;max-width:99vw;}
      .labelBox b{font-size:1.02em;}
    </style>`;
    printWindow.document.write(`<html><head><title>Print Label</title>${style}</head><body>
      <div class="labelBox">${html}</div>
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 350);
};
pdfBtn.onclick = function () {
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a6" });
    let sArr = getData('senders');
    let sender = sArr[selectedSenderIndex] || {};
    let d = {
        name: receiverForm.receiverName.value.trim(),
        address: receiverForm.receiverAddress.value.trim(),
        mobile: receiverForm.receiverMobile.value.trim(),
        pin: receiverForm.receiverPin.value.trim(),
        city: receiverForm.receiverCity.value.trim(),
        state: receiverForm.receiverState.value.trim()
    };
    let y = 12;
    doc.setFontSize(13);
    doc.text("To:", 10, y); y += 5;
    doc.text(d.name || '', 12, y); y += 5;
    doc.text(d.address || '', 12, y); y += 5;
    doc.text(`${d.city || ''}, ${d.state || ''} - ${d.pin || ''}`, 12, y); y += 5;
    doc.text("Mobile: " + (d.mobile || ''), 12, y); y += 7;
    doc.text("From:", 10, y); y += 5;
    doc.text(sender.name || '', 12, y); y += 5;
    doc.text(sender.address || '', 12, y); y += 5;
    doc.text(`${sender.city || ''}, ${sender.state || ''} - ${sender.pin || ''}`, 12, y); y += 5;
    doc.text("Mobile: " + (sender.mobile || ''), 12, y);
    doc.save("shipping-label.pdf");
};


// ======== MULTI SELECT RECEIVER LOGIC ========

let selectedReceiverIndexes = [];

// Table row checkbox
receiverList.onclick = function (e) {
    if (e.target.classList.contains('receiver-checkbox')) {
        const idx = Number(e.target.value);
        if (e.target.checked) {
            if (!selectedReceiverIndexes.includes(idx)) selectedReceiverIndexes.push(idx);
        } else {
            selectedReceiverIndexes = selectedReceiverIndexes.filter(i => i !== idx);
        }
        highlightSelectedRows();
    }
};
// Select All
document.getElementById('selectAllReceivers').onclick = function () {
    const checkboxes = document.querySelectorAll('.receiver-checkbox');
    selectedReceiverIndexes = [];
    checkboxes.forEach(chk => {
        chk.checked = this.checked;
        if (this.checked) selectedReceiverIndexes.push(Number(chk.value));
    });
    highlightSelectedRows();
};
function highlightSelectedRows() {
    const rows = receiverList.querySelectorAll('tr');
    rows.forEach((row, i) => {
        if (selectedReceiverIndexes.includes(i)) row.classList.add('selected');
        else row.classList.remove('selected');
    });
}

// ==== MULTI PRINT ====
document.getElementById('multiPrintBtn').onclick = function () {
    let receivers = getData('receivers');
    let senders = getData('senders');
    let sender = senders[selectedSenderIndex] || {};
    let allLabels = "";
    selectedReceiverIndexes.forEach(idx => {
        let d = receivers[idx];
        allLabels += `<div class="labelBox" style="margin-bottom: 18px; border:2px solid #1789fa;border-radius:7px;padding:13px 10px;">
            <b>To:</b><br>
            <b>${d.name || 'Name'}</b><br>
            ${d.address || 'Address'}<br>
            ${d.city || 'City'}, ${d.state || 'State'} - ${d.pin || 'Pin'}<br>
            <b>Mobile:</b> ${d.mobile || 'Mobile'}<br><br>
            <b>From:</b><br>
            <b>${sender.name || 'Sender Name'}</b><br>
            ${sender.address || 'Sender Address'}<br>
            ${sender.city || 'Sender City'}, ${sender.state || 'Sender State'} - ${sender.pin || 'Pin'}<br>
            <b>Mobile:</b> ${sender.mobile || 'Sender Mobile'}
        </div>`;
    });
    if (!allLabels) {
        alert('Please select at least one receiver!');
        return;
    }
    let printWindow = window.open('', '', 'width=800,height=600');
    let style = `<style>
        body{font-family:'Segoe UI',Arial,sans-serif;}
        .labelBox{margin-bottom:18px; border:2px solid #1789fa; border-radius:7px; padding:13px 10px; max-width:99vw;}
        .labelBox b{font-size:1.02em;}
    </style>`;
    printWindow.document.write(`<html><head><title>Print Labels</title>${style}</head><body>${allLabels}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 450);
};

// ==== MULTI PDF ====
document.getElementById('multiPdfBtn').onclick = function () {
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a6" });
    let receivers = getData('receivers');
    let senders = getData('senders');
    let sender = senders[selectedSenderIndex] || {};
    let first = true;
    selectedReceiverIndexes.forEach(idx => {
        if (!first) doc.addPage();
        first = false;
        let d = receivers[idx];
        let y = 12;
        doc.setFontSize(13);
        doc.text("To:", 10, y); y += 5;
        doc.text(d.name || '', 12, y); y += 5;
        doc.text(d.address || '', 12, y); y += 5;
        doc.text(`${d.city || ''}, ${d.state || ''} - ${d.pin || ''}`, 12, y); y += 5;
        doc.text("Mobile: " + (d.mobile || ''), 12, y); y += 7;
        doc.text("From:", 10, y); y += 5;
        doc.text(sender.name || '', 12, y); y += 5;
        doc.text(sender.address || '', 12, y); y += 5;
        doc.text(`${sender.city || ''}, ${sender.state || ''} - ${sender.pin || ''}`, 12, y); y += 5;
        doc.text("Mobile: " + (sender.mobile || ''), 12, y);
    });
    doc.save("multiple-labels.pdf");
};

// ==== MULTI EXCEL (CSV) ====
document.getElementById('multiExcelBtn').onclick = function () {
    let receivers = getData('receivers');
    let csv = "Name,Mobile,Address,City,Pin,State\n";
    selectedReceiverIndexes.forEach(idx => {
        let d = receivers[idx];
        csv += `"${d.name}","${d.mobile}","${d.address}","${d.city}","${d.pin}","${d.state}"\n`;
    });
    let blob = new Blob([csv], { type: "text/csv" });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "receivers.csv";
    a.click();
};
