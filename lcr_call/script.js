/* ============================================================
   LCR CALL FORM – JAVASCRIPT LOGIC
   ============================================================ */

// ── Field mapping: editor-id → print-element-id ──────────────
const FIELD_MAP = {
  case_type         : 'p_case_type',
  case_no           : 'p_case_no',
  case_year         : 'p_case_year',
  appeal_from       : 'p_appeal_from',
  appeal_from_no    : 'p_appeal_from_no',
  appeal_from_year  : 'p_appeal_from_year',
  court_of_the      : 'p_court_of_the',
  arising_out_of    : 'p_arising_out_of',
  appellant         : 'p_appellant',
  respondent        : 'p_respondent',
  recipient_title   : 'p_recipient_title',
  recipient_address : 'p_recipient_address',
  custom_date       : 'p_custom_date',
  letter_no         : 'p_letter_no',
  file_no           : 'p_file_no',
  section_deptt     : 'p_section_deptt',
};

// Appeal abbreviation expansions
const APPEAL_TYPES = {
  'FA': 'First Appeal',
  'MA': 'Miscellaneous Appeal',
  'CA': 'Civil Appeal',
  'SA': 'Second Appeal'
};

// ── Format Date: e.g. 08th July , 2026 ───────────────────────
function getFormattedCurrentDate() {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = months[now.getMonth()];
  
  // Calculate ordinal suffix
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) {
    suffix = "st";
  } else if (day === 2 || day === 22) {
    suffix = "nd";
  } else if (day === 3 || day === 23) {
    suffix = "rd";
  }
  
  const paddedDay = String(day).padStart(2, '0') + suffix;
  return `${paddedDay} ${monthName} , ${year}`;
}

function syncFields() {
  for (const [editorId, printId] of Object.entries(FIELD_MAP)) {
    const input = document.getElementById(editorId);
    const output = document.getElementById(printId);
    if (input && output) {
      // Use &nbsp; (non-breaking space) when input is empty to preserve dotted line height
      output.textContent = input.value.trim() || '\u00A0'; 
    }
  }

  const bodyParagraph = document.getElementById('p_body_paragraph');
  if (bodyParagraph) {
    bodyParagraph.textContent = `The above mentioned appeal having been preferred to this court, I am directed to ask you to be so good as to transmit to this office the record connected there with within 7 days from the receipt by you of this letter.`;
  }
}

