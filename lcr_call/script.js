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
    async function selectCase(caseKey) {
      sankhyaInput.value = caseKey;
      suggestionsDiv.style.display = 'none';

      const caseData = CASES_DB[caseKey];
      const parts = caseKey.split('/');
      const typeCode = parts[0] || '';
      const caseNumber = parts[1] || '';
      const caseYear = parts[2] || '';
      const fullTypeName = APPEAL_TYPES[typeCode.toUpperCase()] || typeCode;

      // Always Update Core Inputs (Even if not in local CASES_DB)
      const typeField = document.getElementById('case_type');
      const noField = document.getElementById('case_no');
      const yearField = document.getElementById('case_year');
      const appellantField = document.getElementById('appellant');
      const respondentField = document.getElementById('respondent');

      if (typeField) typeField.value = fullTypeName;
      if (noField) noField.value = caseNumber;
      if (yearField) yearField.value = caseYear;

      if (caseData) {
        if (appellantField && !appellantField.value) appellantField.value = caseData.appellant || '';
        if (respondentField && !respondentField.value) respondentField.value = caseData.respondent || '';
      }

      await fetchMasterDetails();
    }

    // Dismiss suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!sankhyaInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = 'none';
      }
    });
  }

  // 5b. Manual Trigger for Auto-Populate from Master Records
  async function fetchMasterDetails() {
    const typeField = document.getElementById('case_type');
    const noField = document.getElementById('case_no');
    const yearField = document.getElementById('case_year');

    const cType = typeField ? typeField.value.trim() : '';
    const cNo = noField ? noField.value.trim() : '';
    const cYear = yearField ? yearField.value.trim() : '';

    if (!cType || !cNo || !cYear) return;

    // 1. Fetch Appellant/Respondent from local CASES_DB
    if (typeof CASES_DB !== 'undefined') {
      const typeAbbr = Object.keys(APPEAL_TYPES).find(key => APPEAL_TYPES[key].toLowerCase() === cType.toLowerCase()) || cType;
      const localCaseKey = `${typeAbbr}/${cNo}/${cYear}`.toUpperCase();
      const localData = CASES_DB[localCaseKey];
      
      const appellantField = document.getElementById('appellant');
      const respondentField = document.getElementById('respondent');

      if (localData) {
        if (appellantField && !appellantField.value) appellantField.value = localData.appellant || '';
        if (respondentField && !respondentField.value) respondentField.value = localData.respondent || '';
      }
    }

    // 2. Fetch Lower Court details from Supabase
    try {
      if (window.PortalDB && typeof window.PortalDB.getSingleCaseRecord === 'function') {
        const match = await window.PortalDB.getSingleCaseRecord(cType, cNo, cYear);

        if (match) {
          const lcCourtField = document.getElementById('court_of_the');
          const appealFromField = document.getElementById('appeal_from');
          const appealFromNoField = document.getElementById('appeal_from_no');
          const appealFromYearField = document.getElementById('appeal_from_year');
          const arisingOutOfField = document.getElementById('arising_out_of');
          const recipientTitleField = document.getElementById('recipient_title');

          if (match.lc_court && lcCourtField && !lcCourtField.value) {
            lcCourtField.value = match.lc_court;
            if (recipientTitleField && (!recipientTitleField.value || recipientTitleField.value === "District and Sessions Judge")) {
              recipientTitleField.value = match.lc_court.split(',')[0];
            }
          }
          if (match.lc_case_type && appealFromField && !appealFromField.value) appealFromField.value = match.lc_case_type;
          if (match.lc_case_no && appealFromNoField && !appealFromNoField.value) appealFromNoField.value = match.lc_case_no;
          if (match.lc_case_year && appealFromYearField && !appealFromYearField.value) appealFromYearField.value = match.lc_case_year;
          
          if (arisingOutOfField && !arisingOutOfField.value && match.lc_case_type && match.lc_case_no && match.lc_case_year) {
            arisingOutOfField.value = `${match.lc_case_type} No. ${match.lc_case_no} of ${match.lc_case_year}`;
          }
          
          syncFields();
        }
      }
    } catch (err) {
      console.warn('Could not auto-sync details from master DB:', err);
    }
  }

  // Attach blur listeners to trigger fetch when entered manually
  const cNoInput = document.getElementById('case_no');
  const cYearInput = document.getElementById('case_year');
  if (cNoInput) cNoInput.addEventListener('blur', fetchMasterDetails);
  if (cYearInput) cYearInput.addEventListener('blur', fetchMasterDetails);

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
  if (typeof saveToCloud === 'function') saveToCloud(true);
  window.print();
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

  const doSaveLcr = async () => {
    try {
      if (window.PortalDB) {
        await window.PortalDB.insertLcrCall(lcrData);
        if (!silent) alert('LCR Call successfully saved!');
      } else {
        throw new Error('PortalDB not available');
      }
    } catch (error) {
      console.error('Error saving LCR Call:', error);
      if (!silent) alert('Error saving LCR Call.');
    }
  };

  if (!silent && typeof window.promptSaveCaseRecord === 'function') {
    const extractedData = {
      case_type: document.getElementById('case_type')?.value || 'First Appeal',
      case_no: caseNo,
      case_year: caseYear,
      appellant: document.getElementById('appellant')?.value || '',
      respondent: document.getElementById('respondent')?.value || '',
      lc_court: (document.getElementById('court_of_the')?.value || document.getElementById('recipient_title')?.value || ''),
      lc_case_type: document.getElementById('appeal_from')?.value || document.getElementById('arising_out_of')?.value || '',
      lc_case_no: document.getElementById('appeal_from_no')?.value || '',
      lc_case_year: document.getElementById('appeal_from_year')?.value || ''
    };

    if (confirm("Do you want to check and update this case in the Master Case Records? \n\nClick 'OK' to update the Master Record.\nClick 'Cancel' to ONLY save the LCR Call.")) {
      window.promptSaveCaseRecord(extractedData, doSaveLcr, doSaveLcr);
    } else {
      doSaveLcr();
    }
  } else {
    doSaveLcr();
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
