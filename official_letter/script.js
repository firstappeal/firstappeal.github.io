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

  // Font size on body
  const bodyEl = document.getElementById('p_body');
  const fs = document.getElementById('font_size_select')?.value || '12pt';
  if (bodyEl) bodyEl.style.fontSize = fs;
}

// ── Formatting toolbar: operates on selection inside p_body ──
function applyFormat(cmd) {
  const body = document.getElementById('p_body');
  if (!body) return;
  // If selection is inside body, execCommand applies to it.
  // If not, focus the body first (cursor goes to end).
  const sel = window.getSelection();
  const insideBody = body.contains(sel.anchorNode);
  if (!insideBody) body.focus();
  document.execCommand(cmd, false, null);
  updateToolbarState();
}

function updateToolbarState() {
  [
    { id:'fmtBold',      cmd:'bold'         },
    { id:'fmtItalic',    cmd:'italic'       },
    { id:'fmtUnderline', cmd:'underline'    },
    { id:'fmtAlignLeft',   cmd:'justifyLeft'   },
    { id:'fmtAlignCenter', cmd:'justifyCenter' },
    { id:'fmtAlignRight',  cmd:'justifyRight'  },
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
  document.getElementById('salutation').value   = 'Sir,';
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

  // FA expansion on body input
  const bodyEl = document.getElementById('p_body');
  if (bodyEl) {
    bodyEl.addEventListener('input', () => { scheduleExpansion(); updateToolbarState(); });
    bodyEl.addEventListener('keyup',   updateToolbarState);
    bodyEl.addEventListener('mouseup', updateToolbarState);
  }

  // Toolbar buttons — use mousedown to prevent losing selection
  document.getElementById('fmtBold')?.addEventListener('mousedown',      e => { e.preventDefault(); applyFormat('bold'); });
  document.getElementById('fmtItalic')?.addEventListener('mousedown',    e => { e.preventDefault(); applyFormat('italic'); });
  document.getElementById('fmtUnderline')?.addEventListener('mousedown', e => { e.preventDefault(); applyFormat('underline'); });
  document.getElementById('fmtClearFmt')?.addEventListener('mousedown',  e => { e.preventDefault(); applyFormat('removeFormat'); });
  document.getElementById('fmtAlignLeft')?.addEventListener('mousedown', e => { e.preventDefault(); applyFormat('justifyLeft'); });
  document.getElementById('fmtAlignCenter')?.addEventListener('mousedown',e=>{ e.preventDefault(); applyFormat('justifyCenter'); });
  document.getElementById('fmtAlignRight')?.addEventListener('mousedown',e => { e.preventDefault(); applyFormat('justifyRight'); });

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

  syncFields();
});
