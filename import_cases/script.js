/* ============================================================
   IMPORT CASES FROM PDF — SCRIPT
   Patna High Court · First Appeal Section
   
   PDF Format (from partynames.pdf):
     Sr | Case No     | Party Details                              | Total
      1 | FA/227/1966 | Bidya Singh VS. Shrimati Jaya Devi         | 11
      2 | FA/652/1968 | JAGARNATH PANDEY and ORS VS. SHEO NATH...  | 1
   ============================================================ */

'use strict';

// ── State ──────────────────────────────────────────────────────
let selectedFile    = null;    // File object
let parsedCases     = [];      // { caseNo, caseYear, appellant, respondent, status:'new'|'skip'|'error', rawLine, edited }
let existingKeys    = new Set(); // "caseNo|caseYear" pairs already in Supabase

// ── DOM Refs ───────────────────────────────────────────────────
const dropZone         = document.getElementById('dropZone');
const fileInput        = document.getElementById('pdfFileInput');
const fileInfo         = document.getElementById('fileInfo');
const fileNameEl       = document.getElementById('fileName');
const fileSizeEl       = document.getElementById('fileSize');
const removeFileBtn    = document.getElementById('removeFileBtn');
const parseBtn         = document.getElementById('parseBtn');
const parseHint        = document.getElementById('parseHint');
const parseProgress    = document.getElementById('parseProgress');
const parseProgressFill= document.getElementById('parseProgressFill');
const parseProgressLabel=document.getElementById('parseProgressLabel');
const parseProgressPct = document.getElementById('parseProgressPct');

const stepPreview      = document.getElementById('stepPreview');
const stepImport       = document.getElementById('stepImport');
const previewBody      = document.getElementById('previewBody');
const filterStatus     = document.getElementById('filterStatus');
const filterPreviewYear= document.getElementById('filterPreviewYear');
const previewSearch    = document.getElementById('previewSearch');
const exportErrorsBtn  = document.getElementById('exportErrorsBtn');

const statNew          = document.getElementById('statNew');
const statSkip         = document.getElementById('statSkip');
const statError        = document.getElementById('statError');
const statYears        = document.getElementById('statYears');

const importBtn        = document.getElementById('importBtn');
const importCount      = document.getElementById('importCount');
const importHint       = document.getElementById('importHint');
const importProgress   = document.getElementById('importProgress');
const importProgressFill=document.getElementById('importProgressFill');
const importProgressLabel=document.getElementById('importProgressLabel');
const importProgressPct= document.getElementById('importProgressPct');
const importResult     = document.getElementById('importResult');
const importAnotherBtn = document.getElementById('importAnotherBtn');

// ── File Handling ──────────────────────────────────────────────
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') setFile(file);
  else showToast('Please drop a valid PDF file.', 'error');
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

removeFileBtn.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  fileInfo.style.display = 'none';
  dropZone.querySelector('.drop-icon').parentElement.style.pointerEvents = '';
  parseBtn.disabled = true;
  parseHint.textContent = 'Upload a PDF first.';
  stepPreview.style.display = 'none';
  stepImport.style.display = 'none';
  parsedCases = [];
});

function setFile(file) {
  selectedFile = file;
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatBytes(file.size);
  fileInfo.style.display = 'flex';
  parseBtn.disabled = false;
  parseHint.textContent = `Ready — ${file.name}`;
}

