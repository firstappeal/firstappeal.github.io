// ── Master Judges List (persisted in LocalStorage) ───────────────────
let JUDGES = JSON.parse(localStorage.getItem('patna_judges_v3')) || [
  "Hon'ble Mr. Justice Ramesh Chand Malviya",
  "Hon'ble Mr. Justice Sourendra Pandey",
  "Hon'ble Mr. Justice Rudra Prakash Mishra"
];

// ── Master Allocation Rules List (persisted in LocalStorage) ──────────
let RULES = JSON.parse(localStorage.getItem('patna_rules_v3')) || [
  { heading: 'any', operator: '<=', year: 1994, judge: "Hon'ble Mr. Justice Ramesh Chand Malviya" },
  { heading: 'any', operator: '<=', year: 2015, judge: "Hon'ble Mr. Justice Sourendra Pandey" },
  { heading: 'any', operator: 'any', year: '', judge: "Hon'ble Mr. Justice Rudra Prakash Mishra" }
];

// ── Default Sample Data from listing.odt ───────────────────────────
const DEFAULT_ROWS = [];

// ── Print Mode State ───────────────────────────────────────────────
let currentPrintMode = 'full'; // 'full' or 'short'

function printShort() {
  currentPrintMode = 'short';
  syncPrintTable();
  saveToCloud(true);
  window.print();
}

function printFull() {
  currentPrintMode = 'full';
  syncPrintTable();
  saveToCloud(true);
  window.print();
}

document.addEventListener('DOMContentLoaded', () => {
  // Pre-populate Header Date with current system date
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('head_date').value = `${day}-${month}-${now.getFullYear()}`;
  
  // Render Judges & Rules lists in the settings UI
  renderJudgesSettings();
  renderRulesSettings();
  
  // Load Default Rows
  DEFAULT_ROWS.forEach(rowData => {
    addNewRow(rowData);
  });
  
  syncHeaders();
  
  // Global click listener to close autocomplete dropdowns
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-cell')) {
      closeAllSuggestions();
    }
  });
});

// ── Save Lists to LocalStorage ──────────────────────────────────────
function saveJudges() {
  localStorage.setItem('patna_judges_v3', JSON.stringify(JUDGES));
  renderJudgesSettings();
  updateAllJudgeDropdowns();
}

function saveRules() {
  localStorage.setItem('patna_rules_v3', JSON.stringify(RULES));
  renderRulesSettings();
  recalculateAllAllocatedJudges();
}

// ── Sync Header Inputs with Print Preview ─────────────────────────
function syncHeaders() {
  document.querySelectorAll('.p_date_span').forEach(span => {
    span.textContent = document.getElementById('head_date').value.trim();
  });
}

// ── Re-calculate Serial Numbers ──────────────────────────────────
function reindexSerialNumbers() {
  const rows = document.querySelectorAll('#editorTableBody tr');
  rows.forEach((row, idx) => {
    row.querySelector('.serial-number').textContent = idx + 1;
  });
  syncPrintTable();
}

// ── Close autocomplete suggestions ───────────────────────────────
function closeAllSuggestions() {
  document.querySelectorAll('.suggestions-list').forEach(div => {
    div.style.display = 'none';
    div.innerHTML = '';
  });
}

// ── Rule Engine: Allocate Judge based on Heading & Year ───────────
function evaluateJudge(heading, caseNoYear) {
  let year = NaN;
  const parts = caseNoYear.split('/');
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    year = parseInt(lastPart, 10);
  }
  
  for (const rule of RULES) {
    // Check heading match
    const headingMatch = (rule.heading === 'any' || rule.heading === heading);
    if (!headingMatch) continue;
    
    // Check year match
    let yearMatch = false;
    if (rule.operator === 'any') {
      yearMatch = true;
    } else if (!isNaN(year) && rule.year !== '') {
      const ruleYear = parseInt(rule.year, 10);
      switch (rule.operator) {
        case '<': yearMatch = (year < ruleYear); break;
        case '<=': yearMatch = (year <= ruleYear); break;
        case '>': yearMatch = (year > ruleYear); break;
        case '>=': yearMatch = (year >= ruleYear); break;
        case '=': yearMatch = (year === ruleYear); break;
      }
    }
    
    if (headingMatch && yearMatch) {
      // Ensure the rule's judge still exists in our judges list
      if (JUDGES.includes(rule.judge)) {
        return rule.judge;
      }
    }
  }
  
  // Default to first Judge if no matches
  return JUDGES[0] || 'Unassigned';
}

