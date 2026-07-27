/* ============================================================
   DIRECT NOTICE FORM – JAVASCRIPT LOGIC
   ============================================================ */

// ── Recipients Array ─────────────────────────────────────────
let recipients = [""];

// ── Field mapping: editor-id (for event listeners) ───────────
const FIELD_MAP = {
  in_appeal_type      : 'in_appeal_type',
  in_case_no          : 'in_case_no',
  in_case_year        : 'in_case_year',
  in_arising_out_of   : 'in_arising_out_of',
  in_arising_court    : 'in_arising_court',
  in_connected_case   : 'in_connected_case',
  in_connected_year   : 'in_connected_year',
  in_connected_court  : 'in_connected_court',
  in_appellant        : 'in_appellant',
  in_respondent       : 'in_respondent',
  in_advocate_name    : 'in_advocate_name',
  in_appearance_period: 'in_appearance_period',
  in_date_day         : 'in_date_day',
  in_date_month       : 'in_date_month',
  in_date_year        : 'in_date_year'
};

// Appeal abbreviation expansions
const APPEAL_TYPES = {
  'FA': 'First Appeal',
  'MA': 'Miscellaneous Appeal',
  'CA': 'Civil Appeal',
  'SA': 'Second Appeal'
};

// ── Date Parts Population ────────────────────────────────────
function populateCurrentDateParts() {
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
  
  const dayInput = document.getElementById('in_date_day');
  const monthInput = document.getElementById('in_date_month');
  const yearInput = document.getElementById('in_date_year');
  
  if (dayInput && !dayInput.value) dayInput.value = paddedDay;
  if (monthInput && !monthInput.value) monthInput.value = monthName;
  if (yearInput && !yearInput.value) yearInput.value = year;
}