// ── Parse PDF ─────────────────────────────────────────────────
parseBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  parseBtn.disabled = true;
  parseProgress.style.display = 'block';
  stepPreview.style.display = 'none';
  stepImport.style.display = 'none';
  parsedCases = [];

  try {
    // 1. Load PDF
    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    // 2. Extract text from all pages
    let allLines = [];
    for (let p = 1; p <= totalPages; p++) {
      const pct = Math.round((p / totalPages) * 60);
      setParseProgress(pct, `Reading page ${p} of ${totalPages}…`);

      const page = await pdf.getPage(p);
      const content = await page.getTextContent();

      // Group text items into lines by their Y coordinate (rounded to 2dp)
      const lineMap = {};
      content.items.forEach(item => {
        const y = Math.round(item.transform[5] * 10) / 10;
        if (!lineMap[y]) lineMap[y] = [];
        lineMap[y].push(item.str);
      });

      // Sort by descending Y (top to bottom on page)
      const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
      sortedYs.forEach(y => {
        const lineText = lineMap[y].join(' ').trim();
        if (lineText) allLines.push(lineText);
      });
    }

    setParseProgress(65, 'Parsing case entries…');

    // 3. Parse all extracted lines
    const rawParsed = parseAllLines(allLines);
    setParseProgress(75, `Found ${rawParsed.length} cases. Checking duplicates in DB…`);

    // 4. Fetch existing keys from Supabase to detect duplicates
    await loadExistingKeys();
    setParseProgress(90, 'Marking duplicates…');

    // 5. Mark status
    parsedCases = rawParsed.map(c => {
      const key = `${c.caseNo}|${c.caseYear}`;
      return {
        ...c,
        status: existingKeys.has(key) ? 'skip' : 'new',
        edited: false
      };
    });

    setParseProgress(100, 'Done!');
    setTimeout(() => { parseProgress.style.display = 'none'; }, 800);

    renderPreview();
    stepPreview.style.display = 'block';
    stepImport.style.display = 'block';
    updateImportCount();
    parseBtn.disabled = false;
    showToast(`Parsed ${parsedCases.length} cases successfully.`, 'success');

  } catch (err) {
    console.error('Parse error:', err);
    showToast('Error parsing PDF: ' + err.message, 'error');
    parseProgress.style.display = 'none';
    parseBtn.disabled = false;
  }
});

// ── Core Parser ────────────────────────────────────────────────
/**
 * Parses lines of text extracted from the PDF.
 * 
 * PDF table rows look like one of these after text extraction:
 *   "1 FA/227/1966 Bidya Singh VS. Shrimati Jaya Devi 11"
 *   "FA/227/1966 Bidya Singh VS. Shrimati Jaya Devi"
 *   "Bidya Singh VS. Shrimati Jaya Devi FA/227/1966"   (rare column reorder)
 *
 * Separator variants: VS.  VS  Vs.  Vs  V.S.  versus  VERSUS
 */
function parseAllLines(lines) {
  const results = [];
  const seen = new Set(); // dedup by caseNo|caseYear

  // Regex to find FA/num/year inside any line
  const caseKeyRe = /FA\/(\d{1,5})\/(\d{4})/i;

  // Regex to split party names on VS separator variants
  // Handles: VS.  VS  Vs.  Vs  V.S.  VERSUS  Versus
  const vsSplitRe = /\s+(?:V\.S\.|VERSUS|Versus|versus|VS\.|Vs\.|VS|Vs)\s+/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Must contain a case key
    const caseMatch = line.match(caseKeyRe);
    if (!caseMatch) continue;

    const caseNo   = caseMatch[1];
    const caseYear = caseMatch[2];
    const key = `${caseNo}|${caseYear}`;
    if (seen.has(key)) continue;

    // Extract the Party Details portion: strip serial numbers and case key
    // Remove leading number (serial), the case key itself, and trailing number (Total Petitioner's)
    let partyPart = line
      .replace(/^\d+\s+/, '')            // strip leading serial number
      .replace(caseKeyRe, '')            // strip FA/no/year
      .replace(/\s+\d+\s*$/, '')        // strip trailing petitioner count
      .trim();

    // Attempt to split on VS separator
    const vsParts = partyPart.split(vsSplitRe);

    if (vsParts.length >= 2) {
      const appellant  = cleanName(vsParts[0]);
      // Join remaining parts in case VS appears in a name (rare)
      const respondent = cleanName(vsParts.slice(1).join(' VS '));

      if (appellant && respondent) {
        seen.add(key);
        results.push({ caseNo, caseYear, appellant, respondent, rawLine: line, status: 'new' });
        continue;
      }
    }

    // Could not split — record as parse error
    if (caseNo && caseYear) {
      seen.add(key);
      results.push({ caseNo, caseYear, appellant: '', respondent: '', rawLine: line, status: 'error' });
    }
  }

  // Sort by year asc, then case number asc
  results.sort((a, b) => {
    const yr = parseInt(a.caseYear) - parseInt(b.caseYear);
    if (yr !== 0) return yr;
    return parseInt(a.caseNo) - parseInt(b.caseNo);
  });

  return results;
}