// ── Re-run rule engine on all non-overridden rows ──────────────────
function recalculateAllAllocatedJudges() {
  const rows = document.querySelectorAll('#editorTableBody tr');
  rows.forEach(row => {
    const judgeSelect = row.querySelector('.judge-field');
    // If user has not manually overridden, auto-recalculate
    if (judgeSelect && !judgeSelect.dataset.manual) {
      const heading = row.querySelector('.heading-field').value;
      const caseNo = row.querySelector('.case-no-field').value;
      const allocatedJudge = evaluateJudge(heading, caseNo);
      judgeSelect.value = allocatedJudge;
    }
  });
  syncPrintTable();
}

// ── Update Judge selects when Judge List changes ──────────────────
function updateAllJudgeDropdowns() {
  const rows = document.querySelectorAll('#editorTableBody tr');
  rows.forEach(row => {
    const judgeSelect = row.querySelector('.judge-field');
    if (judgeSelect) {
      const currentSelected = judgeSelect.value;
      
      // Re-populate select options
      judgeSelect.innerHTML = JUDGES.map(j => `<option value="${j}">${j}</option>`).join('');
      
      // Restore selected if still valid, else fall back to auto-calculate
      if (JUDGES.includes(currentSelected)) {
        judgeSelect.value = currentSelected;
      } else {
        delete judgeSelect.dataset.manual; // Clear manual flag since judge is gone
        const heading = row.querySelector('.heading-field').value;
        const caseNo = row.querySelector('.case-no-field').value;
        judgeSelect.value = evaluateJudge(heading, caseNo);
      }
    }
  });
  syncPrintTable();
}

