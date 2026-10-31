/* ============================================================
   ORDER COMMUNICATION FORM – JAVASCRIPT LOGIC
   ============================================================ */

const FIELD_MAP = {
  in_present          : 'in_present',
  in_appeal_type      : 'in_appeal_type',
  in_case_no          : 'in_case_no',
  in_case_year        : 'in_case_year',
  in_arising_out_of   : 'in_arising_out_of',
  in_arising_year     : 'in_arising_year',
  in_arising_court    : 'in_arising_court',
  in_appellant        : 'in_appellant',
  in_respondent       : 'in_respondent',
  in_application_filed_by: 'in_application_filed_by',
  in_exn_case_no      : 'in_exn_case_no',
  in_order_text       : 'in_order_text',
  in_memo_no          : 'in_memo_no',
  in_copy_forwarded_to: 'in_copy_forwarded_to',
  in_date_picker      : 'in_date_picker'
};

const APPEAL_TYPES = {
  'FA': 'First Appeal',
  'MA': 'Miscellaneous Appeal',
  'CA': 'Civil Appeal',
  'SA': 'Second Appeal'
};

function ordinalSuffix(day) {
  if (day === 1 || day === 21 || day === 31) return 'st';
  if (day === 2 || day === 22) return 'nd';
  if (day === 3 || day === 23) return 'rd';
  return 'th';
}

function populateCurrentDateParts() {
  const dateInput = document.getElementById('in_date_picker');
  if (dateInput && !dateInput.value) {
    const now = new Date();
    // format as YYYY-MM-DD
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }
}

