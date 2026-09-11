/* ============================================================
   OFFICIAL LETTER WRITER – SCRIPT  (direct-edit on preview)
   ============================================================ */

// ── Date Helper ───────────────────────────────────────────────
function getFormattedCurrentDate() {
  const now = new Date();
  const day = now.getDate();
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  let suffix = "th";
  if (day===1||day===21||day===31) suffix="st";
  else if (day===2||day===22) suffix="nd";
  else if (day===3||day===23) suffix="rd";
  return `${day}${suffix} ${months[now.getMonth()]}, ${now.getFullYear()}`;
}

// ── Plain-text field sync (header/metadata fields only) ───────
const FIELD_MAP = {
  letter_no    : 'p_letter_no',
  letter_date  : 'p_letter_date',
  sender_title : 'p_sender_title',
  to_title     : 'p_to_title',
  to_address   : 'p_to_address',
  subject_text : 'p_subject_text',
  salutation   : 'p_salutation',
  closing      : 'p_closing',
  signatory    : 'p_signatory',
};

function syncFields() {
  for (const [inputId, previewId] of Object.entries(FIELD_MAP)) {
    const inp  = document.getElementById(inputId);
    const prev = document.getElementById(previewId);
    if (inp && prev) prev.textContent = inp.value.trim() || '\u00A0';
  }

  // Subject bold toggle
  const subjEl = document.getElementById('p_subject_text');
  if (subjEl) subjEl.style.fontWeight =
    document.getElementById('opt_bold_subject')?.checked ? 'bold' : 'normal';

  // Watermark
  const wmEl = document.getElementById('watermarkDiv');
  if (wmEl) wmEl.style.display =
    document.getElementById('opt_watermark')?.checked ? '' : 'none';

  // Endorsement block visibility and syncing
  const endorsementBlock = document.getElementById('endorsement_block');
  if (endorsementBlock) {
    const isEndorsement = document.getElementById('opt_endorsement')?.checked;
    endorsementBlock.style.display = isEndorsement ? 'block' : 'none';
    
    if (isEndorsement) {
      const lNo = document.getElementById('letter_no')?.value.trim() || '………';
      const lDate = document.getElementById('letter_date')?.value.trim() || '………… 20……';
      const sig = document.getElementById('signatory')?.value.trim() || 'Assistant Registrar';
      
      endorsementBlock.querySelectorAll('.sync_letter_date').forEach(el => el.textContent = lDate);
      endorsementBlock.querySelectorAll('.sync_signatory').forEach(el => el.textContent = sig);
    }
  }

  // Font size on body and endorsement
  const bodyEl = document.getElementById('p_body');
  const copyToEl = document.getElementById('p_copy_to');
  const fs = document.getElementById('font_size_select')?.value || '12pt';
  if (bodyEl) bodyEl.style.fontSize = fs;
  if (copyToEl) copyToEl.style.fontSize = fs;
}

// ── Formatting toolbar: operates on selection inside contenteditable ──
function applyFormat(cmd) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  let target = sel.anchorNode;
  if (target.nodeType === Node.TEXT_NODE) target = target.parentElement;
  
  const editable = target.closest('[contenteditable="true"]');
  
  // If not inside an editable block, default to p_body
  if (!editable) {
    const body = document.getElementById('p_body');
    if (body) body.focus();
  }
  
  document.execCommand(cmd, false, null);
  updateToolbarState();
}

function updateToolbarState() {
  [
    { id:'fmtBold',        cmd:'bold' },
    { id:'fmtItalic',      cmd:'italic' },
    { id:'fmtUnderline',   cmd:'underline' },
    { id:'fmtStrike',      cmd:'strikeThrough' },
    { id:'fmtAlignLeft',   cmd:'justifyLeft' },
    { id:'fmtAlignCenter', cmd:'justifyCenter' },
    { id:'fmtAlignRight',  cmd:'justifyRight' },
    { id:'fmtAlignJustify',cmd:'justifyFull' },
    { id:'fmtBulletedList',cmd:'insertUnorderedList' },
    { id:'fmtNumberedList',cmd:'insertOrderedList' }
  ].forEach(({ id, cmd }) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('fmt-btn-active', document.queryCommandState(cmd));
  });
}

