// State
let records = JSON.parse(localStorage.getItem('fileMovements')) || [];
let casesDb = typeof CASES_DB !== 'undefined' ? CASES_DB : {};
let assistantsDb = typeof ASSISTANTS_DB !== 'undefined' ? ASSISTANTS_DB : {};
let editingId = null;

// DOM Elements
const form = document.getElementById('movementForm');
const caseNoInput = document.getElementById('caseNo');
const appellantInput = document.getElementById('appellant');
const assistantInput = document.getElementById('assistant');
const destinationInput = document.getElementById('destination');
const dateInput = document.getElementById('movementDate');
const remarksInput = document.getElementById('remarks');
const suggestionsBox = document.getElementById('caseSuggestions');
const historyBody = document.getElementById('historyBody');
const emptyState = document.getElementById('emptyState');

// Filters
const searchFilter = document.getElementById('searchFilter');
const statusFilter = document.getElementById('statusFilter');
const destinationFilter = document.getElementById('destinationFilter');

// Analytics Elements
const statTotal = document.getElementById('statTotal');
const statOut = document.getElementById('statOut');
const statReturned = document.getElementById('statReturned');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // Setup Role Selector
    setupRoleSelector();
    
    renderTable();
});

// Role Logic
function setupRoleSelector() {
    const roleRadios = document.getElementsByName('userRole');

    // Load saved role (default to assistant so incharge requires password)
    const savedRole = localStorage.getItem('fileTrackingRole') || 'assistant';
    let previousRole = savedRole;
    
    const radioToSelect = document.querySelector(`input[name="userRole"][value="${savedRole}"]`);
    if (radioToSelect) radioToSelect.checked = true;
    
    roleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedRole = e.target.value;
            
            if (selectedRole === 'incharge') {
                const pwd = prompt("Enter Section Incharge Password:");
                if (pwd !== "Firstappeal#123") {
                    alert("Incorrect password!");
                    // revert radio
                    document.querySelector(`input[name="userRole"][value="${previousRole}"]`).checked = true;
                    return;
                }
            }
            
            previousRole = selectedRole;
            localStorage.setItem('fileTrackingRole', selectedRole);
            applyRoleUI();
        });
    });
    
    applyRoleUI();
}

function applyRoleUI() {
    const currentRole = document.querySelector('input[name="userRole"]:checked').value;
    const destSelect = document.getElementById('destination');
    
    // Save the current selection if any
    const currentSelection = destSelect.value;
    
    if (currentRole === 'assistant') {
        destSelect.innerHTML = `
            <option value="" disabled selected>Select destination...</option>
            <option value="Section Incharge">Section Incharge</option>
            <option value="Stamp Report Section">Stamp Report Section</option>
            <option value="Copying Department">Copying Department</option>
            <option value="Despatch Section">Despatch Section</option>
            <option value="Lawazima Board">Lawazima Board</option>
            <option value="Inspection">Inspection</option>
            <option value="Disposal Table">Disposal Table</option>
            <option value="Others">Others</option>
        `;
        // try to keep previous selection if it's in the new list
        Array.from(destSelect.options).forEach(opt => {
            if (opt.value === currentSelection) destSelect.value = currentSelection;
        });
    } else {
        destSelect.innerHTML = `
            <option value="" disabled selected>Select destination...</option>
            <option value="Courtroom">Courtroom</option>
            <option value="Stamp Report Section">Stamp Report Section</option>
            <option value="Copying Department">Copying Department</option>
            <option value="Despatch Section">Despatch Section</option>
            <option value="Lawazima Board">Lawazima Board</option>
            <option value="Inspection">Inspection</option>
            <option value="Disposal Table">Disposal Table</option>
            <option value="Others">Others</option>
        `;
        // try to keep previous selection if it's in the new list
        Array.from(destSelect.options).forEach(opt => {
            if (opt.value === currentSelection) destSelect.value = currentSelection;
        });
    }
}

// Case Number Autocomplete
caseNoInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    suggestionsBox.innerHTML = '';
    
    if (!val) {
        suggestionsBox.style.display = 'none';
        appellantInput.value = '';
        assistantInput.value = '';
        return;
    }

    const matches = Object.keys(casesDb).filter(key => key.toLowerCase().includes(val)).slice(0, 5);

    if (matches.length > 0) {
        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = match;
            div.addEventListener('click', () => {
                caseNoInput.value = match;
                appellantInput.value = casesDb[match].appellant || '';
                
                // Auto-populate Dealing Assistant
                let displayVal = match;
                const parts = match.split('/');
                if (parts.length > 1) {
                    displayVal = parts.slice(1).join('/'); // Sometimes assistantsDb keys are just "123/2023" without "FA"
                }
                
                assistantInput.value = assistantsDb[match] || assistantsDb[displayVal] || '';

                suggestionsBox.style.display = 'none';
            });
            suggestionsBox.appendChild(div);
        });
        suggestionsBox.style.display = 'block';
    } else {
        suggestionsBox.style.display = 'none';
        appellantInput.value = '';
        assistantInput.value = '';
    }
});

