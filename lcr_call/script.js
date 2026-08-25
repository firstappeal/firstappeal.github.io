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
        if (appellantField) appellantField.value = caseData.appellant || '';
        if (respondentField) respondentField.value = caseData.respondent || '';
      }

      await fetchMasterDetails(true);
      syncFields();
    }

    // Dismiss suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!sankhyaInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = 'none';
      }
    });
  }

  // 5b. Manual Trigger for Auto-Populate from Master Records
  async function fetchMasterDetails(forceOverwrite = false) {
    const typeField = document.getElementById('case_type');
    const noField = document.getElementById('case_no');
    const yearField = document.getElementById('case_year');

    const cTypeRaw = typeField ? typeField.value.trim() : '';
    const cNo = noField ? noField.value.trim() : '';
    const cYear = yearField ? yearField.value.trim() : '';

    if (!cTypeRaw || !cNo || !cYear) return;

    // Resolve Abbreviations (e.g. 'FA' -> 'First Appeal' and 'First Appeal' -> 'FA')
    let fullType = cTypeRaw;
    let typeAbbr = cTypeRaw.toUpperCase();

    if (APPEAL_TYPES[cTypeRaw.toUpperCase()]) {
      fullType = APPEAL_TYPES[cTypeRaw.toUpperCase()];
    } else {
      const foundKey = Object.keys(APPEAL_TYPES).find(key => APPEAL_TYPES[key].toLowerCase() === cTypeRaw.toLowerCase());
      if (foundKey) {
        typeAbbr = foundKey;
        fullType = APPEAL_TYPES[foundKey];
      }
    }

    // 1. Fetch Appellant/Respondent from local CASES_DB
    if (typeof CASES_DB !== 'undefined') {
      const localCaseKey = `${typeAbbr}/${cNo}/${cYear}`.toUpperCase();
      const localData = CASES_DB[localCaseKey];
      
      const appellantField = document.getElementById('appellant');
      const respondentField = document.getElementById('respondent');

      if (localData) {
        if (appellantField && (forceOverwrite || !appellantField.value)) appellantField.value = localData.appellant || '';
        if (respondentField && (forceOverwrite || !respondentField.value)) respondentField.value = localData.respondent || '';
      }
    }

    // 2. Fetch Lower Court details from Supabase
    try {
      if (window.PortalDB && typeof window.PortalDB.getSingleCaseRecord === 'function') {
        const match = await window.PortalDB.getSingleCaseRecord(fullType, cNo, cYear);

        if (match) {
          const lcCourtField = document.getElementById('court_of_the');
          const appealFromField = document.getElementById('appeal_from');
          const appealFromNoField = document.getElementById('appeal_from_no');
          const appealFromYearField = document.getElementById('appeal_from_year');
          const arisingOutOfField = document.getElementById('arising_out_of');
          const recipientTitleField = document.getElementById('recipient_title');

          if (match.lc_court && lcCourtField && (forceOverwrite || !lcCourtField.value)) {
            lcCourtField.value = match.lc_court;
            const parts = match.lc_court.split(',');
            if (recipientTitleField && (!recipientTitleField.value || recipientTitleField.value === "District and Sessions Judge")) {
              recipientTitleField.value = parts[0].trim();
            }
            const recipientAddressField = document.getElementById('recipient_address');
            if (recipientAddressField && parts.length > 1 && (!recipientAddressField.value || recipientAddressField.value.trim().toLowerCase() === "patna")) {
              recipientAddressField.value = parts.slice(1).join(',').trim();
            } else if (recipientAddressField && parts.length === 1 && recipientAddressField.value.trim().toLowerCase() === "patna") {
              recipientAddressField.value = '';
            }
          }
          if (match.lc_case_type && appealFromField && (forceOverwrite || !appealFromField.value)) {
            let cleanedType = match.lc_case_type.trim();
            if (cleanedType.toLowerCase().endsWith('of the')) {
              cleanedType = cleanedType.substring(0, cleanedType.length - 6).trim();
            }
            appealFromField.value = cleanedType;
          }
          if (match.lc_case_no && appealFromNoField && (forceOverwrite || !appealFromNoField.value)) appealFromNoField.value = match.lc_case_no;
          if (match.lc_case_year && appealFromYearField && (forceOverwrite || !appealFromYearField.value)) appealFromYearField.value = match.lc_case_year;
          
          if (arisingOutOfField && (forceOverwrite || !arisingOutOfField.value) && match.lc_case_type && match.lc_case_no && match.lc_case_year) {
            let arisingText = `${match.lc_case_type} No. ${match.lc_case_no} of ${match.lc_case_year}`;
            
            const formatDate = (dateStr) => {
              if (!dateStr) return '';
              const parts = dateStr.split('-');
              if (parts.length === 3) {
                if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                if (parts[2].length === 4) return dateStr;
              }
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
              }
              return dateStr;
            };

            const fmtJ = formatDate(match.date_of_judgment);
            const fmtD = formatDate(match.date_of_decree_award);

            if (match.date_of_judgment || match.date_of_decree_award) {
              if (match.date_of_judgment && match.date_of_decree_award) {
                if (fmtJ === fmtD) {
                  arisingText = `Judgment and Decree/Award dated ${fmtJ}`;
                } else {
                  arisingText = `Judgment dated ${fmtJ} and Decree/Award dated ${fmtD}`;
                }
              } else if (match.date_of_judgment) {
                arisingText = `Judgment dated ${fmtJ}`;
              } else if (match.date_of_decree_award) {
                arisingText = `Decree/Award dated ${fmtD}`;
              }
            } else {
              arisingText = 'Judgment and Decree';
            }
            
            arisingOutOfField.value = arisingText;
          }
        }
      }
    } catch (err) {
      console.warn('Could not auto-sync details from master DB:', err);
    }
    syncFields();
  }

  // Attach blur listeners to trigger fetch when entered manually
  const cNoInput = document.getElementById('case_no');
  const cYearInput = document.getElementById('case_year');
  if (cNoInput) cNoInput.addEventListener('blur', () => fetchMasterDetails(false));
  if (cYearInput) cYearInput.addEventListener('blur', () => fetchMasterDetails(false));

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
  } // Fix for missing closing brace

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

  // ── Issue Reminder Button ─────────────────────────────────────
  const reminderBtn = document.getElementById('issueReminderBtn');
  if (reminderBtn) {
    reminderBtn.addEventListener('click', openReminderFromMaster);
  }
});

