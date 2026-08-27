/* ============================================================
   NOTICE FORWARDING FORM – JAVASCRIPT
   उच्च न्यायालय, पटना
   ============================================================ */

// ── Field mapping: editor-id → print-element-class ──────────────
const FIELD_MAP = {
  sankhya       : 'p_sankhya',
  patna_date    : 'p_patna_date',
  patna_year    : 'p_patna_year',
  lower_court   : 'p_lower_court',
  decree_no     : 'p_decree_no',
  decree_date   : 'p_decree_date',
  appellant     : 'p_appellant',
  respondent    : 'p_respondent',
  notice_date   : 'p_notice_date',
  return_detail : 'p_return_detail',
  extra_anurodh : 'p_extra_anurodh',
  appeal_no     : 'p_appeal_no',
  goshwara      : 'p_goshwara',
  suchnayein    : 'p_suchnayein',
  pratilipi1    : 'p_pratilipi1',
};

// ── Sync all editor fields → print page ───────────────────────
function syncFields() {
  const container = document.getElementById('printContainer');
  const template = document.getElementById('printTemplate');
  if (!container || !template) return;
  
  container.innerHTML = ''; // clear

  const recipientBlocks = document.querySelectorAll('.recipient-block');
  
  recipientBlocks.forEach((block, index) => {
    const clone = template.content.cloneNode(true);
    
    // populate standard fields
    for (const [editorId, printClass] of Object.entries(FIELD_MAP)) {
      const input = document.getElementById(editorId);
      const output = clone.querySelector('.' + printClass);
      if (input && output) {
        output.textContent = input.value.trim() || '\u00A0';
      }
    }

    // populate recipient specific fields
    const nameInput = block.querySelector('.recipient-name');
    const addressInput = block.querySelector('.recipient-address');
    
    const sevame1Out = clone.querySelector('.p_sevame1');
    const sevame2Out = clone.querySelector('.p_sevame2');
    
    if (sevame1Out) sevame1Out.textContent = nameInput ? nameInput.value.trim() || '\u00A0' : '\u00A0';
    if (sevame2Out) sevame2Out.textContent = addressInput ? addressInput.value.trim() || '\u00A0' : '\u00A0';

    container.appendChild(clone);
  });
}

let recipientCount = 1;
function addRecipient() {
  recipientCount++;
  const container = document.getElementById('recipientsContainer');
  const block = document.createElement('div');
  block.className = 'seva-section recipient-block';
  block.style.marginTop = '10px';
  block.innerHTML = `
    <div class="recipient-header" style="display:flex; justify-content:space-between; align-items:center;">
      <span class="label-bold">सेवा में, (प्राप्तकर्ता ${recipientCount})</span>
      <button class="btn btn-sm no-print" style="background:#fce8e6; color:#d93025; border:1px solid #d93025; padding:2px 8px; border-radius:4px; cursor:pointer;" onclick="removeRecipient(this)">हटाएं (Remove)</button>
    </div>
    <div class="dotted-line-row">
      <input type="text" class="field field-full recipient-name" placeholder="प्राप्तकर्ता का नाम / पद" />
    </div>
    <div class="dotted-line-row">
      <input type="text" class="field field-full recipient-address" placeholder="पता / कार्यालय" />
    </div>
  `;
  container.appendChild(block);
  syncFields();
}

function removeRecipient(btn) {
  const block = btn.closest('.recipient-block');
  if (block) {
    block.remove();
    updateRecipientLabels();
    syncFields();
  }
}

function updateRecipientLabels() {
  const blocks = document.querySelectorAll('.recipient-block');
  blocks.forEach((block, index) => {
    const label = block.querySelector('.label-bold');
    if (label) {
      label.textContent = 'सेवा में, (प्राप्तकर्ता ' + (index + 1) + ')';
    }
  });
  recipientCount = blocks.length;
}