// ── Initialize Application ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Auto-populate current date
  const dateInput = document.getElementById('custom_date');
  if (dateInput && !dateInput.value) {
    dateInput.value = getFormattedCurrentDate();
  }

  // 2. Set default values for recipient to assist user
  const recTitle = document.getElementById('recipient_title');
  const recAddr = document.getElementById('recipient_address');
  if (recTitle && !recTitle.value) {
    recTitle.value = "District and Sessions Judge";
  }
  if (recAddr && !recAddr.value) {
    recAddr.value = "Patna";
  }

  // 3. Add change and input listeners to editor fields
  for (const editorId of Object.keys(FIELD_MAP)) {
    const input = document.getElementById(editorId);
    if (input) {
      input.addEventListener('input', syncFields);
      input.addEventListener('change', syncFields);
    }
  }

  // 3b. Auto-populate Recipient from Court of the
  const courtOfTheInput = document.getElementById('court_of_the');
  if (courtOfTheInput && recTitle && recAddr) {
    courtOfTheInput.addEventListener('input', () => {
      // Only auto-populate if user is typing in court_of_the
      const val = courtOfTheInput.value;
      if (val) {
        const parts = val.split(',');
        if (parts.length > 1) {
          recTitle.value = parts[0].trim();
          recAddr.value = parts.slice(1).join(',').trim();
        } else {
          recTitle.value = val.trim();
          recAddr.value = '';
        }
        syncFields();
      }
    });
  }

  // 4. Initial Sync to fill A4 page values
  syncFields();

  // 5. Autocomplete & Auto-populate Logic
  const sankhyaInput = document.getElementById('sankhya');
  const suggestionsDiv = document.getElementById('sankhyaSuggestions');

  if (sankhyaInput && suggestionsDiv && typeof CASES_DB !== 'undefined') {
    let activeIndex = -1;

    sankhyaInput.addEventListener('input', () => {
      const query = sankhyaInput.value.trim().toUpperCase().replace(/\s+/g, '');
      activeIndex = -1;

      if (!query) {
        suggestionsDiv.style.display = 'none';
        return;
      }

      // Filter matches from cases database
      const matches = Object.keys(CASES_DB).filter(caseKey => {
        const normalizedKey = caseKey.toUpperCase().replace(/\s+/g, '');
        return normalizedKey.includes(query);
      }).slice(0, 10);

      // Render Suggestions List
      suggestionsDiv.innerHTML = '';
      if (matches.length > 0) {
        matches.forEach((match, index) => {
          const item = document.createElement('div');
          item.className = 'suggestion-item';
          item.textContent = match;
          item.addEventListener('click', () => selectCase(match));
          suggestionsDiv.appendChild(item);
        });
        suggestionsDiv.style.display = 'block';
      } else {
        suggestionsDiv.style.display = 'none';
      }
    });

    // Keyboard navigation inside suggestions list
    sankhyaInput.addEventListener('keydown', (e) => {
      const items = suggestionsDiv.querySelectorAll('.suggestion-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
          activeIndex = (activeIndex + 1) % items.length;
          updateActiveSuggestion(items);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) {
          activeIndex = (activeIndex - 1 + items.length) % items.length;
          updateActiveSuggestion(items);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          items[activeIndex].click();
        } else if (items.length > 0) {
          items[0].click();
        }
      } else if (e.key === 'Escape') {
        suggestionsDiv.style.display = 'none';
      }
    });

    // Check match on input blur
    sankhyaInput.addEventListener('blur', () => {
      setTimeout(() => {
        const val = sankhyaInput.value.trim();
        const exactMatch = Object.keys(CASES_DB).find(caseKey => 
          caseKey.toUpperCase().replace(/\s+/g, '') === val.toUpperCase().replace(/\s+/g, '')
        );
        if (exactMatch) {
          selectCase(exactMatch);
        }
      }, 200);
    });

    function updateActiveSuggestion(items) {
      items.forEach((item, index) => {
        if (index === activeIndex) {
          item.classList.add('active');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('active');
        }
      });
    }

    // Populate fields when case is selected
    function selectCase(caseKey) {
      sankhyaInput.value = caseKey;
      suggestionsDiv.style.display = 'none';

      const caseData = CASES_DB[caseKey];
      if (caseData) {
        // Parse case code e.g. "FA/3/1973"
        const parts = caseKey.split('/');
        
        let typeCode = parts[0] || '';
        let caseNumber = parts[1] || '';
        let caseYear = parts[2] || '';

        // Expand type name
        let fullTypeName = APPEAL_TYPES[typeCode.toUpperCase()] || typeCode;

        // Update Inputs
        const typeField = document.getElementById('case_type');
        const noField = document.getElementById('case_no');
        const yearField = document.getElementById('case_year');
        const appellantField = document.getElementById('appellant');
        const respondentField = document.getElementById('respondent');

        if (typeField) typeField.value = fullTypeName;
        if (noField) noField.value = caseNumber;
        if (yearField) yearField.value = caseYear;
        if (appellantField) appellantField.value = caseData.appellant || '';
        if (respondentField) respondentField.value = caseData.respondent || '';
      }
      syncFields();
    }

    // Dismiss suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!sankhyaInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = 'none';
      }
    });
  }

  // 6. Custom Confirmation Modal Listeners
  const modal = document.getElementById('confirmModal');
  const cancelBtn = document.getElementById('confirmCancel');
  const okBtn = document.getElementById('confirmOk');

  if (modal && cancelBtn && okBtn) {
    const hideModal = () => {
      modal.classList.remove('active');
      setTimeout(() => { modal.style.display = 'none'; }, 200);
    };

    cancelBtn.addEventListener('click', hideModal);

    okBtn.addEventListener('click', () => {
      // Clear all fields
      for (const editorId of Object.keys(FIELD_MAP)) {
        const input = document.getElementById(editorId);
        if (input) {
          input.value = '';
        }
      }
      
      const searchBox = document.getElementById('sankhya');
      if (searchBox) searchBox.value = '';

      // Re-populate default date and recipients
      const dateInput = document.getElementById('custom_date');
      if (dateInput) {
        dateInput.value = getFormattedCurrentDate();
      }
      
      const recTitle = document.getElementById('recipient_title');
      const recAddr = document.getElementById('recipient_address');
      if (recTitle) recTitle.value = "District and Sessions Judge";
      if (recAddr) recAddr.value = "Patna";

      syncFields();
      hideModal();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }
});

// ── Actions ──────────────────────────────────────────────────
function printForm() {
  syncFields();
  const extractedData = {
    case_type: document.getElementById('case_type')?.value || 'First Appeal',
    case_no: document.getElementById('case_no')?.value || '',
    case_year: document.getElementById('case_year')?.value || '',
    appellant: document.getElementById('appellant')?.value || '',
    respondent: document.getElementById('respondent')?.value || '',
    lc_court: (document.getElementById('court_of_the')?.value || document.getElementById('recipient_title')?.value || ''),
    lc_case_type: document.getElementById('arising_out_of')?.value || '',
    lc_case_no: document.getElementById('appeal_from_no')?.value || '',
    lc_case_year: document.getElementById('appeal_from_year')?.value || ''
  };

  if (typeof window.promptSaveCaseRecord === 'function' && (extractedData.case_no || extractedData.appellant)) {
    window.promptSaveCaseRecord(extractedData, () => {
      if (typeof saveToCloud === 'function') saveToCloud(true);
      window.print();
    }, () => {
      if (typeof saveToCloud === 'function') saveToCloud(true);
      window.print();
    });
  } else {
    if (typeof saveToCloud === 'function') saveToCloud(true);
    window.print();
  }
}