// ── Sync Editor Fields to Print Preview ───────────────────────
function renderPages() {
  const container = document.getElementById('pagesContainer');
  if (!container) return;
  
  // Get all values from the inputs
  const appealType = document.getElementById('in_appeal_type').value.trim() || '\u00A0';
  const caseNo = document.getElementById('in_case_no').value.trim() || '\u00A0';
  const caseYear = document.getElementById('in_case_year').value.trim() || '\u00A0';
  
  const arisingOutOf = document.getElementById('in_arising_out_of').value.trim() || '\u00A0';
  const arisingCourt = document.getElementById('in_arising_court').value.trim() || '\u00A0';
  
  const connectedCase = document.getElementById('in_connected_case').value.trim() || '\u00A0';
  const connectedYear = document.getElementById('in_connected_year').value.trim() || '\u00A0';
  const connectedCourt = document.getElementById('in_connected_court').value.trim() || '\u00A0';
  
  const appellant = document.getElementById('in_appellant').value.trim() || '\u00A0';
  const respondent = document.getElementById('in_respondent').value.trim() || '\u00A0';
  
  const advocateName = document.getElementById('in_advocate_name').value.trim() || '\u00A0';
  const appearancePeriod = document.getElementById('in_appearance_period').value.trim() || '\u00A0';
  
  const dateDay = document.getElementById('in_date_day').value.trim() || '\u00A0';
  const dateMonth = document.getElementById('in_date_month').value.trim() || '\u00A0';
  const dateYear = document.getElementById('in_date_year').value.trim() || '\u00A0';

  let pagesHTML = '';
  
  recipients.forEach((recText) => {
    const formattedTo = recText.trim().replace(/\n/g, '<br>') || '\u00A0';
    
    pagesHTML += `
      <div class="print-page">
        <div class="doc-meta-header">
          <span class="doc-sch-code">[ P. H. C. Sch. V-22 ]</span>
        </div>

        <div class="doc-main-header">
          <div class="doc-court-title">In the High Court of Judicature at Patna</div>
          <div class="doc-jurisdiction">( Civil Appellate Jurisdiction )</div>
        </div>

        <div class="doc-case-title-row">
          <span class="val-appeal-type">${appealType}</span>
          <span class="doc-label">No.</span>
          <span class="val-case-no">${caseNo}</span>
          <span class="doc-label">of</span>
          <span class="val-case-year">${caseYear}</span>
        </div>

        <!-- Arising Out Of & Connected Row -->
        <div class="doc-row inline-row">
          <span class="doc-label">Arising out of</span>
          <span class="val-arising-out-of">${arisingOutOf}</span>
          <span class="doc-label">the Court of</span>
          <span class="val-arising-court">${arisingCourt}</span>
        </div>

        <div class="doc-row inline-row">
          <span class="doc-label">connected with</span>
          <span class="val-connected-case">${connectedCase}</span>
          <span class="doc-label">of</span>
          <span class="val-connected-year">${connectedYear}</span>
          <span class="doc-label">of the Court of</span>
          <span class="val-connected-court">${connectedCourt}</span>
        </div>

        <!-- Appellant Row -->
        <div class="doc-party-row">
          <span class="val-appellant">${appellant}</span>
          <span class="doc-party-label">Appellant.</span>
        </div>

        <!-- Versus Row -->
        <div class="doc-versus-row">
          versus
        </div>

        <!-- Respondent Row -->
        <div class="doc-party-row">
          <span class="val-respondent">${respondent}</span>
          <span class="doc-party-label">Respondent.</span>
        </div>

        <!-- To Section -->
        <div class="doc-to-section">
          <div class="to-label">To</div>
          <div class="to-address">
            <span class="val-to-address">${formattedTo}</span>
          </div>
        </div>

        <!-- Notice Body -->
        <div class="doc-body-paragraph paragraph-indent">
          Please take notice that Mr. <span class="val-advocate-name">${advocateName}</span> who represented you in the above mentioned appeal.
        </div>

        <div class="doc-body-paragraph paragraph-indent">
          You are, therefore, directed to take necessary steps for your appearance through another advocate of this Court within <span class="val-appearance-period">${appearancePeriod}</span>.
        </div>

        <div class="doc-body-paragraph paragraph-indent">
          If no appearance is made within the said period, the matter will be placed before the Bench for orders.
        </div>

        <div class="doc-body-paragraph date-row">
          Given under my hand and the seal of this Court this the <span class="val-date-day">${dateDay}</span> day of <span class="val-date-month">${dateMonth}</span> 20<span class="val-date-year">${dateYear}</span>
        </div>

        <!-- Sign-Off Section -->
        <div class="doc-sign-off">
          <div class="sign-off-block">
            <div class="sign-off-by">By order of the High Court</div>
            <div class="sign-off-space"></div>
            <div class="sign-off-title">Deputy Registrar.</div>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = pagesHTML;
}

// ── Draw Recipient Input Elements ────────────────────────────
function renderRecipientInputs() {
  const listDiv = document.getElementById('recipientsList');
  if (!listDiv) return;
  listDiv.innerHTML = '';
  
  recipients.forEach((recText, idx) => {
    const item = document.createElement('div');
    item.className = 'recipient-item';
    
    const header = document.createElement('div');
    header.className = 'recipient-item-header';
    
    const label = document.createElement('span');
    label.className = 'recipient-item-label';
    label.textContent = `Recipient #${idx + 1}`;
    header.appendChild(label);
    
    if (recipients.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove-rec';
      removeBtn.type = 'button';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remove Recipient';
      removeBtn.addEventListener('click', () => {
        recipients.splice(idx, 1);
        renderRecipientInputs();
        renderPages();
      });
      header.appendChild(removeBtn);
    }
    
    item.appendChild(header);
    
    const textarea = document.createElement('textarea');
    textarea.className = 'recipient-input';
    textarea.rows = 3;
    textarea.placeholder = 'Enter full "To" address for this page (name, advocate, address)';
    textarea.value = recText;
    
    textarea.addEventListener('input', () => {
      recipients[idx] = textarea.value;
      renderPages();
    });
    
    item.appendChild(textarea);
    listDiv.appendChild(item);
  });
}