function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function renderPages() {
  const container = document.getElementById('pagesContainer');
  if (!container) return;
  
  const present = getValue('in_present') || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  const appealType = getValue('in_appeal_type') || '\u00A0\u00A0\u00A0\u00A0\u00A0';
  const caseNo = getValue('in_case_no') || '\u00A0\u00A0\u00A0\u00A0\u00A0';
  const caseYear = getValue('in_case_year') || '\u00A0\u00A0';
  
  const arisingOutOf = getValue('in_arising_out_of') || getValue('in_arising_no1');
  const arisingYear = getValue('in_arising_year') || getValue('in_arising_year1');
  const arisingCourt = getValue('in_arising_court');
  
  const appellant = getValue('in_appellant') || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  const respondent = getValue('in_respondent') || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  
  const applicationFiledBy = getValue('in_application_filed_by') || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  const exnCaseNo = getValue('in_exn_case_no') || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  
  const orderText = getValue('in_order_text') || '';
  
  const memoNo = getValue('in_memo_no') || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  const copyForwardedTo = getValue('in_copy_forwarded_to') || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  
  let dateDay = '    ', dateMonth = '        ', dateYear = '  ';
  const dateVal = getValue('in_date_picker');
  if (dateVal) {
    const parts = dateVal.split('-');
    if (parts.length === 3) {
      const yearNum = parseInt(parts[0], 10);
      const monthNum = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      if (!isNaN(dayNum) && !isNaN(monthNum) && !isNaN(yearNum)) {
        dateDay = `${dayNum}${ordinalSuffix(dayNum)}`;
        dateMonth = months[monthNum] || '';
        dateYear = yearNum.toString();
      }
    }
  }

  const pagesHTML = `
      <div class="print-page" style="font-size: 12pt; line-height: 1.45; font-family: serif;">
        <div style="font-size: 12pt; margin-bottom: 6px;">( P. H. C. Sch. II-D-17 )</div>
        <div class="doc-main-header" style="text-align: center; margin-bottom: 14px;">
          <div class="doc-court-title" style="font-size: 18pt; font-weight: bold;">In the High Court of Judicature at Patna</div>
        </div>

        <div class="doc-row" style="margin-bottom: 8px; font-size: 12pt;">
           Present : <strong>${present}</strong>
        </div>
        
        <div class="doc-row" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; padding-left: 30px; font-size: 14pt;">
           <span style="min-width: 220px; text-align: center; font-weight: bold;">${appealType}</span> No. <span style="min-width: 90px; text-align: center; font-weight: bold;">${caseNo}</span> of <span style="min-width: 70px; text-align: center; font-weight: bold;">${caseYear}</span>
        </div>
        <div class="doc-row" style="margin-bottom: 20px; padding-left: 30px; padding-right: 30px; font-size: 12pt; line-height: 1.5; text-align: justify;">
           ( arising out of <span style="display: inline-block; min-width: 140px; text-align: center;">${arisingOutOf ? `<strong>${arisingOutOf}</strong>` : '........................'}</span> of <span style="display: inline-block; min-width: 60px; text-align: center;">${arisingYear ? `<strong>${arisingYear}</strong>` : '..........................'}</span> from the court of <span style="display: inline-block; min-width: 200px; text-align: center;">${arisingCourt ? `<strong>${arisingCourt}</strong>` : '.....................................................'}</span> )
        </div>
        
        <div class="doc-row" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; padding-left: 30px; padding-right: 30px; font-size: 12pt;">
           <strong style="flex: 1; text-align: center; padding-right: 20px;">${appellant}</strong>
           <span style="white-space: nowrap;">Appellant</span>
        </div>
        
        <div class="doc-row" style="text-align: center; margin: 10px 0; font-size: 12pt;">versus</div>

        <div class="doc-row" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; padding-left: 30px; padding-right: 30px; font-size: 12pt;">
           <strong style="flex: 1; text-align: center; padding-right: 20px;">${respondent}</strong>
           <span style="white-space: nowrap;">Respondent</span>
        </div>

        <div class="doc-row" style="margin-bottom: 6px; font-size: 12pt;">
           In the matter of application filed by the <strong>${applicationFiledBy}</strong>
        </div>
        <div class="doc-row" style="text-align: center; margin-bottom: 18px; font-size: 12pt;">
           in Exn. Case No. <strong>${exnCaseNo}</strong>
        </div>
        <div class="doc-row" style="text-align: center; margin-top: 14px; margin-bottom: 6px; font-size: 12pt; font-weight: bold;">
           Order
        </div>
        
        <div class="doc-body-paragraph paragraph-indent" style="min-height: 75px; white-space: pre-wrap; margin-bottom: 12px; font-size: 12pt; line-height: 1.45;">${orderText}</div>
        
        <div class="doc-row" style="text-align: right; margin-top: 10px; padding-right: 80px; font-size: 12pt;">
          ( Sd. )
        </div>
        <div class="doc-row" style="text-align: right; padding-right: 80px; font-size: 12pt;">
          ( Sd. )
        </div>

        <div class="doc-row" style="margin-top: 10px; margin-bottom: 6px; text-align: center; font-size: 12pt;">
          MEMO No. <strong>${memoNo}</strong>
        </div>
        <div class="doc-row" style="margin-bottom: 6px; font-size: 12pt;">
          Copy forwarded to the <strong>${copyForwardedTo}</strong>
        </div>
        <div class="doc-row" style="margin-bottom: 24px; text-align: center; font-size: 12pt;">
          for information and guidance
        </div>

        <div class="doc-row" style="display: flex; justify-content: space-between; margin-top: 20px; align-items: center; font-size: 12pt;">
           <div style="flex: 1;">
             HIGH COURT :<br>
             The <strong>${dateDay}</strong> <strong>${dateMonth}</strong> <strong>${dateYear}</strong>
           </div>
           <div style="font-size: 45px; font-weight: 300; line-height: 1; flex: 0.5; text-align: center; display: flex; align-items: center; justify-content: center; transform: scaleY(2.2);">}</div>
           <div style="text-align: center; flex: 1;">
             By Order<br><br>
             Deputy Registrar
           </div>
        </div>

      </div>
  `;
  
  container.innerHTML = pagesHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  populateCurrentDateParts();

  for (const editorId of Object.keys(FIELD_MAP)) {
    const input = document.getElementById(editorId);
    if (input) {
      input.addEventListener('input', renderPages);
      input.addEventListener('change', renderPages);
    }
  }

  renderPages();

  // Autocomplete & Auto-populate Logic
  const caseSearchInput = document.getElementById('caseSearchInput');
  const suggestionsDiv = document.getElementById('autocompleteDropdown');
  const clearSearchBtn = document.getElementById('searchClearBtn');

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

      const matches = Object.keys(CASES_DB).filter(caseKey => {
        const normalizedKey = caseKey.toUpperCase().replace(/\s+/g, '');
        return normalizedKey.includes(query);
      }).slice(0, 10);

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

    function selectCase(caseKey) {
      caseSearchInput.value = caseKey;
      updateClearBtnState();
      suggestionsDiv.style.display = 'none';

      const caseData = CASES_DB[caseKey];
      if (caseData) {
        const parts = caseKey.split('/');
        
        let typeCode = parts[0] || '';
        let caseNumber = parts[1] || '';
        let caseYear = parts[2] || '';

        let fullTypeName = APPEAL_TYPES[typeCode.toUpperCase()] || typeCode;

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

        if (window.PortalDB && typeof window.PortalDB.getSingleCaseRecord === 'function') {
          window.PortalDB.getSingleCaseRecord(fullTypeName, caseNumber, caseYear).then(rec => {
            if (rec) {
              const arisingField = document.getElementById('in_arising_out_of');
              const yrField = document.getElementById('in_arising_year');
              const crtField = document.getElementById('in_arising_court');

              if (arisingField && !arisingField.value.trim()) {
                const parts = [rec.lc_case_type, rec.lc_case_no ? `No. ${rec.lc_case_no}` : ''].filter(Boolean).join(' ');
                if (parts) arisingField.value = parts;
              }
              if (yrField && !yrField.value.trim() && rec.lc_case_year) {
                yrField.value = rec.lc_case_year;
              }
              if (crtField && !crtField.value.trim() && rec.lc_court) {
                crtField.value = rec.lc_court;
              }
              renderPages();
            }
          }).catch(() => {});
        }
      }
      renderPages();
    }

    document.addEventListener('click', (e) => {
      if (!caseSearchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = 'none';
      }
    });
  }

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

      populateCurrentDateParts();

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

  const saveCloudBtn = document.getElementById('saveToCloudBtn');
  const viewCloudBtn = document.getElementById('viewCloudNoticesBtn');

  async function saveToCloud(silent = false) {
    const caseNo = document.getElementById('in_case_no').value.trim();
    if (!caseNo) {
      if (!silent) alert("Please enter a Case Number before saving.");
      return;
    }

    const data = {};
    for (const key of Object.keys(FIELD_MAP)) {
        data[key] = getValue(key);
    }

    try {
      if (window.PortalDB) {
        await window.PortalDB.insertOrderCommunication(data);
        if (!silent) alert("Order Communication successfully saved to cloud!");
      } else {
        throw new Error('PortalDB not available');
      }
    } catch (error) {
      console.error("Error saving to cloud:", error);
      if (!silent) alert("Error saving to cloud.");
    }
  }

  if (saveCloudBtn) {
    saveCloudBtn.addEventListener('click', () => saveToCloud(false));
  }

  if (viewCloudBtn) {
    viewCloudBtn.addEventListener('click', openNoticesModal);
  }

  let allRecords = [];

  function fmtNoticeDate(str) {
    if (!str) return '—';
    try { return new Date(str).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return str; }
  }

  function renderNoticesModal(query = '') {
    const tbody = document.getElementById('noticesModalBody');
    if (!tbody) return;
    const q = query.toLowerCase().trim();
    const filtered = allRecords.filter(r => {
      const d = r.data || r;
      const haystack = `${d.in_case_no || ''} ${d.in_case_year || ''} ${d.in_appellant || ''} ${d.in_respondent || ''}`.toLowerCase();
      return !q || haystack.includes(q);
    });

    const countEl = document.getElementById('noticesModalCount');
    if (countEl) countEl.textContent = `${filtered.length} record${filtered.length === 1 ? '' : 's'} found`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:24px;text-align:center;color:#94a3b8;">No records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const d = r.data || r;
      const caseLabel = `${d.in_appeal_type || 'FA'} No. ${d.in_case_no || '—'} / ${d.in_case_year || '—'}`;
      const saved = fmtNoticeDate(r.saved_at || r.created_at);
      return `<tr data-id="${r.id}" style="border-bottom:1px solid rgba(51,65,85,0.5);transition:background 0.15s;">
        <td style="padding:10px 14px;font-weight:700;color:#60a5fa;cursor:pointer;" onclick="loadRecord(${r.id})">${caseLabel}</td>
        <td style="padding:10px 14px;color:#f8fafc;cursor:pointer;" onclick="loadRecord(${r.id})">${d.in_appellant || '—'}</td>
        <td style="padding:10px 14px;color:#94a3b8;cursor:pointer;" onclick="loadRecord(${r.id})">${d.in_respondent || '—'}</td>
        <td style="padding:10px 14px;color:#94a3b8;white-space:nowrap;cursor:pointer;" onclick="loadRecord(${r.id})">${saved}</td>
        <td style="padding:6px 10px;text-align:center;">
          <button onclick="deleteRecord(${r.id})" title="Delete record" style="background:#7f1d1d;color:#fca5a5;border:1px solid #ef4444;border-radius:5px;padding:3px 10px;cursor:pointer;font-size:0.8rem;transition:background 0.2s;">🗑 Delete</button>
        </td>
      </tr>`;
    }).join('');
  }

  window.loadRecord = function(id) {
    const row = allRecords.find(r => r.id === id);
    if (!row) return;
    const notice = row.data || row;

    for (const key of Object.keys(FIELD_MAP)) {
        const el = document.getElementById(key);
        if (el) {
            el.value = notice[key] || '';
        }
    }

    const arisingEl = document.getElementById('in_arising_out_of');
    if (arisingEl && !arisingEl.value && notice.in_arising_no1) {
      arisingEl.value = notice.in_arising_no1;
    }
    const yearEl = document.getElementById('in_arising_year');
    if (yearEl && !yearEl.value && notice.in_arising_year1) {
      yearEl.value = notice.in_arising_year1;
    }

    renderPages();

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

    if (allRecords.length === 0) {
      try {
        allRecords = window.PortalDB ? await window.PortalDB.getOrderCommunications() : [];
      } catch(e) {
        console.error('Failed to fetch records:', e);
        allRecords = [];
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

  window.deleteRecord = async function(id) {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      if (window.PortalDB && typeof window.PortalDB.deleteOrderCommunication === 'function') {
        await window.PortalDB.deleteOrderCommunication(id);
        allRecords = allRecords.filter(r => r.id !== id);
        renderNoticesModal(noticesModalSearch ? noticesModalSearch.value : '');
        showToast('🗑 Record deleted.');
      } else {
        alert('Delete function not available.');
      }
    } catch (e) {
      console.error('Delete failed:', e);
      alert('Error deleting record.');
    }
  };
});
