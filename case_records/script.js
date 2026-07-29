/* ============================================================
   PATNA HIGH COURT - CASE RECORDS SYSTEM LOGIC
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  let caseRecords = [];

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterCaseType = document.getElementById('filterCaseType');
  const filterYear = document.getElementById('filterYear');
  
  const recordCountBadge = document.getElementById('recordCountBadge');
  const tableBody = document.getElementById('caseRecordsTableBody');
  const noRecordsState = document.getElementById('noRecordsState');

  // KPI Elements
  const kpiTotalRecords = document.getElementById('kpiTotalRecords');
  const kpiFirstAppeals = document.getElementById('kpiFirstAppeals');
  const kpiJudgments = document.getElementById('kpiJudgments');
  const kpiBundles = document.getElementById('kpiBundles');

  // Modal Elements
  const recordModal = document.getElementById('recordModal');
  const modalTitle = document.getElementById('modalTitle');
  const recordForm = document.getElementById('recordForm');
  const addRecordBtn = document.getElementById('addRecordBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');

  // Details Modal Elements
  const detailsModal = document.getElementById('detailsModal');
  const detailsModalContent = document.getElementById('detailsModalContent');
  const closeDetailsBtn = document.getElementById('closeDetailsBtn');
  const dismissDetailsBtn = document.getElementById('dismissDetailsBtn');
  const printDetailsBtn = document.getElementById('printDetailsBtn');
  const printSummaryBtn = document.getElementById('printSummaryBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  // 1. Fetch & Initialize Records
  async function loadCaseRecords() {
    try {
      if (window.PortalDB) {
        caseRecords = await window.PortalDB.getCaseRecords();
      }
    } catch (err) {
      console.warn('Supabase unavailable, reading local cache:', err);
      const cached = localStorage.getItem('phc_case_records');
      if (cached) caseRecords = JSON.parse(cached);
    }

    if (!caseRecords) {
      caseRecords = [];
    }

    populateYearFilter();
    renderRecords();
  }

  function populateYearFilter() {
    const years = new Set(caseRecords.map(r => r.case_year).filter(Boolean));
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    filterYear.innerHTML = '<option value="">All Years</option>';
    sortedYears.forEach(yr => {
      const opt = document.createElement('option');
      opt.value = yr;
      opt.textContent = yr;
      filterYear.appendChild(opt);
    });
  }

  // 2. Render Table & Update KPIs
  function renderRecords() {
    const query = searchInput.value.toLowerCase().trim();
    const typeVal = filterCaseType.value;
    const yearVal = filterYear.value;

    const filtered = caseRecords.filter(r => {
      const matchType = !typeVal || r.case_type === typeVal;
      const matchYear = !yearVal || String(r.case_year) === String(yearVal);
      
      const searchStr = `${r.case_type} ${r.case_no} ${r.case_year} ${r.appellant} ${r.respondent} ${r.lc_court} ${r.lc_case_type} ${r.record_room_bundle_no}`.toLowerCase();
      const matchQuery = !query || searchStr.includes(query);

      return matchType && matchYear && matchQuery;
    });

    // Update KPIs
    kpiTotalRecords.textContent = caseRecords.length;
    kpiFirstAppeals.textContent = caseRecords.filter(r => r.case_type === 'First Appeal').length;
    kpiJudgments.textContent = caseRecords.filter(r => r.date_of_judgment).length;
    kpiBundles.textContent = new Set(caseRecords.map(r => r.record_room_bundle_no).filter(Boolean)).size;

    recordCountBadge.textContent = `${filtered.length} Record${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      tableBody.innerHTML = '';
      noRecordsState.style.display = 'block';
      return;
    }

    noRecordsState.style.display = 'none';

    tableBody.innerHTML = filtered.map(r => `
      <tr>
        <td>
          <span class="hc-case-badge">${escapeHtml(r.case_type)} No. ${escapeHtml(r.case_no)} / ${escapeHtml(r.case_year)}</span>
        </td>
        <td>
          <strong>${escapeHtml(r.appellant || '-')}</strong>
          <span class="party-vs">VS</span>
          <strong>${escapeHtml(r.respondent || '-')}</strong>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(r.lc_court || '-')}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            ${escapeHtml(r.lc_case_type || '')} ${r.lc_case_no ? `No. ${escapeHtml(r.lc_case_no)}` : ''} ${r.lc_case_year ? `of ${escapeHtml(r.lc_case_year)}` : ''}
          </div>
        </td>
        <td>
          <div style="font-size: 0.82rem;"><strong>Judgment:</strong> ${formatDateStr(r.date_of_judgment)}</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);"><strong>Decree/Award:</strong> ${formatDateStr(r.date_of_decree_award)}</div>
        </td>
        <td>${formatDateStr(r.date_of_filing_fa)}</td>
        <td>
          <div style="font-size: 0.82rem;"><strong>Suit:</strong> ${escapeHtml(r.suit_value || '-')}</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);"><strong>Appeal:</strong> ${escapeHtml(r.appeal_value || '-')}</div>
        </td>
        <td>
          <span class="bundle-badge"><i class="fa-solid fa-box"></i> ${escapeHtml(r.record_room_bundle_no || '-')}</span>
        </td>
        <td class="no-print">
          <div style="display: flex; gap: 4px;">
            <button type="button" class="btn-action-icon edit" onclick="viewRecordDetails(${r.id})" title="View Details Sheet"><i class="fa-solid fa-eye"></i></button>
            <button type="button" class="btn-action-icon edit" onclick="editRecord(${r.id})" title="Edit Case Record"><i class="fa-solid fa-pen-to-square"></i></button>
            <button type="button" class="btn-action-icon delete" onclick="deleteRecord(${r.id})" title="Delete Case Record"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // 3. Save / Update Record
  recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const recordData = {
      id: document.getElementById('recordId').value ? parseInt(document.getElementById('recordId').value) : null,
      case_type: document.getElementById('case_type').value,
      case_no: document.getElementById('case_no').value,
      case_year: document.getElementById('case_year').value,
      date_of_filing_fa: document.getElementById('date_of_filing_fa').value,
      appellant: document.getElementById('appellant').value,
      respondent: document.getElementById('respondent').value,
      lc_court: document.getElementById('lc_court').value,
      lc_case_type: document.getElementById('lc_case_type').value,
      lc_case_no: document.getElementById('lc_case_no').value,
      lc_case_year: document.getElementById('lc_case_year').value,
      date_of_judgment: document.getElementById('date_of_judgment').value,
      date_of_decree_award: document.getElementById('date_of_decree_award').value,
      suit_value: document.getElementById('suit_value').value,
      appeal_value: document.getElementById('appeal_value').value,
      record_room_bundle_no: document.getElementById('record_room_bundle_no').value
    };

    await saveCaseRecordToStorage(recordData);
    closeRecordModal();
    loadCaseRecords();
  });

  async function saveCaseRecordToStorage(record) {
    const isUpdate = !!record.id;

    try {
      if (window.PortalDB) {
        if (isUpdate) {
          await window.PortalDB.updateCaseRecord(record.id, record);
        } else {
          await window.PortalDB.insertCaseRecord(record);
        }
        console.log('Successfully saved record to Supabase');
      } else {
        throw new Error('PortalDB not available');
      }
    } catch (err) {
      console.warn('Supabase save error, using localStorage fallback:', err);
    }

    // Local fallback
    if (isUpdate) {
      const idx = caseRecords.findIndex(r => r.id === record.id);
      if (idx !== -1) caseRecords[idx] = record;
    } else {
      record.id = Date.now();
      caseRecords.unshift(record);
    }
    localStorage.setItem('phc_case_records', JSON.stringify(caseRecords));
  }

  // 4. Edit / Delete Handlers
  window.editRecord = function(id) {
    const record = caseRecords.find(r => r.id === id);
    if (!record) return;

    document.getElementById('recordId').value = record.id;
    document.getElementById('case_type').value = record.case_type || 'First Appeal';
    document.getElementById('case_no').value = record.case_no || '';
    document.getElementById('case_year').value = record.case_year || '';
    document.getElementById('date_of_filing_fa').value = record.date_of_filing_fa || '';
    document.getElementById('appellant').value = record.appellant || '';
    document.getElementById('respondent').value = record.respondent || '';
    document.getElementById('lc_court').value = record.lc_court || '';
    document.getElementById('lc_case_type').value = record.lc_case_type || '';
    document.getElementById('lc_case_no').value = record.lc_case_no || '';
    document.getElementById('lc_case_year').value = record.lc_case_year || '';
    document.getElementById('date_of_judgment').value = record.date_of_judgment || '';
    document.getElementById('date_of_decree_award').value = record.date_of_decree_award || '';
    document.getElementById('suit_value').value = record.suit_value || '';
    document.getElementById('appeal_value').value = record.appeal_value || '';
    document.getElementById('record_room_bundle_no').value = record.record_room_bundle_no || '';

    modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Case Record';
    recordModal.style.display = 'flex';
  };

  window.deleteRecord = async function(id) {
    if (!confirm('Are you sure you want to delete this case record?')) return;

      try {
        if (window.PortalDB) {
          await window.PortalDB.deleteCaseRecord(id);
        }
        caseRecords = caseRecords.filter(r => r.id !== id);
        renderRecords();
        if (typeof showToast === 'function') showToast('Record deleted successfully.', 'success');
      } catch (err) {
        console.error('Delete error:', err);
        if (typeof showToast === 'function') showToast('Error deleting record.', 'error');
      }
      localStorage.setItem('phc_case_records', JSON.stringify(caseRecords));
      renderRecords();
  };

  window.viewRecordDetails = function(id) {
    const r = caseRecords.find(item => item.id === id);
    if (!r) return;

    detailsModalContent.innerHTML = `
      <div style="font-family: 'Times New Roman', serif; padding: 10px; color: var(--text-main);">
        <div style="text-align: center; border-bottom: 2px solid var(--primary-blue); padding-bottom: 8px; margin-bottom: 15px;">
          <h2 style="font-size: 1.3rem; text-transform: uppercase;">PATNA HIGH COURT — CASE RECORD SHEET</h2>
          <div style="font-size: 0.9rem; color: var(--text-muted);">First Appeal Section & Record Room Master Register</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem; line-height: 1.8;">
          <tr>
            <td style="font-weight: bold; width: 40%;">High Court Appeal:</td>
            <td>${escapeHtml(r.case_type)} No. ${escapeHtml(r.case_no)} of ${escapeHtml(r.case_year)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Appellant Name:</td>
            <td>${escapeHtml(r.appellant)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Respondent Name:</td>
            <td>${escapeHtml(r.respondent)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Lower Court Name:</td>
            <td>${escapeHtml(r.lc_court)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Lower Court Case Details:</td>
            <td>${escapeHtml(r.lc_case_type || '-')} ${r.lc_case_no ? `No. ${r.lc_case_no}` : ''} ${r.lc_case_year ? `of ${r.lc_case_year}` : ''}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Date of Judgment:</td>
            <td>${formatDateStr(r.date_of_judgment)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Date of Decree / Award:</td>
            <td>${formatDateStr(r.date_of_decree_award)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Date of Filing First Appeal:</td>
            <td>${formatDateStr(r.date_of_filing_fa)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Suit Valuation:</td>
            <td>${escapeHtml(r.suit_value || '-')}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Appeal Valuation:</td>
            <td>${escapeHtml(r.appeal_value || '-')}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Record Room Bundle No.:</td>
            <td><strong style="color: var(--accent-orange);">${escapeHtml(r.record_room_bundle_no)}</strong></td>
          </tr>
        </table>
      </div>
    `;

    detailsModal.style.display = 'flex';
  };

  // 5. Modal Control Listeners
  addRecordBtn.addEventListener('click', () => {
    recordForm.reset();
    document.getElementById('recordId').value = '';
    modalTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add New Case Record';
    recordModal.style.display = 'flex';
  });

  // Auto-populate from CASES_DB and auto-generate bundle no.
  const caseNoInp = document.getElementById('case_no');
  const caseYrInp = document.getElementById('case_year');
  const caseTypeInp = document.getElementById('case_type');
  const appellantInp = document.getElementById('appellant');
  const respondentInp = document.getElementById('respondent');
  const bundleInp = document.getElementById('record_room_bundle_no');

  function tryAutoFillFromCasesDB() {
    const cNo = caseNoInp ? caseNoInp.value.trim() : '';
    const cYr = caseYrInp ? caseYrInp.value.trim() : '';
    
    if (cNo && cYr) {
      if (bundleInp && !bundleInp.value) {
        bundleInp.value = `RR-FA-${cYr}/${cNo}`;
      }
      if (typeof CASES_DB !== 'undefined') {
        const key = `FA/${cNo}/${cYr}`;
        const match = CASES_DB[key];
        if (match) {
          if (appellantInp && !appellantInp.value) appellantInp.value = match.appellant || '';
          if (respondentInp && !respondentInp.value) respondentInp.value = match.respondent || '';
        }
      }
    }
  }

  if (caseNoInp && caseYrInp) {
    caseNoInp.addEventListener('change', tryAutoFillFromCasesDB);
    caseYrInp.addEventListener('change', tryAutoFillFromCasesDB);
  }

  function closeRecordModal() { recordModal.style.display = 'none'; }
  closeModalBtn.addEventListener('click', closeRecordModal);
  cancelModalBtn.addEventListener('click', closeRecordModal);

  closeDetailsBtn.addEventListener('click', () => detailsModal.style.display = 'none');
  dismissDetailsBtn.addEventListener('click', () => detailsModal.style.display = 'none');

  printDetailsBtn.addEventListener('click', () => window.print());
  printSummaryBtn.addEventListener('click', () => window.print());

  // 6. Search & Filters
  searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    renderRecords();
  });
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderRecords();
  });
  filterCaseType.addEventListener('change', renderRecords);
  filterYear.addEventListener('change', renderRecords);

  // 7. CSV Export
  exportCsvBtn.addEventListener('click', () => {
    if (caseRecords.length === 0) return alert('No records available to export.');

    const headers = ['Case Type', 'Case No', 'Case Year', 'Appellant', 'Respondent', 'Lower Court', 'LC Case Type', 'LC Case No', 'LC Case Year', 'Date of Judgment', 'Date of Decree', 'Date of Filing FA', 'Suit Value', 'Appeal Value', 'Bundle No'];
    
    const rows = caseRecords.map(r => [
      `"${r.case_type || ''}"`,
      `"${r.case_no || ''}"`,
      `"${r.case_year || ''}"`,
      `"${r.appellant || ''}"`,
      `"${r.respondent || ''}"`,
      `"${r.lc_court || ''}"`,
      `"${r.lc_case_type || ''}"`,
      `"${r.lc_case_no || ''}"`,
      `"${r.lc_case_year || ''}"`,
      `"${r.date_of_judgment || ''}"`,
      `"${r.date_of_decree_award || ''}"`,
      `"${r.date_of_filing_fa || ''}"`,
      `"${r.suit_value || ''}"`,
      `"${r.appeal_value || ''}"`,
      `"${r.record_room_bundle_no || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Patna_High_Court_Case_Records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Helpers
  function formatDateStr(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Load records
  loadCaseRecords();
});