function cleanName(str) {
  return str
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Load Existing Keys from Supabase ───────────────────────────
async function loadExistingKeys() {
  existingKeys.clear();
  if (!window.PortalDB) return;
  try {
    // Fetch only case_no and case_year columns — lightweight
    const records = await window.PortalDB.getCaseRecords('case_no,case_year');
    records.forEach(r => {
      if (r.case_no && r.case_year) {
        existingKeys.add(`${r.case_no}|${r.case_year}`);
      }
    });
    console.log(`Loaded ${existingKeys.size} existing keys from Supabase.`);
  } catch (err) {
    console.warn('Could not load existing keys:', err);
    showToast('Warning: Could not check existing DB. All cases will show as new.', 'info');
  }
}

// ── Render Preview Table ───────────────────────────────────────
function renderPreview() {
  // Compute stats
  const newCount   = parsedCases.filter(c => c.status === 'new').length;
  const skipCount  = parsedCases.filter(c => c.status === 'skip').length;
  const errorCount = parsedCases.filter(c => c.status === 'error').length;
  statNew.textContent   = newCount;
  statSkip.textContent  = skipCount;
  statError.textContent = errorCount;

  const years = [...new Set(parsedCases.map(c => c.caseYear))].sort();
  statYears.textContent = years.join(', ');

  // Populate year filter
  filterPreviewYear.innerHTML = '<option value="">All Years</option>';
  years.forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = yr;
    filterPreviewYear.appendChild(opt);
  });

  exportErrorsBtn.style.display = errorCount > 0 ? '' : 'none';
  renderPreviewRows();
}