document.addEventListener('click', (e) => {
    if (e.target !== caseNoInput) suggestionsBox.style.display = 'none';
});

// Form Submit (Create / Update)
form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (editingId) {
        // Update existing
        const index = records.findIndex(r => r.id === editingId);
        if (index !== -1) {
            records[index].caseNo = caseNoInput.value.trim();
            records[index].appellant = appellantInput.value.trim();
            records[index].assistant = assistantInput.value.trim();
            records[index].destination = destinationInput.value;
            records[index].date = dateInput.value;
            records[index].remarks = remarksInput.value.trim();
        }
        editingId = null;
        form.querySelector('.btn-submit').innerHTML = '<i class="fa-solid fa-save"></i> Save Record';
    } else {
        // Create new
        const newRecord = {
            id: Date.now().toString(),
            caseNo: caseNoInput.value.trim(),
            appellant: appellantInput.value.trim(),
            assistant: assistantInput.value.trim(),
            destination: destinationInput.value,
            date: dateInput.value,
            remarks: remarksInput.value.trim(),
            status: 'out',
            timestamp: new Date().toISOString()
        };
        records.unshift(newRecord);
    }

    saveRecords();
    renderTable();
    
    // Reset form
    caseNoInput.value = '';
    appellantInput.value = '';
    assistantInput.value = '';
    remarksInput.value = '';
    caseNoInput.focus();
});

function saveRecords() {
    localStorage.setItem('fileMovements', JSON.stringify(records));
    if (typeof saveToCloud === 'function') {
        saveToCloud(true);
    }
}

function updateAnalytics(recordsToCount) {
    statTotal.textContent = recordsToCount.length;
    statOut.textContent = recordsToCount.filter(r => r.status === 'out').length;
    statReturned.textContent = recordsToCount.filter(r => r.status === 'returned').length;
}