// ── Add New Row to the Editor Table ────────────────────────────────
function addNewRow(data = { nature: 'FA', case_no: '', appellant: '', assistant: '', heading: '', direction: '', remarks: 'Fixed' }) {
  const tbody = document.getElementById('editorTableBody');
  const tr = document.createElement('tr');
  const rowId = 'row_' + Math.random().toString(36).substr(2, 9);
  
  const headingVal = typeof data.heading !== 'undefined' ? data.heading : '';
  const remarksVal = data.remarks || 'Fixed';
  const assistantVal = data.assistant || '';
  
  // Calculate allocated judge
  const allocatedJudge = evaluateJudge(headingVal, data.case_no);
  
  tr.id = rowId;
  tr.innerHTML = `
    <td class="serial-number" style="text-align: center; font-weight: 600; color: #475569; vertical-align: middle;"></td>
    <td style="text-align: center; font-weight: 600; color: #334155; vertical-align: middle;">
      <span class="nature-label">FA</span>
    </td>
    <td class="autocomplete-cell">
      <input type="text" class="cell-input case-no-field" value="${data.case_no}" placeholder="जैसे: 47/2024" autocomplete="off" />
      <div class="suggestions-list" style="display: none;"></div>
    </td>
    <td>
      <input type="text" class="cell-input appellant-field" value="${data.appellant}" oninput="syncPrintTable()" />
    </td>
    <td>
      <input type="text" class="cell-input assistant-field" value="${assistantVal}" oninput="syncPrintTable()" />
    </td>
    <td>
      <select class="cell-input heading-field" onchange="handleHeadingChange(this)">
        <option value="" ${headingVal === '' ? 'selected' : ''}></option>
        <option value="Office notes" ${headingVal === 'Office notes' ? 'selected' : ''}>Office notes</option>
        <option value="On Petition" ${headingVal === 'On Petition' || headingVal === 'On petition' ? 'selected' : ''}>On Petition</option>
        <option value="Hearing" ${headingVal === 'Hearing' ? 'selected' : ''}>Hearing</option>
        <option value="To Be Mentioned" ${headingVal === 'To Be Mentioned' ? 'selected' : ''}>To Be Mentioned</option>
      </select>
    </td>
    <td>
      <input type="text" class="cell-input direction-field" value="${data.direction}" oninput="syncPrintTable()" />
    </td>
    <td>
      <select class="cell-input remarks-field" onchange="syncPrintTable()">
        <option value=""></option>
        <option value="Fixed" ${remarksVal === 'Fixed' || remarksVal === 'fixed' ? 'selected' : ''}>Fixed</option>
        <option value="Adjourned" ${remarksVal === 'Adjourned' || remarksVal === 'Adj.' ? 'selected' : ''}>Adjourned</option>
        <option value="Fixed Vide Bench Slip" ${remarksVal === 'Fixed Vide Bench Slip' || remarksVal === 'Fixed vide Bench Slip' ? 'selected' : ''}>Fixed Vide Bench Slip</option>
      </select>
    </td>
    <td>
      <select class="cell-input judge-field" onchange="handleJudgeManualChange(this)">
        ${JUDGES.map(j => `<option value="${j}" ${j === allocatedJudge ? 'selected' : ''}>${j}</option>`).join('')}
      </select>
    </td>
    <td style="text-align: center; vertical-align: middle;">
      <button class="btn btn-danger-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteRow('${rowId}')">❌</button>
    </td>
  `;
  
  tbody.appendChild(tr);
  
  // Setup Autocomplete on Case Number
  const caseNoInput = tr.querySelector('.case-no-field');
  const suggestionsDiv = tr.querySelector('.suggestions-list');
  const appellantInput = tr.querySelector('.appellant-field');
  const judgeSelect = tr.querySelector('.judge-field');
  
  let activeIndex = -1;
  
  caseNoInput.addEventListener('input', () => {
    // Auto-calculate judge if case number changed
    if (!judgeSelect.dataset.manual) {
      const heading = tr.querySelector('.heading-field').value;
      judgeSelect.value = evaluateJudge(heading, caseNoInput.value);
    }
    
    // Auto-populate Assistant if matches
    const assistantInput = tr.querySelector('.assistant-field');
    const caseVal = caseNoInput.value.trim();
    if (typeof ASSISTANTS_DB !== 'undefined' && ASSISTANTS_DB[caseVal]) {
      assistantInput.value = ASSISTANTS_DB[caseVal];
    } else {
      assistantInput.value = '';
    }
    
    syncPrintTable();
    
    const query = caseNoInput.value.trim().toUpperCase().replace(/\s+/g, '');
    activeIndex = -1;
    
    if (!query || typeof CASES_DB === 'undefined') {
      suggestionsDiv.style.display = 'none';
      if (!query) {
        appellantInput.value = '';
        syncPrintTable();
      }
      return;
    }
    
    const matches = [];
    for (const key of Object.keys(CASES_DB)) {
      const normalizedKey = key.toUpperCase().replace(/\s+/g, '');
      if (normalizedKey.includes(query)) {
        matches.push(key);
      }
      if (matches.length >= 10) break;
    }
    
    if (matches.length === 0) {
      suggestionsDiv.style.display = 'none';
      return;
    }
    
    renderSuggestions(matches);
  });
  
  caseNoInput.addEventListener('keydown', (e) => {
    const items = suggestionsDiv.querySelectorAll('.suggestion-item');
    if (!items.length) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex > -1 && items[activeIndex]) {
        selectCase(items[activeIndex].textContent);
      } else if (items.length > 0) {
        selectCase(items[0].textContent);
      }
    } else if (e.key === 'Escape') {
      suggestionsDiv.style.display = 'none';
    }
  });
  
  function updateActiveItem(items) {
    items.forEach((item, index) => {
      if (index === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }
  
  function renderSuggestions(matches) {
    suggestionsDiv.innerHTML = '';
    matches.forEach(match => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = match;
      div.addEventListener('click', () => {
        selectCase(match);
      });
      suggestionsDiv.appendChild(div);
    });
    suggestionsDiv.style.display = 'block';
  }
  
  function selectCase(selectedKey) {
    let displayVal = selectedKey;
    const parts = selectedKey.split('/');
    if (parts.length > 1) {
      displayVal = parts.slice(1).join('/');
    }
    
    caseNoInput.value = displayVal;
    suggestionsDiv.style.display = 'none';
    
    const caseData = CASES_DB[selectedKey];
    if (caseData && caseData.appellant) {
      appellantInput.value = caseData.appellant;
    }
    
    // Recalculate judge
    if (!judgeSelect.dataset.manual) {
      const heading = tr.querySelector('.heading-field').value;
      judgeSelect.value = evaluateJudge(heading, displayVal);
    }
    
    // Auto-populate Assistant
    const assistantInput = tr.querySelector('.assistant-field');
    if (typeof ASSISTANTS_DB !== 'undefined' && ASSISTANTS_DB[displayVal]) {
      assistantInput.value = ASSISTANTS_DB[displayVal];
    } else {
      assistantInput.value = '';
    }
    
    syncPrintTable();
  }
  
  reindexSerialNumbers();
}

// ── Heading Change Handler ────────────────────────────────────────
function handleHeadingChange(selectElem) {
  const tr = selectElem.closest('tr');
  const caseNo = tr.querySelector('.case-no-field').value;
  const judgeSelect = tr.querySelector('.judge-field');
  
  if (!judgeSelect.dataset.manual) {
    judgeSelect.value = evaluateJudge(selectElem.value, caseNo);
  }
  syncPrintTable();
}

// ── Manual Judge Change Handler ───────────────────────────────────
function handleJudgeManualChange(selectElem) {
  // Mark as manually overridden
  selectElem.dataset.manual = 'true';
  syncPrintTable();
}

// ── Delete Row ────────────────────────────────────────────────────
function deleteRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
    row.remove();
    reindexSerialNumbers();
  }
}