/* ──────────────────────────────────────────────────────────────
   openReminderFromMaster()
   Fetches Lower Court details from the master case_records table
   and the original LCR call date from lcr_calls, then opens
   reminder.html with all fields pre-populated via URL params.
   ────────────────────────────────────────────────────────────── */
async function openReminderFromMaster() {
  const btn = document.getElementById('issueReminderBtn');

  // Read case identity from the form
  const caseType = (document.getElementById('case_type')?.value || 'First Appeal').trim();
  const caseNo   = (document.getElementById('case_no')?.value   || '').trim();
  const caseYear = (document.getElementById('case_year')?.value || '').trim();

  if (!caseNo || !caseYear) {
    alert('Please load a case first using the Case Search box before issuing a Reminder.');
    return;
  }

  // Show loading state
  const origLabel = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Fetching Records…';

  try {
    // ── 1. Fetch master case record (lower court details) ────────
    let masterRecord = null;
    if (window.PortalDB && typeof window.PortalDB.getSingleCaseRecord === 'function') {
      masterRecord = await window.PortalDB.getSingleCaseRecord(caseType, caseNo, caseYear);
    }

    // ── 2. Fetch the original LCR call date ──────────────────────
    let originalLcrDate = '';
    if (window.PortalDB && typeof window.PortalDB.getLcrCalls === 'function') {
      try {
        const allLcr = await window.PortalDB.getLcrCalls();
        // Match by case_no and case_year, get the oldest (first issued)
        const matches = allLcr
          .filter(l =>
            String(l.case_no || '').trim()   === caseNo &&
            String(l.case_year || '').trim() === caseYear
          )
          .sort((a, b) => new Date(a.saved_at) - new Date(b.saved_at));

        if (matches.length > 0) {
          const oldest = matches[0];
          // Prefer custom_date (formatted) over raw saved_at
          if (oldest.custom_date) {
            originalLcrDate = oldest.custom_date;
          } else if (oldest.saved_at) {
            // Format raw ISO date to DD-MM-YYYY
            const d = new Date(oldest.saved_at);
            if (!isNaN(d.getTime())) {
              const day   = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              originalLcrDate = `${day}-${month}-${d.getFullYear()}`;
            }
          }
        }
      } catch (lcrErr) {
        console.warn('Could not fetch LCR call history:', lcrErr);
      }
    }

    // ── 3. Resolve lower court fields ────────────────────────────
    // Priority: master record from Supabase → form fields already typed in
    const lcCourt     = masterRecord?.lc_court      || document.getElementById('court_of_the')?.value  || '';
    const lcCaseType  = masterRecord?.lc_case_type  || document.getElementById('appeal_from')?.value    || '';
    const lcCaseNo    = masterRecord?.lc_case_no    || document.getElementById('appeal_from_no')?.value || '';
    const lcCaseYear  = masterRecord?.lc_case_year  || document.getElementById('appeal_from_year')?.value || '';
    const appellant   = masterRecord?.appellant     || document.getElementById('appellant')?.value       || '';
    const respondent  = masterRecord?.respondent    || document.getElementById('respondent')?.value      || '';

    // Build "Arising Out Of" string for the reminder body
    let arisingOutOf = document.getElementById('arising_out_of')?.value || '';
    if (!arisingOutOf && lcCaseType && lcCaseNo && lcCaseYear) {
      arisingOutOf = `${lcCaseType} No. ${lcCaseNo} of ${lcCaseYear}`;
    }

    // Derive recipient title/address from lc_court
    let recipientTitle   = document.getElementById('recipient_title')?.value   || '';
    let recipientAddress = document.getElementById('recipient_address')?.value || '';
    if (lcCourt && (!recipientTitle || recipientTitle === 'District and Sessions Judge')) {
      const parts = lcCourt.split(',');
      recipientTitle   = parts[0].trim();
      recipientAddress = parts.slice(1).join(',').trim() || recipientAddress;
    }

    // ── 4. Build reminder.html URL with all params ───────────────
    const params = new URLSearchParams({
      case_type:        caseType,
      case_no:          caseNo,
      case_year:        caseYear,
      appellant:        appellant,
      respondent:       respondent,
      appeal_from:      recipientTitle,         // maps to rem_to_title
      court_of_the:     lcCourt,                // maps to rem_court_of_the
      arising_out_of:   arisingOutOf,           // maps to rem_arising_out_of
      recipient_address: recipientAddress,      // maps to rem_to_address
      prev_date:        originalLcrDate,        // original requisition date
    });

    const reminderUrl = `../lcr_call/reminder.html?${params.toString()}`;
    window.location.href = reminderUrl;

  } catch (err) {
    console.error('Error opening reminder:', err);
    alert('Could not open Reminder Letter. Please check your connection and try again.');
    btn.disabled = false;
    btn.innerHTML = origLabel;
  }
}