function renderPreviewRows() {
  const statusFilter = filterStatus.value;
  const yearFilter   = filterPreviewYear.value;
  const query        = previewSearch.value.toLowerCase().trim();

  const visible = parsedCases.filter((c, idx) => {
    c._idx = idx; // store original index
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchYear   = !yearFilter || c.caseYear === yearFilter;
    const matchQuery  = !query ||
      `FA/${c.caseNo}/${c.caseYear} ${c.appellant} ${c.respondent}`.toLowerCase().includes(query);
    return matchStatus && matchYear && matchQuery;
  });

  if (visible.length === 0) {
    previewBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No cases match the current filters.</td></tr>`;
    return;
  }

  previewBody.innerHTML = visible.map((c, i) => {
    const rowClass = c.status === 'new' ? 'row-new' : c.status === 'skip' ? 'row-skip' : 'row-error';
    const badge    = c.status === 'new'
      ? `<span class="badge badge-new"><i class="fa-solid fa-plus"></i> New</span>`
      : c.status === 'skip'
      ? `<span class="badge badge-skip"><i class="fa-solid fa-ban"></i> In DB</span>`
      : `<span class="badge badge-error"><i class="fa-solid fa-triangle-exclamation"></i> Error</span>`;

    const orig = c._idx;

    if (c._editing) {
      return `
        <tr class="${rowClass}" data-idx="${orig}">
          <td style="color:var(--text-muted);font-size:0.8rem;">${i + 1}</td>
          <td style="font-weight:700;color:var(--primary-blue);">FA/${esc(c.caseNo)}/${esc(c.caseYear)}</td>
          <td>${esc(c.caseYear)}</td>
          <td><input class="edit-input" id="edit-app-${orig}" value="${esc(c.appellant)}" placeholder="Appellant name"></td>
          <td><input class="edit-input" id="edit-res-${orig}" value="${esc(c.respondent)}" placeholder="Respondent name"></td>
          <td>${badge}</td>
          <td>
            <button class="btn btn-success" style="padding:4px 10px;font-size:0.78rem;" onclick="saveEdit(${orig})">
              <i class="fa-solid fa-check"></i>
            </button>
          </td>
        </tr>`;
    }

    return `
      <tr class="${rowClass}" data-idx="${orig}">
        <td style="color:var(--text-muted);font-size:0.8rem;">${i + 1}</td>
        <td style="font-weight:700;color:var(--primary-blue);">FA/${esc(c.caseNo)}/${esc(c.caseYear)}</td>
        <td>${esc(c.caseYear)}</td>
        <td>${esc(c.appellant) || '<em style="color:var(--accent-red)">Not parsed</em>'}</td>
        <td>${esc(c.respondent) || '<em style="color:var(--accent-red)">Not parsed</em>'}</td>
        <td>${badge}</td>
        <td>
          <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.78rem;" onclick="startEdit(${orig})" title="Edit">
            <i class="fa-solid fa-pencil"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

// ── Edit Row ───────────────────────────────────────────────────
window.startEdit = function(idx) {
  parsedCases[idx]._editing = true;
  renderPreviewRows();
  // Focus the appellant field
  setTimeout(() => document.getElementById(`edit-app-${idx}`)?.focus(), 50);
};

window.saveEdit = function(idx) {
  const appInput = document.getElementById(`edit-app-${idx}`);
  const resInput = document.getElementById(`edit-res-${idx}`);
  if (appInput) parsedCases[idx].appellant = appInput.value.trim();
  if (resInput) parsedCases[idx].respondent = resInput.value.trim();

  // If previously error and now has both names → mark as new
  if (parsedCases[idx].status === 'error' && parsedCases[idx].appellant && parsedCases[idx].respondent) {
    const key = `${parsedCases[idx].caseNo}|${parsedCases[idx].caseYear}`;
    parsedCases[idx].status = existingKeys.has(key) ? 'skip' : 'new';
  }

  parsedCases[idx]._editing = false;
  parsedCases[idx].edited   = true;
  renderPreviewRows();
  updateImportCount();
};

// ── Filter / Search Listeners ──────────────────────────────────
filterStatus.addEventListener('change', renderPreviewRows);
filterPreviewYear.addEventListener('change', renderPreviewRows);
previewSearch.addEventListener('input', renderPreviewRows);

// ── Export Errors CSV ──────────────────────────────────────────
exportErrorsBtn.addEventListener('click', () => {
  const errors = parsedCases.filter(c => c.status === 'error');
  if (!errors.length) return;
  const csv = ['Case No,Case Year,Raw Line',
    ...errors.map(c => `"FA/${c.caseNo}/${c.caseYear}","${c.caseYear}","${c.rawLine.replace(/"/g,'""')}"`)
  ].join('\n');
  downloadBlob(csv, `parse_errors_${Date.now()}.csv`, 'text/csv');
});

// ── Import to Supabase ─────────────────────────────────────────
function updateImportCount() {
  const n = parsedCases.filter(c => c.status === 'new').length;
  importCount.textContent = n;
  importBtn.disabled = n === 0;
  importHint.textContent = n > 0
    ? `${parsedCases.filter(c => c.status === 'skip').length} already-existing cases will be skipped.`
    : 'No new cases to import.';
}

importBtn.addEventListener('click', async () => {
  const toImport = parsedCases.filter(c => c.status === 'new' && c.appellant && c.respondent);

  if (!toImport.length) {
    showToast('No new cases to import.', 'info');
    return;
  }

  if (!window.PortalDB) {
    showToast('Database not available. Check your connection.', 'error');
    return;
  }

  const confirmed = confirm(
    `Import ${toImport.length} new First Appeal cases into the master Supabase database?\n\n` +
    `This will NOT overwrite any existing records.`
  );
  if (!confirmed) return;

  importBtn.disabled = true;
  importProgress.style.display = 'block';
  importResult.style.display   = 'none';

  const CHUNK_SIZE = 150;
  let inserted = 0;
  let failed   = 0;
  const chunks = [];
  for (let i = 0; i < toImport.length; i += CHUNK_SIZE) {
    chunks.push(toImport.slice(i, i + CHUNK_SIZE));
  }

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const pct   = Math.round(((ci) / chunks.length) * 100);
    setImportProgress(pct, `Inserting chunk ${ci + 1} of ${chunks.length} (${inserted} done)…`);

    const records = chunk.map(c => ({
      case_type:  'First Appeal',
      case_no:    c.caseNo,
      case_year:  c.caseYear,
      appellant:  c.appellant,
      respondent: c.respondent,
      // All other fields left empty — will be filled via LCR/case_records later
      lc_court: '', lc_case_type: '', lc_case_no: '', lc_case_year: '',
      date_of_judgment: '', date_of_decree_award: '', date_of_filing_fa: '',
      suit_value: '', appeal_value: '', record_room_bundle_no: '', dealing_assistant: ''
    }));

    try {
      await window.PortalDB.bulkInsertCaseRecords(records, CHUNK_SIZE);
      inserted += chunk.length;
    } catch (err) {
      console.error(`Chunk ${ci + 1} failed:`, err);
      failed += chunk.length;
    }
  }

  setImportProgress(100, 'Import complete!');
  setTimeout(() => {
    importProgress.style.display = 'none';

    // Show result panel
    importResult.style.display = 'block';
    if (failed === 0) {
      document.getElementById('resultIcon').textContent  = '✅';
      document.getElementById('resultTitle').textContent = `${inserted} Cases Imported Successfully!`;
      document.getElementById('resultBody').textContent  =
        `All ${inserted} new First Appeal cases have been added to the master Supabase database. ` +
        `Existing records were not affected.`;
    } else {
      document.getElementById('resultIcon').textContent  = '⚠️';
      document.getElementById('resultTitle').textContent = `Partial Import`;
      document.getElementById('resultBody').textContent  =
        `${inserted} cases imported successfully. ${failed} cases failed — ` +
        `please try again or contact support.`;
    }

    // Mark imported cases as "skip" so they show correctly
    const importedKeys = new Set(toImport.map(c => `${c.caseNo}|${c.caseYear}`));
    parsedCases.forEach(c => {
      if (importedKeys.has(`${c.caseNo}|${c.caseYear}`)) {
        c.status = 'skip';
        existingKeys.add(`${c.caseNo}|${c.caseYear}`);
      }
    });
    renderPreview();
    updateImportCount();
    importBtn.disabled = false;

    showToast(`Imported ${inserted} cases to Supabase!`, 'success');
  }, 600);
});

// ── Import Another ─────────────────────────────────────────────
importAnotherBtn.addEventListener('click', () => {
  // Reset everything
  selectedFile = null;
  parsedCases  = [];
  fileInput.value = '';
  fileInfo.style.display = 'none';
  parseBtn.disabled = true;
  parseHint.textContent = 'Upload a PDF first.';
  stepPreview.style.display = 'none';
  stepImport.style.display  = 'none';
  importResult.style.display = 'none';
  importProgress.style.display = 'none';
  parseProgress.style.display  = 'none';
  previewBody.innerHTML = '';
});

// ── Progress Helpers ───────────────────────────────────────────
function setParseProgress(pct, label) {
  parseProgressFill.style.width  = pct + '%';
  parseProgressPct.textContent   = pct + '%';
  parseProgressLabel.textContent = label;
}

function setImportProgress(pct, label) {
  importProgressFill.style.width  = pct + '%';
  importProgressPct.textContent   = pct + '%';
  importProgressLabel.textContent = label;
}

// ── Utilities ──────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
