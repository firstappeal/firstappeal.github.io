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

// ── Ordinal Suffix Helper ─────────────────────────────────────
function ordinalSuffix(day) {
  if (day === 1 || day === 21 || day === 31) return 'st';
  if (day === 2 || day === 22) return 'nd';
  if (day === 3 || day === 23) return 'rd';
  return 'th';
}

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
  const paddedDay = String(day).padStart(2, '0') + ordinalSuffix(day);
  
  const dayInput = document.getElementById('in_date_day');
  const monthInput = document.getElementById('in_date_month');
  const yearInput = document.getElementById('in_date_year');
  
  if (dayInput && !dayInput.value) dayInput.value = paddedDay;
  if (monthInput && !monthInput.value) monthInput.value = monthName;
  if (yearInput && !yearInput.value) yearInput.value = year;
}

// ── 30-Days-From-Today Date String (skips weekends) ──────────
function getThirtyDaysFromToday() {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const future = new Date();
  future.setDate(future.getDate() + 30);
  // If Saturday (6) → move to Monday (+2); if Sunday (0) → move to Monday (+1)
  const dow = future.getDay();
  if (dow === 6) future.setDate(future.getDate() + 2);
  else if (dow === 0) future.setDate(future.getDate() + 1);
  const d = future.getDate();
  const m = months[future.getMonth()];
  const y = future.getFullYear();
  return `${d}${ordinalSuffix(d)} ${m}, ${y}`;
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
        <!-- Watermark -->
        <div class="watermark-container">
          <img src="../lcr_call/emblem.png" alt="Watermark Emblem">
        </div>
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
          Given under my hand and the seal of this Court this the <span class="val-date-day">${dateDay}</span> day of <span class="val-date-month">${dateMonth}</span> <span class="val-date-year">${dateYear}</span>
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

  // 2. Auto-populate appearance period with date 30 days from today
  const appearanceInput = document.getElementById('in_appearance_period');
  if (appearanceInput && !appearanceInput.value) {
    appearanceInput.value = getThirtyDaysFromToday();
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
        appearanceInput.value = getThirtyDaysFromToday();
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
    printBtn.addEventListener('click', async () => {
      renderPages();
      const caseNo = document.getElementById('in_case_no').value.trim();
      const caseYear = document.getElementById('in_case_year').value.trim();
      if (caseNo && caseYear) {
        try {
          await saveToCloud(true);
          showToast('✅ Record saved automatically.');
        } catch (e) {
          console.warn('Auto-save on print failed:', e);
        }
      }
      window.print();
    });
  }

  function showToast(msg) {
    let toast = document.getElementById('_autoSaveToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = '_autoSaveToast';
      Object.assign(toast.style, {
        position: 'fixed', bottom: '28px', right: '28px', zIndex: '99999',
        background: '#166534', color: '#dcfce7', padding: '10px 18px',
        borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.88rem',
        fontWeight: '600', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'opacity 0.4s', opacity: '0', pointerEvents: 'none'
      });
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
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
    viewCloudBtn.addEventListener('click', openNoticesModal);
  }

  // ── Load Saved Notices Modal ──────────────────────────────────
  let allNoticeRecords = [];

  function fmtNoticeDate(str) {
    if (!str) return '—';
    try { return new Date(str).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return str; }
  }

  function renderNoticesModal(query = '') {
    const tbody = document.getElementById('noticesModalBody');
    if (!tbody) return;
    const q = query.toLowerCase().trim();
    const filtered = allNoticeRecords.filter(r => {
      // data may be stored inside r.data (JSON column) or flat
      const d = r.data || r;
      const haystack = `${d.caseNo || r.caseNo || ''} ${d.caseYear || r.caseYear || ''} ${d.appellant || r.appellant || ''} ${d.respondent || r.respondent || ''}`.toLowerCase();
      return !q || haystack.includes(q);
    });

    const countEl = document.getElementById('noticesModalCount');
    if (countEl) countEl.textContent = `${filtered.length} record${filtered.length === 1 ? '' : 's'} found`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="padding:24px;text-align:center;color:#94a3b8;">No records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const d = r.data || r;
      const caseLabel = `${d.appealType || 'FA'} No. ${d.caseNo || '—'} / ${d.caseYear || '—'}`;
      const saved = fmtNoticeDate(r.saved_at || r.created_at);
      return `<tr data-id="${r.id}" style="cursor:pointer;border-bottom:1px solid rgba(51,65,85,0.5);transition:background 0.15s;"
                onmouseover="this.style.background='rgba(255,255,255,0.04)'"
                onmouseout="this.style.background=''"
                onclick="loadNoticeRecord(${r.id})">
        <td style="padding:10px 14px;font-weight:700;color:#60a5fa;">${caseLabel}</td>
        <td style="padding:10px 14px;color:#f8fafc;">${d.appellant || '—'}</td>
        <td style="padding:10px 14px;color:#94a3b8;">${d.respondent || '—'}</td>
        <td style="padding:10px 14px;color:#94a3b8;white-space:nowrap;">${saved}</td>
      </tr>`;
    }).join('');
  }

  window.loadNoticeRecord = function(id) {
    const row = allNoticeRecords.find(r => r.id === id);
    if (!row) return;
    const notice = row.data || row;

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
    } else { recipients = ['']; }

    renderRecipientInputs();
    renderPages();

    // Close modal
    const modal = document.getElementById('loadNoticesModal');
    if (modal) modal.style.display = 'none';
  };

  const noticesModalEl      = document.getElementById('loadNoticesModal');
  const noticesModalSearch  = document.getElementById('noticesModalSearch');
  const closeNoticesModal   = document.getElementById('closeNoticesModal');
  const closeNoticesModalBtn= document.getElementById('closeNoticesModalBtn');

  async function openNoticesModal() {
    if (!noticesModalEl) return;
    noticesModalEl.style.display = 'flex';

    if (allNoticeRecords.length === 0) {
      try {
        allNoticeRecords = window.PortalDB ? await window.PortalDB.getDirectNotices() : [];
      } catch(e) {
        console.error('Failed to fetch notices:', e);
        allNoticeRecords = [];
      }
    }
    if (noticesModalSearch) noticesModalSearch.value = '';
    renderNoticesModal('');
  }

  function closeNoticesModalFn() {
    if (noticesModalEl) noticesModalEl.style.display = 'none';
  }

  if (closeNoticesModal)    closeNoticesModal.addEventListener('click', closeNoticesModalFn);
  if (closeNoticesModalBtn) closeNoticesModalBtn.addEventListener('click', closeNoticesModalFn);
  if (noticesModalEl)       noticesModalEl.addEventListener('click', e => { if (e.target === noticesModalEl) closeNoticesModalFn(); });
  if (noticesModalSearch)   noticesModalSearch.addEventListener('input', () => renderNoticesModal(noticesModalSearch.value));
});