// ── Clear All Rows ────────────────────────────────────────────────
function clearAllRows() {
  if (confirm("क्या आप पूरी सूची साफ करना चाहते हैं?")) {
    document.getElementById('editorTableBody').innerHTML = '';
    syncPrintTable();
  }
}

// ── Sync Editor Table to Print Table (Grouped by Judge) ──────────
function syncPrintTable() {
  const printPage = document.getElementById('printPage');
  printPage.innerHTML = '';
  
  const courtHeaderVal = document.getElementById('head_court').value.trim() || 'IN THE HIGH COURT OF JUDICATURE AT PATNA';
  const dateVal = document.getElementById('head_date').value.trim();
  
  // 1. Gather all case data
  const rows = document.querySelectorAll('#editorTableBody tr');
  const groupedCases = {};
  
  // Initialize groupings for all current Judges
  JUDGES.forEach(j => {
    groupedCases[j] = [];
  });
  
  rows.forEach((row) => {
    const nature = row.querySelector('.nature-label').textContent.trim();
    const case_no = row.querySelector('.case-no-field').value.trim();
    const appellant = row.querySelector('.appellant-field').value.trim();
    const assistant = row.querySelector('.assistant-field').value.trim();
    const heading = row.querySelector('.heading-field').value.trim();
    const direction = row.querySelector('.direction-field').value.trim();
    const remarks = row.querySelector('.remarks-field').value.trim();
    const judge = row.querySelector('.judge-field').value;
    
    if (!groupedCases[judge]) {
      groupedCases[judge] = [];
    }
    
    groupedCases[judge].push({ nature, case_no, appellant, assistant, heading, direction, remarks });
  });
  
  // 2. Render separate tables for Judges who have cases
  let firstRender = true;
  JUDGES.forEach(judgeName => {
    const cases = groupedCases[judgeName] || [];
    if (cases.length === 0) return; // Skip if no cases assigned to this Judge
    
    // Sort cases in ascending order according to year and case number
    cases.sort((a, b) => {
      const parseCaseNo = str => {
        const firstCase = str.split(/\bwith\b/i)[0].trim();
        const parts = firstCase.split('/');
        let year = 0, num = 0;
        if (parts.length >= 2) {
          year = parseInt(parts[parts.length - 1], 10) || 0;
          num = parseInt(parts[parts.length - 2], 10) || 0;
        } else if (parts.length === 1) {
          num = parseInt(parts[0], 10) || 0;
        }
        return { year, num };
      };
      const aVal = parseCaseNo(a.case_no);
      const bVal = parseCaseNo(b.case_no);
      if (aVal.year !== bVal.year) {
        return aVal.year - bVal.year;
      }
      return aVal.num - bVal.num;
    });
    
    const judgeSection = document.createElement('div');
    judgeSection.className = 'print-judge-section';
    
      let theadHTML = '';
      if (currentPrintMode === 'short') {
        theadHTML = `
          <tr>
            <th style="width: 10%; text-align: center;">Sl. No.</th>
            <th style="width: 20%;">Case no. and Year</th>
            <th style="width: 50%;">Name of Appellant</th>
            <th style="width: 20%;">Dealing Assistant</th>
          </tr>
        `;
      } else {
        theadHTML = `
          <tr>
            <th style="width: 5%; text-align: center;">Sl. No.</th>
            <th style="width: 8%; text-align: center;">Nature</th>
            <th style="width: 15%;">Case no. and Year</th>
            <th style="width: 32%;">Name of Appellant</th>
            <th style="width: 15%;">Heading</th>
            <th style="width: 15%;">Specific direction for listing if any</th>
            <th style="width: 10%;">Remarks</th>
          </tr>
        `;
      }

    judgeSection.innerHTML = `
      <div class="print-header">
        <h3>${courtHeaderVal}</h3>
        <h4>LIST OF FA CASES BEFORE: ${judgeName.toUpperCase()}</h4>
        <div class="print-date-row">
          <span>Date for Listing: <strong>${dateVal}</strong></span>
        </div>
      </div>
      
      <table class="print-table">
        <thead>
          ${theadHTML}
        </thead>
        <tbody>
          ${cases.map((c, idx) => {
            let formattedCaseNo = c.case_no || '&nbsp;';
            if (c.case_no && /\bwith\b/i.test(c.case_no)) {
              const nature = (c.nature || '').trim();
              formattedCaseNo = c.case_no.split(/\bwith\b/i).map((part, index) => {
                let p = part.trim();
                if (index > 0) {
                  if (nature && !p.toLowerCase().startsWith(nature.toLowerCase())) {
                    p = nature + ' ' + p;
                  }
                  return 'with ' + p;
                }
                return p;
              }).join('<br/>');
            }
            
            let rowHTML = '';
            if (currentPrintMode === 'short') {
              rowHTML = `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${formattedCaseNo}</td>
                <td>${c.appellant || '&nbsp;'}</td>
                <td>${c.assistant || '&nbsp;'}</td>
              </tr>
              `;
            } else {
              rowHTML = `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="text-align: center;">${c.nature || '&nbsp;'}</td>
                <td>${formattedCaseNo}</td>
                <td>${c.appellant || '&nbsp;'}</td>
                <td>${c.heading || '&nbsp;'}</td>
                <td>${c.direction || '&nbsp;'}</td>
                <td>${c.remarks || '&nbsp;'}</td>
              </tr>
              `;
            }
            return rowHTML;
          }).join('')}
        </tbody>
      </table>
    `;
    
    printPage.appendChild(judgeSection);
  });
}