function clearForm() {
  const modal = document.getElementById('confirmModal');
  if (modal) {
    modal.style.display = 'flex';
    // Small delay to trigger CSS transition
    setTimeout(() => { modal.classList.add('active'); }, 10);
  }
}

// ── Local Ethernet Storage Integrations ──────────────────────────
async function saveToCloud(silent = false) {
  const caseNo = document.getElementById('case_no').value.trim();
  const caseYear = document.getElementById('case_year').value.trim();
  
  if (!caseNo || !caseYear) {
    if (!silent) alert("Please enter a Case Number and Year before saving.");
    return;
  }

  const lcrData = {};
  for (const editorId of Object.keys(FIELD_MAP)) {
    const input = document.getElementById(editorId);
    if (input) {
      lcrData[editorId] = input.value.trim();
    }
  }

  const lcrStatusElem = document.getElementById('lcr_status');
  const letterTypeElem = document.getElementById('letter_type');
  if (lcrStatusElem) lcrData['lcr_status'] = lcrStatusElem.value;
  if (letterTypeElem) lcrData['letter_type'] = letterTypeElem.value;

  try {
    if (window.PortalDB) {
      await window.PortalDB.insertLcrCall(lcrData);
      
      if (typeof window.PortalDB.syncMasterLowerCourtDetails === 'function') {
        const lcDataMap = {
          lc_case_type: lcrData.appeal_from,
          lc_case_no: lcrData.appeal_from_no,
          lc_case_year: lcrData.appeal_from_year,
          lc_court: lcrData.court_of_the
        };
        await window.PortalDB.syncMasterLowerCourtDetails(lcrData.case_type || 'First Appeal', lcrData.case_no, lcrData.case_year, lcDataMap);
      }

      if (!silent) alert('LCR Call successfully saved!');
    } else {
      throw new Error('PortalDB not available');
    }
  } catch (error) {
    console.error('Error saving LCR Call:', error);
    if (!silent) alert('Error saving LCR Call.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveToCloudBtn');
  const viewBtn = document.getElementById('viewCloudLcrBtn');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveToCloud(false));
  }

  if (viewBtn) {
    viewBtn.addEventListener('click', async () => {
      const searchCaseNo = prompt('Enter Case Number to fetch LCR Call (e.g., 3):');
      if (!searchCaseNo) return;
      try {
        const data = await window.PortalDB.getLcrCalls();
        const matches = data.filter(l => (l.case_no || '').toString().toLowerCase().trim() === searchCaseNo.toString().toLowerCase().trim());
        if (matches.length === 0) { alert('No LCR Call found for Case Number: ' + searchCaseNo); return; }
        let lcrCall = matches[0];
        if (matches.length > 1) {
          let listMsg = `Multiple saved LCR Calls found for '${searchCaseNo}':\n\n`;
          matches.forEach((m, idx) => { const d = m.saved_at ? m.saved_at.slice(0,10) : 'Saved'; listMsg += `${idx+1}. ${d}\n`; });
          const choice = prompt(listMsg + `\nEnter number (1-${matches.length}):`, '1');
          const idx = parseInt(choice,10) - 1;
          if (!isNaN(idx) && matches[idx]) lcrCall = matches[idx];
        }
        for (const editorId of Object.keys(FIELD_MAP)) {
          const input = document.getElementById(editorId);
          if (input && lcrCall[editorId] !== undefined) input.value = lcrCall[editorId];
        }
        syncFields();
        alert('LCR Call loaded successfully!');
      } catch (error) {
        console.error('Error fetching LCR Call:', error);
        alert('Error loading LCR Call.');
      }
    });
  const letterTypeSelect = document.getElementById('letter_type');
  const prevDateInput = document.getElementById('prev_call_date');

  if (letterTypeSelect) {
    letterTypeSelect.addEventListener('change', syncFields);
  }
  if (prevDateInput) {
    prevDateInput.addEventListener('input', syncFields);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const qCaseNo = urlParams.get('case_no');
  const qMode = urlParams.get('mode');
  const qPrevDate = urlParams.get('prev_date');

  if (qMode === 'reminder' && letterTypeSelect) {
    letterTypeSelect.value = 'reminder';
  }

  if (qPrevDate && prevDateInput) {
    let dtStr = qPrevDate;
    if (qPrevDate.includes('T') || qPrevDate.includes('-')) {
      const dt = new Date(qPrevDate);
      if (!isNaN(dt.getTime())) dtStr = dt.toLocaleDateString('en-GB');
    }
    prevDateInput.value = dtStr;
  }

  if (qCaseNo) {
    const caseInput = document.getElementById('case_no');
    if (caseInput) {
      caseInput.value = qCaseNo;
    }
  }
  syncFields();
});
