/* ============================================================
   OFFICIAL LETTER WRITER – SCRIPT
   ============================================================ */

// ── Date Helper ──────────────────────────────────────────────
function getFormattedCurrentDate() {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const monthName = months[now.getMonth()];
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";
  return `${day}${suffix} ${monthName}, ${year}`;
}

// ── Field Map (input id → preview element id) ────────────────
const FIELD_MAP = {
  letter_no    : 'p_letter_no',
  file_no      : 'p_file_no',
  section_dept : 'p_section_dept',
  letter_date  : 'p_letter_date',
  sender_title : 'p_sender_title',
  to_title     : 'p_to_title',
  to_address   : 'p_to_address',
  subject_text : 'p_subject_text',
  salutation   : 'p_salutation',
  closing      : 'p_closing',
  signatory    : 'p_signatory',
};

// ── Build body HTML from textarea value ──────────────────────
function buildBodyHtml(rawText, opts) {
  if (!rawText || !rawText.trim()) {
    return `<p style="margin:0;color:#aaa;font-style:italic;">Start typing your letter body on the left…</p>`;
  }

  const paragraphs = rawText.split(/\n+/).filter(p => p.trim());
  const lineH = opts.spacing ? '1.9' : '1.7';
  const indent = opts.indent ? 'text-indent:40pt;' : '';
  const textAlign = opts.justify ? 'text-align:justify;' : 'text-align:left;';

  return paragraphs.map(p =>
    `<p style="margin:0 0 8pt 0;${indent}${textAlign}line-height:${lineH};">${escHtml(p.trim())}</p>`
  ).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Main Sync ─────────────────────────────────────────────────
function syncFields() {
  // Simple field map
  for (const [inputId, previewId] of Object.entries(FIELD_MAP)) {
    const inp  = document.getElementById(inputId);
    const prev = document.getElementById(previewId);
    if (inp && prev) prev.textContent = inp.value.trim() || '\u00A0';
  }

  // Collect options
  const opts = {
    justify     : document.getElementById('opt_justify')?.checked  ?? true,
    indent      : document.getElementById('opt_indent')?.checked   ?? true,
    spacing     : document.getElementById('opt_spacing')?.checked  ?? false,
    boldSubject : document.getElementById('opt_bold_subject')?.checked ?? true,
    watermark   : document.getElementById('opt_watermark')?.checked ?? true,
    fontSize    : document.getElementById('font_size_select')?.value || '12pt',
  };

  // Body
  const rawBody = document.getElementById('body_text')?.value || '';
  const bodyEl  = document.getElementById('p_body');
  if (bodyEl) {
    bodyEl.innerHTML  = buildBodyHtml(rawBody, opts);
    bodyEl.style.fontSize = opts.fontSize;
  }

  // Subject bold toggle
  const subjEl = document.getElementById('p_subject_text');
  if (subjEl) subjEl.style.fontWeight = opts.boldSubject ? 'bold' : 'normal';

  // Watermark
  const wmEl = document.getElementById('watermarkDiv');
  if (wmEl) wmEl.style.display = opts.watermark ? '' : 'none';

  // Char counter
  const counter = document.getElementById('charCounter');
  if (counter) counter.textContent = `${rawBody.length} chars`;
}

// ── Print ─────────────────────────────────────────────────────
function printLetter() {
  syncFields();
  window.print();
}

// ── Clear logic ───────────────────────────────────────────────
function clearAllFields() {
  document.getElementById('letter_no').value    = '';
  document.getElementById('file_no').value      = '';
  document.getElementById('section_dept').value = 'First Appeal Section';
  document.getElementById('letter_date').value  = getFormattedCurrentDate();
  document.getElementById('sender_title').value = 'Assistant Registrar';
  document.getElementById('to_title').value     = '';
  document.getElementById('to_address').value   = '';
  document.getElementById('subject_text').value = '';
  document.getElementById('salutation').value   = 'Sir,';
  document.getElementById('body_text').value    = '';
  document.getElementById('closing').value      = 'Yours faithfully,';
  document.getElementById('signatory').value    = 'Assistant Registrar';
  syncFields();
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Auto date
  const dateInp = document.getElementById('letter_date');
  if (dateInp && !dateInp.value) dateInp.value = getFormattedCurrentDate();

  // Attach listeners to all text inputs
  document.querySelectorAll('.editor-panel input, .editor-panel textarea, .editor-panel select').forEach(el => {
    el.addEventListener('input',  syncFields);
    el.addEventListener('change', syncFields);
  });

  // Clear button → show modal
  const clearBtn   = document.getElementById('clearBtn');
  const clearModal = document.getElementById('clearModal');
  const clearCancel= document.getElementById('clearCancel');
  const clearOk    = document.getElementById('clearOk');

  const showClearModal = () => {
    clearModal.style.display = 'flex';
    setTimeout(() => clearModal.classList.add('active'), 10);
  };
  const hideClearModal = () => {
    clearModal.classList.remove('active');
    setTimeout(() => { clearModal.style.display = 'none'; }, 220);
  };

  if (clearBtn)    clearBtn.addEventListener('click', showClearModal);
  if (clearCancel) clearCancel.addEventListener('click', hideClearModal);
  if (clearOk)     clearOk.addEventListener('click', () => { clearAllFields(); hideClearModal(); });
  if (clearModal)  clearModal.addEventListener('click', e => { if (e.target === clearModal) hideClearModal(); });

  // Initial render
  syncFields();
});