function renderTable() {
    const term = searchFilter.value.toLowerCase();
    const statusVal = statusFilter.value;
    const destVal = destinationFilter.value;

    const filteredRecords = records.filter(record => {
        const matchesSearch = record.caseNo.toLowerCase().includes(term) || (record.appellant && record.appellant.toLowerCase().includes(term));
        const matchesStatus = statusVal === 'all' || record.status === statusVal;
        const matchesDest = destVal === 'all' || record.destination === destVal;
        
        return matchesSearch && matchesStatus && matchesDest;
    });

    updateAnalytics(filteredRecords);
    historyBody.innerHTML = '';
    
    if (filteredRecords.length === 0) {
        emptyState.style.display = 'flex';
        emptyState.innerHTML = '<i class="fa-regular fa-folder-open"></i><p>No records found</p>';
        historyBody.parentElement.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    historyBody.parentElement.style.display = 'table';

    filteredRecords.forEach(record => {
        const tr = document.createElement('tr');
        const dateObj = new Date(record.date);
        const formattedDate = dateObj.toLocaleDateString('en-GB');

        let statusHtml = '';
        if (record.status === 'out') {
            statusHtml = `<span class="status-badge status-out">Sent Out</span>`;
        } else {
            let retDateStr = '';
            if (record.returnDate) {
                const rDateObj = new Date(record.returnDate);
                retDateStr = ` <br><small>(${rDateObj.toLocaleDateString('en-GB')})</small>`;
            }
            statusHtml = `<span class="status-badge status-returned">Returned${retDateStr}</span>`;
        }

        const returnBtnHtml = record.status === 'out'
            ? `<button class="btn-icon return" title="Mark as Returned" onclick="toggleStatus('${record.id}')"><i class="fa-solid fa-rotate-left"></i></button>`
            : `<button class="btn-icon return" title="Mark as Sent Out" onclick="toggleStatus('${record.id}')"><i class="fa-solid fa-share"></i></button>`;

        let rowClass = '';
        if (record.status === 'out') {
            const daysOut = Math.floor((new Date() - dateObj) / (1000 * 60 * 60 * 24));
            if (daysOut >= 7) rowClass = 'row-danger';
            else if (daysOut >= 3) rowClass = 'row-warning';
        }
        if (rowClass) tr.className = rowClass;

        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td><strong>${record.caseNo}</strong></td>
            <td>${record.appellant || '-'}</td>
            <td>${record.assistant || '-'}</td>
            <td>${record.destination}</td>
            <td>${record.remarks || '-'}</td>
            <td>${statusHtml}</td>
            <td class="no-print" style="white-space: nowrap;">
                ${returnBtnHtml}
                <button class="btn-icon" title="Edit Record" onclick="editRecord('${record.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-icon delete" title="Delete Record" onclick="deleteRecord('${record.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        historyBody.appendChild(tr);
    });
}

// Filter Listeners
searchFilter.addEventListener('input', renderTable);
statusFilter.addEventListener('change', renderTable);
destinationFilter.addEventListener('change', renderTable);

// Actions
window.toggleStatus = function(id) {
    const record = records.find(r => r.id === id);
    if (record) {
        if (record.status === 'out') {
            record.status = 'returned';
            record.returnDate = new Date().toISOString().split('T')[0];
        } else {
            record.status = 'out';
            record.returnDate = null;
        }
        saveRecords();
        renderTable();
    }
};

window.deleteRecord = function(id) {
    if (confirm('Are you sure you want to delete this record?')) {
        records = records.filter(r => r.id !== id);
        saveRecords();
        renderTable();
    }
};

window.editRecord = function(id) {
    const record = records.find(r => r.id === id);
    if (record) {
        editingId = id;
        caseNoInput.value = record.caseNo;
        appellantInput.value = record.appellant || '';
        assistantInput.value = record.assistant || '';
        destinationInput.value = record.destination;
        dateInput.value = record.date;
        remarksInput.value = record.remarks;
        form.querySelector('.btn-submit').innerHTML = '<i class="fa-solid fa-check"></i> Update Record';
        window.scrollTo(0, 0);
    }
};

// Export to CSV
document.getElementById('exportBtn').addEventListener('click', () => {
    if (records.length === 0) {
        alert('No records to export');
        return;
    }
    const headers = ['id', 'date', 'caseNo', 'appellant', 'assistant', 'destination', 'remarks', 'status', 'returnDate', 'timestamp'];
    const csvRows = [headers.join(',')];

    records.forEach(r => {
        const row = headers.map(header => `"${(r[header] || '').replace(/"/g, '""')}"`);
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `file_movements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Import CSV
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        // Basic CSV parsing (handles quotes)
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows.length <= 1) {
            alert('CSV is empty or invalid.');
            return;
        }

        const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const required = ['id', 'date', 'caseNo', 'destination', 'status'];
        const isValid = required.every(req => headers.includes(req));

        if (!isValid) {
            alert('Invalid CSV format. Please use a file exported from this system.');
            return;
        }

        let importedCount = 0;
        for (let i = 1; i < rows.length; i++) {
            const rowMatches = rows[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || rows[i].split(',');
            if (!rowMatches) continue;
            
            const values = rowMatches.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
            
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index] !== undefined ? values[index] : '';
            });

            if (!records.find(r => r.id === record.id)) {
                records.push(record);
                importedCount++;
            }
        }

        records.sort((a, b) => b.id.localeCompare(a.id));
        saveRecords();
        renderTable();
        alert(`Successfully imported ${importedCount} new records.`);
        importFile.value = '';
    };
    reader.readAsText(file);
});

// Print
document.getElementById('printBtn').addEventListener('click', () => {
    saveToCloud(true);
    window.print();
});

// ── Local Ethernet Storage Integrations ──────────────────────────
async function saveToCloud(silent = false) {
    try {
        if (window.PortalDB) {
            await window.PortalDB.saveFileTracking(records);
            if (!silent) alert("Tracker state successfully saved to cloud!");
        } else {
            throw new Error('PortalDB not available');
        }
    } catch (error) {
        console.error("Error saving tracker state to cloud:", error);
        if (!silent) alert("Saved locally in browser.");
    }
}

document.getElementById('saveCloudBtn').addEventListener('click', () => {
    saveToCloud(false);
});

document.getElementById('loadCloudBtn').addEventListener('click', async () => {
    if (!confirm("This will overwrite your current screen history with the cloud version. Proceed?")) {
        return;
    }

    try {
        let data = [];
        if (window.PortalDB) {
            data = await window.PortalDB.getFileTracking();
        } else {
            throw new Error('PortalDB not available');
        }

        if (Array.isArray(data) && data.length > 0) {
            records = data;
            localStorage.setItem('fileMovements', JSON.stringify(records));
            renderTable();
            alert("Successfully loaded tracking state from cloud!");
        } else {
            alert("No saved tracking state found on cloud.");
        }
    } catch (error) {
        console.error("Error fetching tracker state from cloud:", error);
        alert("Error loading from cloud.");
    }
});