// ── FA Case Auto-Expansion ────────────────────────────────────
// Matches: FA No. 182/1980 (not already expanded with party names)
const FA_RE = /\bFA\s+No\.?\s+(\d+)\s*\/\s*(\d{4})(?!\s*\()/g;

let expandTimer = null;
let subjectExpandTimer = null;

function scheduleExpansion() {
  clearTimeout(expandTimer);
  expandTimer = setTimeout(expandCaseReferences, 900);
}

// FA expansion for the plain-text subject input
function scheduleSubjectExpansion() {
  clearTimeout(subjectExpandTimer);
  subjectExpandTimer = setTimeout(expandSubjectCaseRef, 900);
}

async function expandSubjectCaseRef() {
  const inp = document.getElementById('subject_text');
  if (!inp) return;
  const text = inp.value;
  FA_RE.lastIndex = 0;
  const match = FA_RE.exec(text);
  if (!match) return;

  const caseNo = match[1], caseYear = match[2];
  const key = `FA/${caseNo}/${caseYear}`;
  let appellant = '', respondent = '';

  if (typeof CASES_DB !== 'undefined' && CASES_DB[key]) {
    appellant  = CASES_DB[key].appellant  || '';
    respondent = CASES_DB[key].respondent || '';
  }
  if (!appellant && window.PortalDB && typeof window.PortalDB.getSingleCaseRecord === 'function') {
    try {
      const rec = await window.PortalDB.getSingleCaseRecord('First Appeal', caseNo, caseYear);
      if (rec) { appellant = rec.appellant||''; respondent = rec.respondent||''; }
    } catch(e) {}
  }
  if (!appellant && !respondent) return;

  const parties = appellant && respondent
    ? `${appellant} Vs ${respondent}` : (appellant || respondent);

  // Replace pattern in input value (plain text — no bold here, just brackets)
  FA_RE.lastIndex = 0;
  inp.value = text.replace(
    /\bFA\s+No\.?\s+(\d+)\s*\/\s*(\d{4})(?!\s*\()/g,
    (_, no, yr) => `FA No. ${no}/${yr} (${parties})`
  );
  syncFields(); // refresh preview
}

// Save & restore cursor offset (character index from start of p_body text)
function getCursorOffset(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return -1;
  const range = sel.getRangeAt(0);
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().length;
}

function setCursorAtOffset(el, offset) {
  const sel = window.getSelection();
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let count = 0, node = walker.nextNode();
  while (node) {
    const len = node.textContent.length;
    if (count + len >= offset) {
      range.setStart(node, Math.min(offset - count, len));
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    count += len;
    node = walker.nextNode();
  }
  // fallback: end of element
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

async function expandCaseReferences() {
  const bodyEl = document.getElementById('p_body');
  if (!bodyEl) return;

  const fullText = bodyEl.innerText;
  FA_RE.lastIndex = 0;
  const matches = [];
  let m;
  while ((m = FA_RE.exec(fullText)) !== null) {
    matches.push({ matchStr: m[0], no: m[1], year: m[2] });
  }
  if (matches.length === 0) return;

  // Deduplicate
  const seen = new Set();
  const unique = matches.filter(x => {
    const k = `${x.no}/${x.year}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let expanded = false;
  for (const match of unique) {
    const key = `FA/${match.no}/${match.year}`;
    let appellant = '', respondent = '';

    // 1. Local CASES_DB
    if (typeof CASES_DB !== 'undefined' && CASES_DB[key]) {
      appellant  = CASES_DB[key].appellant  || '';
      respondent = CASES_DB[key].respondent || '';
    }
    // 2. Supabase fallback
    if (!appellant && window.PortalDB && typeof window.PortalDB.getSingleCaseRecord === 'function') {
      try {
        const rec = await window.PortalDB.getSingleCaseRecord('First Appeal', match.no, match.year);
        if (rec) { appellant = rec.appellant||''; respondent = rec.respondent||''; }
      } catch(e) {}
    }

    if (!appellant && !respondent) continue;

    const parties = appellant && respondent
      ? `${appellant} Vs ${respondent}`
      : appellant || respondent;

    // Replace in text nodes (safe — preserves existing formatting)
    const wasExpanded = replacePatternInBody(bodyEl, match.matchStr, match.no, match.year, parties);
    if (wasExpanded) expanded = true;
  }
}

function replacePatternInBody(root, matchStr, caseNo, caseYear, parties) {
  // Re-build the exact string we want to find in text nodes
  // Pattern to find: "FA No. X/YYYY" not followed by "("
  const needle = new RegExp(
    `FA\\s+No\\.?\\s+${caseNo}\\s*\\/\\s*${caseYear}(?!\\s*\\()`, 'g'
  );

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node = walker.nextNode();
  while (node) { textNodes.push(node); node = walker.nextNode(); }

  let changed = false;
  for (const tn of textNodes) {
    if (!needle.test(tn.textContent)) continue;
    needle.lastIndex = 0;

    // Split the text node around each match and insert <strong> for parties
    const parent = tn.parentNode;
    const text   = tn.textContent;
    const frag   = document.createDocumentFragment();
    let lastIdx  = 0;
    let mm;
    needle.lastIndex = 0;
    while ((mm = needle.exec(text)) !== null) {
      // Text before match
      if (mm.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, mm.index)));
      }
      // Canonical form + parties in bold
      const canonical = `FA No. ${caseNo}/${caseYear} `;
      frag.appendChild(document.createTextNode(canonical));
      const strong = document.createElement('strong');
      strong.textContent = `(${parties})`;
      frag.appendChild(strong);
      lastIdx = mm.index + mm[0].length;
      changed = true;
    }
    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    if (changed) {
      parent.replaceChild(frag, tn);
      break; // one node at a time to avoid walker invalidation
    }
  }
  return changed;
}

// ── Toast notification ─────────────────────────────────────────
function showToast(msg, type = 'success') {
  let toast = document.getElementById('olToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'olToast';
    toast.style.cssText = [
      'position:fixed','bottom:28px','right:28px','z-index:99999',
      'padding:12px 22px','border-radius:10px','font-size:0.9rem',
      'font-family:inherit','font-weight:600','box-shadow:0 8px 24px rgba(0,0,0,0.35)',
      'transition:opacity 0.3s','pointer-events:none','opacity:0'
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.style.background = type === 'error' ? '#d9534f' : '#16a34a';
  toast.style.color = '#fff';
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ── Collect current letter data ────────────────────────────────
function collectLetterData() {
  return {
    letter_no:    document.getElementById('letter_no')?.value    || '',
    letter_date:  document.getElementById('letter_date')?.value  || '',
    sender_title: document.getElementById('sender_title')?.value || '',
    to_title:     document.getElementById('to_title')?.value     || '',
    to_address:   document.getElementById('to_address')?.value   || '',
    subject_text: document.getElementById('subject_text')?.value || '',
    salutation:   document.getElementById('salutation')?.value   || '',
    closing:      document.getElementById('closing')?.value      || '',
    signatory:    document.getElementById('signatory')?.value    || '',
    body_html:    document.getElementById('p_body')?.innerHTML   || '',
    has_endorsement: document.getElementById('opt_endorsement')?.checked || false,
    copy_to_html: document.getElementById('p_copy_to')?.innerHTML || '',
  };
}

// ── Save to Supabase (with LocalStorage Fallback) ─────────────
async function saveLetter() {
  const btn = document.getElementById('saveLetterBtn');
  const data = collectLetterData();
  
  if (!data.subject_text && !data.letter_no && !data.body_html.trim()) {
    showToast('Nothing to save — fill in at least a subject or letter body.', 'error');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }
  
  let savedToCloud = false;
  
  // 1. Try saving to Supabase if connected
  if (window.PortalDB && typeof window.PortalDB.insertOfficialLetter === 'function') {
    try {
      await window.PortalDB.insertOfficialLetter(data);
      savedToCloud = true;
      showToast('✅ Letter saved to cloud!');
    } catch(e) {
      console.warn('Supabase save failed:', e);
    }
  }

  // 2. Fallback to LocalStorage if cloud save failed (or no DB)
  if (!savedToCloud) {
    try {
      let localLetters = JSON.parse(localStorage.getItem('court_portal_official_letters') || '[]');
      data.id = 'local_' + Date.now();
      data.saved_at = new Date().toISOString();
      localLetters.push(data);
      localStorage.setItem('court_portal_official_letters', JSON.stringify(localLetters));
      showToast('✅ Letter saved locally! (Cloud unavailable)');
    } catch(e) {
      showToast('Save failed entirely: ' + e.message, 'error');
    }
  }
  
  if (btn) { btn.disabled = false; btn.textContent = '💾 Save Letter'; }
}

// ── Load modal helpers ─────────────────────────────────────────
let _allLetters = [];

function formatSavedDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
       + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
}

function renderLettersModal(filter = '') {
  const tbody  = document.getElementById('lettersModalBody');
  const count  = document.getElementById('lettersModalCount');
  if (!tbody) return;

  const q = filter.toLowerCase().trim();
  const rows = _allLetters.filter(l =>
    !q ||
    l.subject_text?.toLowerCase().includes(q) ||
    l.to_title?.toLowerCase().includes(q)     ||
    l.to_address?.toLowerCase().includes(q)   ||
    l.letter_no?.toLowerCase().includes(q)
  );

  if (count) count.textContent = `${rows.length} letter${rows.length !== 1 ? 's' : ''}`;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--text-muted);">
      ${filter ? 'No letters match your search.' : 'No saved letters yet.'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(l => {
    const isLocal = typeof l.id === 'string' && l.id.startsWith('local_');
    return `
    <tr style="border-bottom:1px solid var(--border-slate);transition:background 0.15s;"
        onmouseover="this.style.background='rgba(201,162,39,0.06)'"
        onmouseout="this.style.background=''">
      <td style="padding:10px 14px;color:var(--text-light);font-weight:600;">${l.letter_no || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td style="padding:10px 14px;color:var(--text-light);">${l.to_title || '<span style="color:var(--text-muted)">—</span>'}<br>
        <small style="color:var(--text-muted);">${l.to_address || ''}</small></td>
      <td style="padding:10px 14px;color:var(--text-light);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${l.subject_text}">${l.subject_text || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td style="padding:10px 14px;color:var(--text-muted);white-space:nowrap;font-size:0.78rem;">
        ${formatSavedDate(l.saved_at)}
        ${isLocal ? '<span style="margin-left:4px;padding:2px 4px;background:#475569;border-radius:4px;font-size:0.65rem;color:#fff;">Local</span>' : ''}
      </td>
      <td style="padding:10px 14px;text-align:center;white-space:nowrap;">
        <button onclick="loadLetter('${l.id}')"
          style="background:var(--gold-primary);color:var(--navy-dark);border:none;padding:5px 14px;border-radius:6px;font-weight:700;cursor:pointer;font-size:0.8rem;margin-right:6px;">
          📂 Load
        </button>
        <button onclick="deleteOfficialLetter('${l.id}', this)"
          style="background:#d9534f;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-weight:700;cursor:pointer;font-size:0.8rem;">
          🗑
        </button>
      </td>
    </tr>`;
  }).join('');
}

async function openLoadModal() {
  const modal = document.getElementById('loadLettersModal');
  if (!modal) return;
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);

  const tbody = document.getElementById('lettersModalBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--text-muted);">⏳ Loading…</td></tr>`;

  _allLetters = [];
  
  // 1. Load from Cloud
  if (window.PortalDB && typeof window.PortalDB.getOfficialLetters === 'function') {
    try {
      const cloudLetters = await window.PortalDB.getOfficialLetters();
      _allLetters.push(...cloudLetters);
    } catch(e) {
      console.warn('Could not load cloud letters:', e);
    }
  }

  // 2. Load from LocalStorage
  try {
    const localLetters = JSON.parse(localStorage.getItem('court_portal_official_letters') || '[]');
    _allLetters.push(...localLetters);
  } catch(e) {
    console.warn('Could not load local letters:', e);
  }
  
  // Sort by date (newest first)
  _allLetters.sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0));

  renderLettersModal(document.getElementById('lettersModalSearch')?.value || '');
}

function closeLoadModal() {
  const modal = document.getElementById('loadLettersModal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => { modal.style.display = 'none'; }, 220);
}

function loadLetter(id) {
  // Coerce ID to string for comparison since local IDs are strings and cloud IDs might be numbers
  const letter = _allLetters.find(l => String(l.id) === String(id));
  if (!letter) return;

  document.getElementById('letter_no').value    = letter.letter_no || '';
  document.getElementById('letter_date').value  = letter.letter_date || '';
  document.getElementById('sender_title').value = letter.sender_title || '';
  document.getElementById('to_title').value     = letter.to_title || '';
  document.getElementById('to_address').value   = letter.to_address || '';
  document.getElementById('subject_text').value = letter.subject_text || '';
  document.getElementById('salutation').value   = letter.salutation || '';
  document.getElementById('closing').value      = letter.closing || '';
  document.getElementById('signatory').value    = letter.signatory || '';

  const optEndorsement = document.getElementById('opt_endorsement');
  if (optEndorsement) optEndorsement.checked = letter.has_endorsement || false;

  const bodyEl = document.getElementById('p_body');
  if (bodyEl) bodyEl.innerHTML = letter.body_html || '';

  const copyToEl = document.getElementById('p_copy_to');
  if (copyToEl) copyToEl.innerHTML = letter.copy_to_html || '';

  syncFields();
  closeLoadModal();
  showToast('✅ Letter loaded!');
}

async function deleteOfficialLetter(id, btn) {
  if (!confirm('Delete this saved letter? This cannot be undone.')) return;
  if (btn) btn.disabled = true;
  
  const isLocal = typeof id === 'string' && id.startsWith('local_');
  
  try {
    if (isLocal) {
      let localLetters = JSON.parse(localStorage.getItem('court_portal_official_letters') || '[]');
      localLetters = localLetters.filter(l => l.id !== id);
      localStorage.setItem('court_portal_official_letters', JSON.stringify(localLetters));
    } else {
      if (window.PortalDB && typeof window.PortalDB.deleteOfficialLetter === 'function') {
        await window.PortalDB.deleteOfficialLetter(id);
      }
    }
    
    // Update local state and UI
    _allLetters = _allLetters.filter(l => String(l.id) !== String(id));
    renderLettersModal(document.getElementById('lettersModalSearch')?.value || '');
    showToast('🗑 Letter deleted.');
  } catch(e) {
    showToast('Delete failed: ' + e.message, 'error');
    if (btn) btn.disabled = false;
  }
}

// ── Print ─────────────────────────────────────────────────────
function printLetter() {
  syncFields();
  window.print();
}

// ── Clear ─────────────────────────────────────────────────────
function clearAllFields() {
  document.getElementById('letter_no').value    = '';
  document.getElementById('letter_date').value  = getFormattedCurrentDate();
  document.getElementById('sender_title').value = 'Assistant Registrar';
  document.getElementById('to_title').value     = '';
  document.getElementById('to_address').value   = '';
  document.getElementById('subject_text').value = '';
  document.getElementById('salutation').value   = 'Sir/Madam,';
  document.getElementById('closing').value      = 'Yours faithfully,';
  document.getElementById('signatory').value    = 'Assistant Registrar';
  const bodyEl = document.getElementById('p_body');
  if (bodyEl) bodyEl.innerHTML = '';
  syncFields();
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Auto-date
  const dateInp = document.getElementById('letter_date');
  if (dateInp && !dateInp.value) dateInp.value = getFormattedCurrentDate();

  // Sync on left-panel input changes
  document.querySelectorAll('.editor-panel input, .editor-panel select').forEach(el => {
    el.addEventListener('input',  syncFields);
    el.addEventListener('change', syncFields);
  });

  // FA expansion in subject field
  document.getElementById('subject_text')?.addEventListener('input', () => {
    syncFields();
    scheduleSubjectExpansion();
  });

  // FA expansion on body input + Tab/Enter key handling
  const bodyEl = document.getElementById('p_body');
  if (bodyEl) {
    // Ensure paragraph separator is always <p>
    document.execCommand('defaultParagraphSeparator', false, 'p');

    // On first focus: wrap any bare text / empty state in a <p>
    // so the very first character typed is always inside a paragraph.
    bodyEl.addEventListener('focus', () => {
      // If there are no block-level children yet, wrap content in <p>
      const hasBlock = bodyEl.querySelector('p, div');
      if (!hasBlock) {
        const text = bodyEl.innerText.trim();
        bodyEl.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = text;
        bodyEl.appendChild(p);
        // Move cursor to end of the new paragraph
        const range = document.createRange();
        range.selectNodeContents(p);
        range.collapse(false);
        sel.addRange(range);
      }
    });

    const handleTab = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '\t');
        return;
      }
    };

    bodyEl.addEventListener('keydown', handleTab);
    const copyToEl = document.getElementById('p_copy_to');
    if (copyToEl) copyToEl.addEventListener('keydown', handleTab);

    bodyEl.addEventListener('input',   () => { scheduleExpansion(); updateToolbarState(); });
    if (copyToEl) copyToEl.addEventListener('input', () => updateToolbarState());
    bodyEl.addEventListener('keyup',   updateToolbarState);
    bodyEl.addEventListener('mouseup', updateToolbarState);
  }

  // Toolbar buttons — use mousedown to prevent losing selection
  document.getElementById('fmtBold')?.addEventListener('mousedown',      e => { e.preventDefault(); applyFormat('bold'); });
  document.getElementById('fmtItalic')?.addEventListener('mousedown',    e => { e.preventDefault(); applyFormat('italic'); });
  document.getElementById('fmtUnderline')?.addEventListener('mousedown', e => { e.preventDefault(); applyFormat('underline'); });
  document.getElementById('fmtStrike')?.addEventListener('mousedown',    e => { e.preventDefault(); applyFormat('strikeThrough'); });
  document.getElementById('fmtClearFmt')?.addEventListener('mousedown',  e => { e.preventDefault(); applyFormat('removeFormat'); });
  document.getElementById('fmtAlignLeft')?.addEventListener('mousedown', e => { e.preventDefault(); applyFormat('justifyLeft'); });
  document.getElementById('fmtAlignCenter')?.addEventListener('mousedown',e=>{ e.preventDefault(); applyFormat('justifyCenter'); });
  document.getElementById('fmtAlignRight')?.addEventListener('mousedown',e => { e.preventDefault(); applyFormat('justifyRight'); });
  document.getElementById('fmtAlignJustify')?.addEventListener('mousedown',e=>{ e.preventDefault(); applyFormat('justifyFull'); });
  document.getElementById('fmtBulletedList')?.addEventListener('mousedown',e=>{ e.preventDefault(); applyFormat('insertUnorderedList'); });
  document.getElementById('fmtNumberedList')?.addEventListener('mousedown',e=>{ e.preventDefault(); applyFormat('insertOrderedList'); });
  document.getElementById('fmtOutdent')?.addEventListener('mousedown',   e => { e.preventDefault(); applyFormat('outdent'); });
  document.getElementById('fmtIndent')?.addEventListener('mousedown',    e => { e.preventDefault(); applyFormat('indent'); });

  // Clear modal
  const clearModal  = document.getElementById('clearModal');
  const clearCancel = document.getElementById('clearCancel');
  const clearOk     = document.getElementById('clearOk');

  const showModal = () => { clearModal.style.display='flex'; setTimeout(()=>clearModal.classList.add('active'),10); };
  const hideModal = () => { clearModal.classList.remove('active'); setTimeout(()=>{ clearModal.style.display='none'; },220); };

  document.getElementById('clearBtn')?.addEventListener('click', showModal);
  clearCancel?.addEventListener('click', hideModal);
  clearOk?.addEventListener('click', () => { clearAllFields(); hideModal(); });
  clearModal?.addEventListener('click', e => { if (e.target===clearModal) hideModal(); });

  // Save / Load Letters buttons
  document.getElementById('saveLetterBtn')?.addEventListener('click', saveLetter);
  document.getElementById('loadLettersBtn')?.addEventListener('click', openLoadModal);

  // Load Letters modal — close buttons & backdrop & search
  document.getElementById('closeLettersModal')?.addEventListener('click', closeLoadModal);
  document.getElementById('closeLettersModalBtn')?.addEventListener('click', closeLoadModal);
  document.getElementById('loadLettersModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('loadLettersModal')) closeLoadModal();
  });
  document.getElementById('lettersModalSearch')?.addEventListener('input', e => {
    renderLettersModal(e.target.value);
  });

  syncFields();
});