// ── Initialize Application ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Auto-populate current date parts
  populateCurrentDateParts();

  // 2. Set default values for appearance period to assist user
  const appearanceInput = document.getElementById('in_appearance_period');
  if (appearanceInput && !appearanceInput.value) {
    appearanceInput.value = "15 days";
  }

  // 3. Render initial recipient list inputs
  renderRecipientInputs();

  // 4. Add change and input listeners to editor fields
  for (const editorId of Object.keys(FIELD_MAP)) {
    const input = document.getElementById(editorId);
    if (input) {
      input.addEventListener('input', renderPages);
      input.addEventListener('change', renderPages);
    }
  }

  // 5. Initial rendering of preview pages
  renderPages();

  // 6. Autocomplete & Auto-populate Logic
  const caseSearchInput = document.getElementById('caseSearchInput');
  const suggestionsDiv = document.getElementById('autocompleteDropdown');
  const clearSearchBtn = document.getElementById('searchClearBtn');

  // Show/hide search clear button — defined in outer scope so clear handler can call it
  const updateClearBtnState = () => {
    if (!caseSearchInput) return;
    if (caseSearchInput.value) {
      clearSearchBtn.style.display = 'block';
    } else {
      clearSearchBtn.style.display = 'none';
    }
  };

  if (caseSearchInput && suggestionsDiv && typeof CASES_DB !== 'undefined') {
    let activeIndex = -1;

    caseSearchInput.addEventListener('input', () => {
      updateClearBtnState();
      const query = caseSearchInput.value.trim().toUpperCase().replace(/\s+/g, '');
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
          item.className = 'autocomplete-item';
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
    caseSearchInput.addEventListener('keydown', (e) => {
      const items = suggestionsDiv.querySelectorAll('.autocomplete-item');
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
    caseSearchInput.addEventListener('blur', () => {
      setTimeout(() => {
        const val = caseSearchInput.value.trim();
        const exactMatch = Object.keys(CASES_DB).find(caseKey => 
          caseKey.toUpperCase().replace(/\s+/g, '') === val.toUpperCase().replace(/\s+/g, '')
        );
        if (exactMatch) {
          selectCase(exactMatch);
        }
      }, 200);
    });

    clearSearchBtn.addEventListener('click', () => {
      caseSearchInput.value = '';
      updateClearBtnState();
      suggestionsDiv.style.display = 'none';
      caseSearchInput.focus();
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
      caseSearchInput.value = caseKey;
      updateClearBtnState();
      suggestionsDiv.style.display = 'none';

      const caseData = CASES_DB[caseKey];
      if (caseData) {
        // Parse case code e.g. "FA/1233/1971"
        const parts = caseKey.split('/');
        
        let typeCode = parts[0] || '';
        let caseNumber = parts[1] || '';
        let caseYear = parts[2] || '';

        // Expand type name
        let fullTypeName = APPEAL_TYPES[typeCode.toUpperCase()] || typeCode;

        // Update Inputs
        const typeField = document.getElementById('in_appeal_type');
        const noField = document.getElementById('in_case_no');
        const yearField = document.getElementById('in_case_year');
        const appellantField = document.getElementById('in_appellant');
        const respondentField = document.getElementById('in_respondent');

        if (typeField) typeField.value = fullTypeName;
        if (noField) noField.value = caseNumber;
        if (yearField) yearField.value = caseYear;
        if (appellantField) appellantField.value = caseData.appellant || '';
        if (respondentField) respondentField.value = caseData.respondent || '';
        
        // Note: in_arising_out_of remains empty by default for manual entry.
      }
      renderPages();
    }

    // Dismiss suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!caseSearchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = 'none';
      }
    });
  }

  // 7. Add Recipient Button Listener
  const addRecBtn = document.getElementById('addRecipientBtn');
  if (addRecBtn) {
    addRecBtn.addEventListener('click', () => {
      recipients.push("");
      renderRecipientInputs();
      renderPages();
    });
  }

  // 8. Custom Confirmation Modal Listeners
  const modal = document.getElementById('confirmModal');
  const cancelBtn = document.getElementById('cancelClearBtn');
  const confirmBtn = document.getElementById('confirmClearBtn');
  const clearBtn = document.getElementById('clearBtn');
  const printBtn = document.getElementById('printBtn');

  if (clearBtn && modal && cancelBtn && confirmBtn) {
    clearBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      setTimeout(() => { modal.classList.add('active'); }, 10);
    });

    const hideModal = () => {
      modal.classList.remove('active');
      setTimeout(() => { modal.style.display = 'none'; }, 200);
    };

    cancelBtn.addEventListener('click', hideModal);

    confirmBtn.addEventListener('click', () => {
      // Clear all fields
      for (const editorId of Object.keys(FIELD_MAP)) {
        const input = document.getElementById(editorId);
        if (input) {
          input.value = '';
        }
      }
      
      if (caseSearchInput) {
        caseSearchInput.value = '';
        updateClearBtnState();
        if (suggestionsDiv) suggestionsDiv.style.display = 'none';
      }

      // Re-populate default date parts and appearance period
      populateCurrentDateParts();
      
      const appearanceInput = document.getElementById('in_appearance_period');
      if (appearanceInput) {
        appearanceInput.value = "15 days";
      }

      // Reset recipients list
      recipients = [""];
      renderRecipientInputs();

      renderPages();
      hideModal();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      renderPages();
      saveToCloud(true);
      window.print();
    });
  }

  // 9. Supabase Cloud Buttons
  const saveCloudBtn = document.getElementById('saveToCloudBtn');
  const viewCloudBtn = document.getElementById('viewCloudNoticesBtn');

  async function saveToCloud(silent = false) {
    const caseNo = document.getElementById('in_case_no').value.trim();
    const caseYear = document.getElementById('in_case_year').value.trim();
    if (!caseNo || !caseYear) {
      if (!silent) alert("Please enter a Case Number and Year before saving.");
      return;
    }

    const noticeData = {
      appealType: document.getElementById('in_appeal_type').value.trim(),
      caseNo: caseNo,
      caseYear: caseYear,
      arisingOutOf: document.getElementById('in_arising_out_of').value.trim(),
      arisingCourt: document.getElementById('in_arising_court').value.trim(),
      connectedCase: document.getElementById('in_connected_case').value.trim(),
      connectedYear: document.getElementById('in_connected_year').value.trim(),
      connectedCourt: document.getElementById('in_connected_court').value.trim(),
      appellant: document.getElementById('in_appellant').value.trim(),
      respondent: document.getElementById('in_respondent').value.trim(),
      advocateName: document.getElementById('in_advocate_name').value.trim(),
      appearancePeriod: document.getElementById('in_appearance_period').value.trim(),
      dateDay: document.getElementById('in_date_day').value.trim(),
      dateMonth: document.getElementById('in_date_month').value.trim(),
      dateYear: document.getElementById('in_date_year').value.trim(),
      recipients: recipients
    };

    try {
      if (window.PortalDB) {
        await window.PortalDB.insertDirectNotice(noticeData);
        
        if (typeof window.PortalDB.syncMasterLowerCourtDetails === 'function') {
          const lcDataMap = {
            lc_court: noticeData.in_arising_court,
            lc_case_type: noticeData.in_arising_out_of
          };
          await window.PortalDB.syncMasterLowerCourtDetails(noticeData.in_appeal_type || 'First Appeal', noticeData.in_case_no, noticeData.in_case_year, lcDataMap);
        }

        if (!silent) alert("Notice successfully saved to cloud!");
      } else {
        throw new Error('PortalDB not available');
      }
    } catch (error) {
      console.error("Error saving notice to cloud:", error);
      if (!silent) alert("Error saving notice to cloud.");
    }
  }

  if (saveCloudBtn) {
    saveCloudBtn.addEventListener('click', () => saveToCloud(false));
  }

  if (viewCloudBtn) {
    viewCloudBtn.addEventListener('click', async () => {
      const searchCaseNo = prompt("Enter Case Number to fetch notices (e.g., 1233):");
      if (!searchCaseNo) return;

      try {
        let data = [];
        if (window.PortalDB) {
          data = await window.PortalDB.getDirectNotices();
        } else {
          throw new Error('PortalDB not available');
        }

        if (data.length === 0) {
          alert("No notice found in cloud.");
          return;
        }

        const matches = data.filter(n => (n.caseNo || '').toString().toLowerCase().trim() === searchCaseNo.toString().toLowerCase().trim());
        if (matches.length === 0) {
          alert("No notice found for Case Number: " + searchCaseNo);
          return;
        }

        let notice = matches[0];
        if (matches.length > 1) {
          let listMsg = `Multiple saved notices found for Case '${searchCaseNo}':\n\n`;
          matches.forEach((m, idx) => {
            const dateStr = m.saved_at ? m.saved_at.split('.')[0] : 'Saved Record';
            listMsg += `${idx + 1}. Saved on: ${dateStr} ${idx === 0 ? '(Latest)' : ''}\n`;
          });
          listMsg += `\nEnter number (1-${matches.length}) to load (Default = 1):`;
          const choice = prompt(listMsg, "1");
          if (!choice) return;
          const choiceIdx = parseInt(choice, 10) - 1;
          if (!isNaN(choiceIdx) && matches[choiceIdx]) {
            notice = matches[choiceIdx];
          }
        }
        
        document.getElementById('in_appeal_type').value = notice.appealType || '';
        document.getElementById('in_case_no').value = notice.caseNo || '';
        document.getElementById('in_case_year').value = notice.caseYear || '';
        document.getElementById('in_arising_out_of').value = notice.arisingOutOf || '';
        document.getElementById('in_arising_court').value = notice.arisingCourt || '';
        document.getElementById('in_connected_case').value = notice.connectedCase || '';
        document.getElementById('in_connected_year').value = notice.connectedYear || '';
        document.getElementById('in_connected_court').value = notice.connectedCourt || '';
        document.getElementById('in_appellant').value = notice.appellant || '';
        document.getElementById('in_respondent').value = notice.respondent || '';
        document.getElementById('in_advocate_name').value = notice.advocateName || '';
        document.getElementById('in_appearance_period').value = notice.appearancePeriod || '';
        document.getElementById('in_date_day').value = notice.dateDay || '';
        document.getElementById('in_date_month').value = notice.dateMonth || '';
        document.getElementById('in_date_year').value = notice.dateYear || '';

        if (notice.recipients && Array.isArray(notice.recipients)) {
          recipients = notice.recipients;
        } else {
          recipients = [""];
        }

        renderRecipientInputs();
        renderPages();

        alert("Notice loaded from cloud successfully!");
      } catch (error) {
        console.error("Error fetching notice from Supabase:", error);
        alert("Error loading notice from cloud.");
      }
    });
  }
});