// ── Judges List Settings UI Renderer ──────────────────────────────
function renderJudgesSettings() {
  const ul = document.getElementById('judgesListUI');
  ul.innerHTML = '';
  
  JUDGES.forEach((judge, index) => {
    const li = document.createElement('li');
    li.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 6px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 500;";
    li.innerHTML = `
      <span>${judge}</span>
      <button type="button" class="btn btn-danger-outline" style="padding: 2px 6px; font-size: 0.7rem;" onclick="deleteJudge(${index})">❌</button>
    `;
    ul.appendChild(li);
  });
}

function addJudgePrompt() {
  const name = prompt("नए न्यायाधीश का नाम प्रविष्ट करें:");
  if (name && name.trim()) {
    const trimmed = name.trim();
    if (!JUDGES.includes(trimmed)) {
      JUDGES.push(trimmed);
      saveJudges();
    }
  }
}

function deleteJudge(index) {
  if (confirm(`क्या आप न्यायाधीश "${JUDGES[index]}" को हटाना चाहते हैं?`)) {
    JUDGES.splice(index, 1);
    saveJudges();
  }
}

// ── Rules List Settings UI Renderer ───────────────────────────────
function renderRulesSettings() {
  const tbody = document.getElementById('rulesTableBody');
  tbody.innerHTML = '';
  
  RULES.forEach((rule, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <select class="cell-input rule-heading" style="padding: 4px;" onchange="updateRule(${index}, 'heading', this.value)">
          <option value="any" ${rule.heading === 'any' ? 'selected' : ''}>Any Heading</option>
          <option value="Office notes" ${rule.heading === 'Office notes' ? 'selected' : ''}>Office notes</option>
          <option value="On Petition" ${rule.heading === 'On Petition' ? 'selected' : ''}>On Petition</option>
          <option value="Hearing" ${rule.heading === 'Hearing' ? 'selected' : ''}>Hearing</option>
          <option value="To Be Mentioned" ${rule.heading === 'To Be Mentioned' ? 'selected' : ''}>To Be Mentioned</option>
        </select>
      </td>
      <td>
        <div style="display: flex; gap: 4px;">
          <select class="cell-input rule-op" style="padding: 4px; width: 80px;" onchange="updateRule(${index}, 'operator', this.value)">
            <option value="any" ${rule.operator === 'any' ? 'selected' : ''}>Any Year</option>
            <option value="<" ${rule.operator === '<' ? 'selected' : ''}>&lt;</option>
            <option value="<=" ${rule.operator === '<=' ? 'selected' : ''}>&le;</option>
            <option value=">" ${rule.operator === '>' ? 'selected' : ''}>&gt;</option>
            <option value=">=" ${rule.operator === '>=' ? 'selected' : ''}>&ge;</option>
            <option value="=" ${rule.operator === '=' ? 'selected' : ''}>=</option>
          </select>
          <input type="number" class="cell-input rule-year" style="padding: 4px; width: 70px; ${rule.operator === 'any' ? 'display:none;' : ''}" value="${rule.year}" placeholder="Year" oninput="updateRule(${index}, 'year', this.value)" />
        </div>
      </td>
      <td>
        <select class="cell-input rule-judge" style="padding: 4px;" onchange="updateRule(${index}, 'judge', this.value)">
          ${JUDGES.map(j => `<option value="${j}" ${j === rule.judge ? 'selected' : ''}>${j}</option>`).join('')}
        </select>
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn btn-danger-outline" style="padding: 2px 6px; font-size: 0.75rem;" onclick="deleteRule(${index})">❌</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function addRuleRow() {
  const defaultJudge = JUDGES[0] || 'Unassigned';
  RULES.push({ heading: 'any', operator: 'any', year: '', judge: defaultJudge });
  saveRules();
}

function updateRule(index, field, value) {
  RULES[index][field] = value;
  saveRules();
}

function deleteRule(index) {
  if (confirm("क्या आप इस नियम को हटाना चाहते हैं?")) {
    RULES.splice(index, 1);
    saveRules();
  }
}

// ── PDF File Upload & Parsing ──────────────────────────────────────
async function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (typeof pdfjsLib === 'undefined') {
    alert("PDF library is not loaded. Ensure you have an internet connection for the first load.");
    event.target.value = '';
    return;
  }

  const labelBtn = event.target.closest('label');
  const originalLabelText = labelBtn ? labelBtn.innerHTML : '';

  try {
    if (labelBtn) {
      const fileInput = labelBtn.querySelector('input');
      labelBtn.innerHTML = "⏳ PDF लोड हो रहा है...";
      if (fileInput) labelBtn.appendChild(fileInput);
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
    const pdf = await loadingTask.promise;
    
    // Parallel Page Extraction in Chunks of 10 pages
    const pageTexts = new Array(pdf.numPages);
    const BATCH_SIZE = 10;
    
    for (let i = 1; i <= pdf.numPages; i += BATCH_SIZE) {
      const endPage = Math.min(i + BATCH_SIZE - 1, pdf.numPages);
      if (labelBtn) {
        const fileInput = labelBtn.querySelector('input');
        labelBtn.innerHTML = `⏳ पार्सिंग... (${i}-${endPage}/${pdf.numPages})`;
        if (fileInput) labelBtn.appendChild(fileInput);
      }
      
      const pagePromises = [];
      for (let pageNum = i; pageNum <= endPage; pageNum++) {
        pagePromises.push((async (pNum) => {
          const page = await pdf.getPage(pNum);
          const textContent = await page.getTextContent();
          pageTexts[pNum - 1] = textContent.items.map(item => item.str).join(' ');
        })(pageNum));
      }
      await Promise.all(pagePromises);
      await new Promise(r => setTimeout(r, 0)); // yield to UI
    }
    
    const fullText = pageTexts.join(' ');
    
    // Look for pattern like 47/2024 or FA/47/2024
    const caseNoRegex = /(?:^|[^\d/])(\d{1,5}\s*\/\s*\d{4})(?=[^\d/]|$)/g;
    const matchesIterator = fullText.matchAll(caseNoRegex);
    const matches = Array.from(matchesIterator).map(m => m[1]);
    
    if (matches && matches.length > 0) {
      const uniqueMatches = [...new Set(matches.map(m => m.replace(/\s+/g, '')))];
      
      // Fast O(1) lookup map for CASES_DB
      const casesMapBySuffix = {};
      if (typeof CASES_DB !== 'undefined') {
        for (const key of Object.keys(CASES_DB)) {
          const parts = key.split('/');
          if (parts.length >= 2) {
            const suffix = parts.slice(1).join('/');
            casesMapBySuffix[suffix] = CASES_DB[key].appellant || '';
          }
        }
      }

      for (const caseNoVal of uniqueMatches) {
        const appellantName = casesMapBySuffix[caseNoVal] || '';
        const assistantName = (typeof ASSISTANTS_DB !== 'undefined' && ASSISTANTS_DB[caseNoVal]) ? ASSISTANTS_DB[caseNoVal] : '';
        
        addNewRow({ 
          nature: 'FA', 
          case_no: caseNoVal, 
          appellant: appellantName, 
          assistant: assistantName,
          heading: '', 
          direction: '', 
          remarks: 'Fixed' 
        });
      }
      
      syncPrintTable();
      alert(`PDF से सफलतापूर्वक ${uniqueMatches.length} केस निकाले गए।`);
    } else {
      alert("इस PDF से कोई केस नंबर (जैसे 47/2024) नहीं मिला। (No case number found in PDF)");
    }
  } catch (error) {
    console.error('Error parsing PDF:', error);
    alert("PDF पार्स करने में त्रुटि हुई। (Error parsing PDF)");
  } finally {
    if (labelBtn && originalLabelText) labelBtn.innerHTML = originalLabelText;
    event.target.value = '';
  }
}

// ── Local Ethernet Storage Integrations ──────────────────────────
async function saveToCloud(silent = false) {
  const dateVal = document.getElementById('head_date').value.trim();
  if (!dateVal) {
    if (!silent) alert("कृपया दिनांक दर्ज करें। (Please enter a date.)");
    return;
  }
  
  const rows = document.querySelectorAll('#editorTableBody tr');
  if (rows.length === 0) {
    if (!silent) alert("सहेजने के लिए कोई केस नहीं है। (No cases to save.)");
    return;
  }
  
  const cases = [];
  rows.forEach(row => {
    cases.push({
      nature: row.querySelector('.nature-label').textContent.trim(),
      case_no: row.querySelector('.case-no-field').value.trim(),
      appellant: row.querySelector('.appellant-field').value.trim(),
      assistant: row.querySelector('.assistant-field').value.trim(),
      heading: row.querySelector('.heading-field').value.trim(),
      direction: row.querySelector('.direction-field').value.trim(),
      remarks: row.querySelector('.remarks-field').value.trim(),
      judge: row.querySelector('.judge-field').value
    });
  });
  
  const headerDetails = {
    head_court: document.getElementById('head_court').value.trim(),
    head_bench: document.getElementById('head_bench').value.trim(),
    date: dateVal
  };
  
  try {
    if (window.PortalDB) {
      await window.PortalDB.insertCauseList(headerDetails, cases);
      if (!silent) alert("सफलतापूर्वक क्लाउड में सहेजा गया! (Successfully saved to cloud!)");
    } else {
      throw new Error('PortalDB not available');
    }
  } catch (error) {
    console.error("Error saving to cloud:", error);
    if (!silent) alert("क्लाउड में सहेजने में त्रुटि। (Error saving to cloud.)");
  }
}

async function viewCloudLists() {
  const datePrompt = prompt("जिस दिनांक की सूची देखनी है उसे दर्ज करें (e.g. 24-07-2026):", document.getElementById('head_date').value.trim());
  if (!datePrompt) return;
  
  try {
    let data = [];
    if (window.PortalDB) {
      data = await window.PortalDB.getCauseLists();
    } else {
      throw new Error('PortalDB not available');
    }

    if (data.length === 0) {
      alert("इस दिनांक के लिए कोई सूची नहीं मिली। (No list found for this date.)");
      return;
    }
    
    const listData = data.find(d => (d.header && d.header.date === datePrompt) || d.date === datePrompt) || data[0];
    
    if (listData.header) {
      document.getElementById('head_court').value = listData.header.head_court || '';
      document.getElementById('head_bench').value = listData.header.head_bench || '';
    }
    if (listData.date) {
      document.getElementById('head_date').value = listData.date;
    }
    syncHeaders();
    
    document.getElementById('editorTableBody').innerHTML = '';
    if (listData.cases && Array.isArray(listData.cases)) {
      listData.cases.forEach(caseData => {
        addNewRow(caseData);
        const rows = document.querySelectorAll('#editorTableBody tr');
        const lastRow = rows[rows.length - 1];
        if (lastRow) {
          const judgeSelect = lastRow.querySelector('.judge-field');
          if (judgeSelect && caseData.judge) {
             judgeSelect.value = caseData.judge;
             judgeSelect.dataset.manual = 'true';
          }
        }
      });
    }
    
    syncPrintTable();
    alert("Cause list successfully loaded from cloud!");
    
  } catch (error) {
    console.error("Error fetching from local server:", error);
    alert("Error loading cause list from cloud. Please try again.");
  }
}

// ── Search History ──────────────────────────────────────────────
function openSearchModal() {
  document.getElementById('searchHistoryModal').style.display = 'flex';
}

function closeSearchModal() {
  document.getElementById('searchHistoryModal').style.display = 'none';
  document.getElementById('searchHistoryResults').style.display = 'none';
  document.getElementById('searchHistoryInput').value = '';
}

async function searchCaseHistory() {
  const searchInput = document.getElementById('searchHistoryInput').value.trim();
  if (!searchInput) {
    alert("कृपया केस नंबर दर्ज करें। (Please enter a Case Number)");
    return;
  }

  const normalizedSearch = searchInput.toLowerCase().replace(/\s+/g, '');
  const resultsContainer = document.getElementById('searchHistoryResults');
  const loading = document.getElementById('searchHistoryLoading');
  const btn = document.getElementById('searchHistoryBtn');

  resultsContainer.style.display = 'none';
  loading.style.display = 'block';
  btn.disabled = true;

  try {
    let data = [];
    if (window.PortalDB) {
      data = await window.PortalDB.getCauseLists();
    } else {
      throw new Error('PortalDB not available');
    }

    const latestMatches = new Map();

    if (data.length > 0) {
      data.forEach(list => {
        if (list.cases && Array.isArray(list.cases)) {
          list.cases.forEach(c => {
            const caseNo = (c.case_no || '').toLowerCase().replace(/\s+/g, '');
            if (caseNo.includes(normalizedSearch)) {
              if (!latestMatches.has(caseNo)) {
                latestMatches.set(caseNo, {
                  date: list.created_at ? list.created_at.split('T')[0] : (list.date || '-'),
                  heading: c.heading || '-',
                  judge: c.judge || '-',
                  exactCaseNo: c.case_no
                });
              }
            }
          });
        }
      });
    }

    const matches = Array.from(latestMatches.values());

    if (matches.length === 0) {
      resultsContainer.innerHTML = `<div style="text-align: center; color: #d93025; font-weight: bold; padding: 15px;">कोई रिकॉर्ड नहीं मिला। (No records found for '${searchInput}')</div>`;
    } else {
      let html = `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                    <thead>
                      <tr style="background: #f1f3f4; border-bottom: 2px solid #ddd;">
                        <th style="padding: 10px;">Latest Date</th>
                        <th style="padding: 10px;">Case No.</th>
                        <th style="padding: 10px;">Heading</th>
                        <th style="padding: 10px;">Judge</th>
                      </tr>
                    </thead>
                    <tbody>`;
      matches.forEach(m => {
        html += `<tr style="border-bottom: 1px solid #eee;">
                   <td style="padding: 10px; font-weight: bold; color: #1a73e8; white-space: nowrap;">${m.date}</td>
                   <td style="padding: 10px;">${m.exactCaseNo}</td>
                   <td style="padding: 10px;">${m.heading}</td>
                   <td style="padding: 10px;">${m.judge}</td>
                 </tr>`;
      });
      html += `</tbody></table>`;
      resultsContainer.innerHTML = html;
    }

    resultsContainer.style.display = 'block';
  } catch (error) {
    console.error("Error searching history:", error);
    alert("इतिहास खोजने में त्रुटि। (Error searching history.)");
  } finally {
    loading.style.display = 'none';
    btn.disabled = false;
  }
}