// ── Live-sync on every keystroke ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // ── Auto-populate current date and year from computer ────────
  const now = new Date();
  const monthsHindi = [
    "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
  ];
  
  const patnaDateInput = document.getElementById('patna_date');
  const patnaYearInput = document.getElementById('patna_year');
  const noticeDateInput = document.getElementById('notice_date');
  const returnDetailInput = document.getElementById('return_detail');

  if (patnaDateInput && !patnaDateInput.value) {
    patnaDateInput.value = now.getDate() + ' ' + monthsHindi[now.getMonth()];
  }
  if (patnaYearInput && !patnaYearInput.value) {
    patnaYearInput.value = now.getFullYear();
  }
  if (noticeDateInput && !noticeDateInput.value) {
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    noticeDateInput.value = `${day}-${month}-${now.getFullYear()}`;
  }
  if (returnDetailInput && !returnDetailInput.value) {
    const sixWeeksLater = new Date(now.getTime() + 6 * 7 * 24 * 60 * 60 * 1000);
    const day = String(sixWeeksLater.getDate()).padStart(2, '0');
    const month = String(sixWeeksLater.getMonth() + 1).padStart(2, '0');
    returnDetailInput.value = `${day}-${month}-${sixWeeksLater.getFullYear()}`;
  }

  for (const editorId of Object.keys(FIELD_MAP)) {
    const input = document.getElementById(editorId);
    if (input) {
      input.addEventListener('input', syncFields);
      input.addEventListener('change', syncFields);
    }
  }

  // Event delegation for dynamically added recipients
  const recipientsContainer = document.getElementById('recipientsContainer');
  if (recipientsContainer) {
    recipientsContainer.addEventListener('input', syncFields);
    recipientsContainer.addEventListener('change', syncFields);
  }

  // ── Custom modal listeners ──
  const modal = document.getElementById('confirmModal');
  const confirmCancel = document.getElementById('confirmCancel');
  const confirmOk = document.getElementById('confirmOk');

  if (modal && confirmCancel && confirmOk) {
    const hideModal = () => {
      modal.classList.remove('active');
      setTimeout(() => { modal.style.display = 'none'; }, 300);
    };
    confirmCancel.addEventListener('click', hideModal);
    confirmOk.addEventListener('click', () => {
      // Clear non-recipient fields
      for (const editorId of Object.keys(FIELD_MAP)) {
        const input = document.getElementById(editorId);
        if (input) input.value = '';
      }
      
      // Reset recipient blocks to exactly 1 empty block
      const container = document.getElementById('recipientsContainer');
      if (container) {
        const blocks = container.querySelectorAll('.recipient-block');
        for (let i = 1; i < blocks.length; i++) {
          blocks[i].remove();
        }
        const firstBlock = container.querySelector('.recipient-block');
        if (firstBlock) {
          const inputs = firstBlock.querySelectorAll('input');
          inputs.forEach(inp => inp.value = '');
        }
        updateRecipientLabels();
      }
      // Re-populate default dates
      const now = new Date();
      const monthsHindi = [
        "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
        "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"
      ];
      const patnaDateInput = document.getElementById('patna_date');
      const patnaYearInput = document.getElementById('patna_year');
      const noticeDateInput = document.getElementById('notice_date');
      const returnDetailInput = document.getElementById('return_detail');
      if (patnaDateInput) patnaDateInput.value = now.getDate() + ' ' + monthsHindi[now.getMonth()];
      if (patnaYearInput) patnaYearInput.value = now.getFullYear();
      if (noticeDateInput) {
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        noticeDateInput.value = `${day}-${month}-${now.getFullYear()}`;
      }
      if (returnDetailInput) {
        const sixWeeksLater = new Date(now.getTime() + 6 * 7 * 24 * 60 * 60 * 1000);
        const day = String(sixWeeksLater.getDate()).padStart(2, '0');
        const month = String(sixWeeksLater.getMonth() + 1).padStart(2, '0');
        returnDetailInput.value = `${day}-${month}-${sixWeeksLater.getFullYear()}`;
      }
      syncFields();
      hideModal();
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideModal();
    });
  }

  // ── Autocomplete / Auto-populate logic ──────────────────────
  const sankhyaInput = document.getElementById('sankhya');
  const suggestionsDiv = document.getElementById('sankhyaSuggestions');

  if (sankhyaInput && suggestionsDiv && typeof CASES_DB !== 'undefined') {
    let activeIndex = -1;

    sankhyaInput.addEventListener('input', () => {
      const query = sankhyaInput.value.trim().toUpperCase().replace(/\s+/g, '');
      activeIndex = -1;
      if (!query) {
        suggestionsDiv.style.display = 'none';
        const appellantInput = document.getElementById('appellant');
        const respondentInput = document.getElementById('respondent');
        const appealNoInput = document.getElementById('appeal_no');
        if (appellantInput) appellantInput.value = '';
        if (respondentInput) respondentInput.value = '';
        if (appealNoInput) appealNoInput.value = '';
        syncFields();
        return;
      }

      // Find matching cases
      const matches = Object.keys(CASES_DB).filter(caseNo => {
        const normCase = caseNo.toUpperCase().replace(/\s+/g, '');
        return normCase.includes(query);
      }).slice(0, 10);

      // Render suggestions
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
          items[0].click(); // Select first item if user hits enter
        }
      } else if (e.key === 'Escape') {
        suggestionsDiv.style.display = 'none';
      }
    });

    sankhyaInput.addEventListener('blur', () => {
      // Small delay to allow click event on suggestion items to fire
      setTimeout(() => {
        const val = sankhyaInput.value.trim();
        // Exact match check on blur
        const exactMatch = Object.keys(CASES_DB).find(caseNo => 
          caseNo.toUpperCase().replace(/\s+/g, '') === val.toUpperCase().replace(/\s+/g, '')
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

    function selectCase(caseNo) {
      sankhyaInput.value = caseNo;
      suggestionsDiv.style.display = 'none';
      
      const caseData = CASES_DB[caseNo];
      if (caseData) {
        const appellantInput = document.getElementById('appellant');
        const respondentInput = document.getElementById('respondent');
        const appealNoInput = document.getElementById('appeal_no');
        if (appellantInput) appellantInput.value = caseData.appellant || '';
        if (respondentInput) respondentInput.value = caseData.respondent || '';
        if (appealNoInput) appealNoInput.value = caseNo;
      }
      syncFields();
    }

    // Dismiss suggestions list on clicking outside
    document.addEventListener('click', (e) => {
      if (!sankhyaInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = 'none';
      }
    });
  }

  syncFields(); // initial sync
});

// ── Toggle Preview mode ───────────────────────────────────────
let previewActive = false;

function togglePreview() {
  syncFields();
  previewActive = !previewActive;
  document.body.classList.toggle('preview-active', previewActive);

  const btn = document.querySelector('.btn-preview');
  if (previewActive) {
    btn.textContent = '✏️ Edit Form';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    btn.textContent = '👁 Preview';
  }
}

// ── Print ─────────────────────────────────────────────────────
async function printForm() {
  syncFields();
  document.body.classList.add('preview-active');

  const caseNo = document.getElementById('sankhya')?.value.trim();
  if (caseNo && typeof saveToCloud === 'function') {
    try {
      await saveToCloud(true);
      showToast('✅ Record saved automatically.');
    } catch (e) {
      console.warn('Auto-save on print failed:', e);
    }
  }

  setTimeout(() => {
    window.print();
    if (!previewActive) {
      document.body.classList.remove('preview-active');
    }
  }, 200);
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


// ── Clear form ────────────────────────────────────────────────
function clearForm() {
  const modal = document.getElementById('confirmModal');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => { modal.classList.add('active'); }, 10);
  }
}

// ── Supabase Cloud Storage Integrations ──────────────────────────
// ── Local Ethernet Storage Integrations ──────────────────────────
async function saveToCloud(silent = false) {
  const caseNoInput = document.getElementById('sankhya').value.trim();
  if (!caseNoInput) {
    if (!silent) alert("Please enter a Case Number (संख्या) before saving.");
    return;
  }

  const noticeData = {};
  for (const editorId of Object.keys(FIELD_MAP)) {
    const input = document.getElementById(editorId);
    if (input) {
      noticeData[editorId] = input.value.trim();
    }
  }

  const recipients = [];
  document.querySelectorAll('.recipient-block').forEach(block => {
    recipients.push({
      name: block.querySelector('.recipient-name')?.value.trim() || '',
      address: block.querySelector('.recipient-address')?.value.trim() || ''
    });
  });
  noticeData.recipients = recipients;
  noticeData.caseNo = caseNoInput;

  const doSaveNotice = async () => {
    try {
      if (window.PortalDB) {
        await window.PortalDB.insertNoticeForm(noticeData);
        if (!silent) alert('Notice successfully saved!');
      }
    } catch (error) {
      console.error('Error saving Notice:', error);
      if (!silent) alert('Error saving Notice.');
    }
  };

  if (!silent && typeof window.promptSaveCaseRecord === 'function') {
    let caseType = 'First Appeal';
    let caseNo = caseNoInput;
    let caseYear = document.getElementById('patna_year')?.value || '';
    
    if (caseNoInput.includes('/')) {
      const parts = caseNoInput.split('/');
      if (parts.length === 3) {
        caseType = parts[0] === 'FA' ? 'First Appeal' : parts[0];
        caseNo = parts[1];
        caseYear = parts[2];
      } else if (parts.length === 2) {
        caseNo = parts[0];
        caseYear = parts[1];
      }
    }

    const extractedData = {
      case_type: caseType,
      case_no: caseNo,
      case_year: caseYear,
      appellant: document.getElementById('appellant')?.value || '',
      respondent: document.getElementById('respondent')?.value || '',
      lc_court: '',
      lc_case_no: document.getElementById('decree_no')?.value || '',
      date_of_decree_award: document.getElementById('decree_date')?.value || ''
    };

    if (confirm("Do you want to check and update this case in the Master Case Records? \n\nClick 'OK' to update the Master Record.\nClick 'Cancel' to ONLY save the Notice Form.")) {
      window.promptSaveCaseRecord(extractedData, doSaveNotice, doSaveNotice);
    } else {
      doSaveNotice();
    }
  } else {
    doSaveNotice();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveToCloudBtn');
  const viewBtn = document.getElementById('viewCloudBtn');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveToCloud(false));
  }

  if (viewBtn) {
    viewBtn.addEventListener('click', async () => {
      const searchCaseNo = prompt("Enter Case Number to fetch Notice (e.g. FA/3/1973):");
      if (!searchCaseNo) return;

      try {
        const data = await window.PortalDB.getNoticeForms();
        const matches = data.filter(n => (n.caseNo || '').toString().toLowerCase().trim() === searchCaseNo.toString().toLowerCase().trim());
        if (matches.length === 0) { alert('No Notice found for Case Number: ' + searchCaseNo); return; }
        let notice = matches[0];
        for (const editorId of Object.keys(FIELD_MAP)) {
          const input = document.getElementById(editorId);
          if (input && notice[editorId] !== undefined) input.value = notice[editorId];
        }
        if (notice.recipients && Array.isArray(notice.recipients)) {
          const container = document.getElementById('recipientsContainer');
          if (container) {
            const blocks = container.querySelectorAll('.recipient-block');
            for (let i = 1; i < blocks.length; i++) blocks[i].remove();
            recipientCount = 1;
            const firstBlock = container.querySelector('.recipient-block');
            if (firstBlock && notice.recipients.length > 0) {
              firstBlock.querySelector('.recipient-name').value = notice.recipients[0].name || '';
              firstBlock.querySelector('.recipient-address').value = notice.recipients[0].address || '';
            }
            for (let i = 1; i < notice.recipients.length; i++) {
              addRecipient();
              const newBlocks = container.querySelectorAll('.recipient-block');
              const nb = newBlocks[newBlocks.length - 1];
              nb.querySelector('.recipient-name').value = notice.recipients[i].name || '';
              nb.querySelector('.recipient-address').value = notice.recipients[i].address || '';
            }
          }
        }
        syncFields();
        alert('Notice loaded successfully!');
      } catch (error) {
        console.error('Error fetching Notice:', error);
        alert('Error loading Notice.');
      }
    });
  }
});
