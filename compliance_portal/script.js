/* ============================================================
   PATNA HIGH COURT - COURT COMPLIANCE PORTAL LOGIC
   ============================================================ */

// Merge custom assistants into ASSISTANTS_DB
try {
  const stored = localStorage.getItem("patna_custom_assistants_v1");
  if (stored) {
    const customAssistants = JSON.parse(stored);
    if (typeof ASSISTANTS_DB !== "undefined") {
      for (const [caseNo, name] of Object.entries(customAssistants)) {
        if (name === null || name === "") {
          delete ASSISTANTS_DB[caseNo];
        } else {
          ASSISTANTS_DB[caseNo] = name;
        }
      }
    }
  }
} catch (e) {
  console.error("Error loading custom assistants", e);
}

document.addEventListener('DOMContentLoaded', () => {
  let compliances = [];
  let currentTab = 'all';

  // Standard Assistants List
  const BASE_ASSISTANTS = [
    'Amit Kumar', 'Anjali Kumari', 'Archana Kumari', 'Dhananjay Kumar Singh',
    'Kamlesh Kumar', 'Manoranjan Priya', 'Neha Dhari Singh', 'Ravi Singh',
    'Ronit Raj', 'Shraysi Swaraj', 'Shreya Suman', 'Shristi',
    'Shubham Kumar', 'Shweta Annapurna', 'Tripti Raj', 'Vivek Kumar'
  ];

  function getAssistantsList() {
    const names = new Set(BASE_ASSISTANTS);
    if (typeof ASSISTANTS_DB !== 'undefined') {
      Object.values(ASSISTANTS_DB).forEach(n => {
        if (n && typeof n === 'string' && !n.includes('/')) names.add(n.trim());
      });
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  // Populate Assistant Dropdowns
  const assistantFilter = document.getElementById('assistantFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  const priorityFilter = document.getElementById('priorityFilter');
  const natureFilter = document.getElementById('natureFilter');
  const compAssistant = document.getElementById('compAssistant');
  const assistants = getAssistantsList();

  assistants.forEach(a => {
    const optFilter = document.createElement('option');
    optFilter.value = a;
    optFilter.textContent = a;
    assistantFilter.appendChild(optFilter);

    const optComp = document.createElement('option');
    optComp.value = a;
    optComp.textContent = a;
    compAssistant.appendChild(optComp);
  });

  // Helper: Normalize case key for lookups
  function normalizeCaseKey(caseNo, caseYear) {
    if (!caseNo) return '';
    let c = String(caseNo).replace(/^(FA|MA|SA|CA)\/?/i, '').trim();
    if (c.includes('/')) {
      const parts = c.split('/');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : c;
    }
    return caseYear ? `${c}/${caseYear}` : c;
  }

  function getAssistantForCase(caseNo, caseYear) {
    if (typeof ASSISTANTS_DB === 'undefined') return '';
    const key = normalizeCaseKey(caseNo, caseYear);
    return ASSISTANTS_DB[key] || '';
  }

  function getCaseFromDB(caseNo, caseYear) {
    if (typeof CASES_DB === 'undefined') return null;
    const cleanNo = String(caseNo).replace(/^(FA|MA|SA|CA)\/?/i, '').trim();
    const tryKeys = [
      `FA/${cleanNo}/${caseYear}`,
      `${cleanNo}/${caseYear}`,
      `FA/${cleanNo}`
    ];
    for (const k of tryKeys) {
      if (CASES_DB[k]) return CASES_DB[k];
    }
    return null;
  }

  // Date Calculation Helpers
  function parseDateToMidnight(dStr) {
    if (!dStr) return null;
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function getTodayMidnight() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function calculateStatusInfo(record) {
    if (record.status === 'complied') {
      return {
        status: 'complied',
        isLapsed: false,
        daysLapsed: 0,
        daysRemaining: 0,
        badgeHtml: `<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Complied (${formatDisplayDate(record.compliance_date)})</span>`
      };
    }

    const today = getTodayMidnight();
    const deadline = parseDateToMidnight(record.deadline);

    if (!deadline) {
      return {
        status: 'pending',
        isLapsed: false,
        daysLapsed: 0,
        daysRemaining: 0,
        badgeHtml: `<span class="badge badge-warning"><i class="fa-solid fa-hourglass-start"></i> Pending</span>`
      };
    }

    const diffDays = Math.round((today - deadline) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      // Overdue / Lapsed
      return {
        status: 'lapsed',
        isLapsed: true,
        daysLapsed: diffDays,
        daysRemaining: 0,
        badgeHtml: `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> Lapsed ${diffDays} ${diffDays === 1 ? 'day' : 'days'}</span>`
      };
    } else if (diffDays === 0) {
      // Due today
      return {
        status: 'duetoday',
        isLapsed: false,
        daysLapsed: 0,
        daysRemaining: 0,
        badgeHtml: `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Due Today</span>`
      };
    } else {
      // Future deadline
      const daysLeft = Math.abs(diffDays);
      const isDueSoon = daysLeft <= 7;
      return {
        status: isDueSoon ? 'duesoon' : 'pending',
        isLapsed: false,
        daysLapsed: 0,
        daysRemaining: daysLeft,
        badgeHtml: `<span class="badge ${isDueSoon ? 'badge-warning' : 'badge-info'}"><i class="fa-solid fa-hourglass"></i> Due in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</span>`
      };
    }
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '—';
    const d = parseDateToMidnight(dateStr);
    if (!d) return dateStr;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Load Records ──────────────────────────────────────────
  async function loadCompliances() {
    try {
      if (window.PortalDB) {
        compliances = await window.PortalDB.getCompliances();
      } else {
        compliances = JSON.parse(localStorage.getItem('phc_compliance_records') || '[]');
      }
    } catch (err) {
      console.warn('Error loading compliances:', err);
      compliances = JSON.parse(localStorage.getItem('phc_compliance_records') || '[]');
    }

    const syncEl = document.getElementById('lastSyncedTime');
    if (syncEl) syncEl.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    render();

    // Check URL params for deep-linking (e.g. from homepage or analytics)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const filterStatus = urlParams.get('status');
      const filterSearch = urlParams.get('search');
      const filterDa = urlParams.get('da');
      const filterCategory = urlParams.get('category');
      const filterPriority = urlParams.get('priority');
      const filterNature = urlParams.get('nature');

      if (filterStatus) {
        switchTab(filterStatus);
      }
      if (filterSearch && searchInput) {
        searchInput.value = filterSearch;
        clearSearchBtn.style.display = 'block';
      }
      if (filterDa && assistantFilter) {
        assistantFilter.value = filterDa;
      }
      if (filterCategory && categoryFilter) {
        categoryFilter.value = filterCategory;
      }
      if (filterPriority && priorityFilter) {
        priorityFilter.value = filterPriority;
      }
      if (filterNature && natureFilter) {
        natureFilter.value = filterNature;
      }
      renderTable();
    } catch(e) {}
  }

  // ── Render ────────────────────────────────────────────────
  function render() {
    renderKPIs();
    renderTable();
  }

  function renderKPIs() {
    const total = compliances.length;
    let pending = 0;
    let lapsed = 0;
    let complied = 0;

    compliances.forEach(r => {
      const s = calculateStatusInfo(r);
      if (s.status === 'complied') {
        complied++;
      } else {
        pending++;
        if (s.isLapsed) lapsed++;
      }
    });

    document.getElementById('kpiTotalOrders').textContent = total;
    document.getElementById('kpiPendingOrders').textContent = pending;
    document.getElementById('kpiOverdueOrders').textContent = lapsed;
    document.getElementById('kpiCompliedOrders').textContent = complied;
  }

  function getFilteredRecords() {
    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const daVal = document.getElementById('assistantFilter')?.value || '';
    const catVal = document.getElementById('categoryFilter')?.value || '';
    const prioVal = document.getElementById('priorityFilter')?.value || '';
    const natureVal = document.getElementById('natureFilter')?.value || '';

    const list = compliances.filter(r => {
      const s = calculateStatusInfo(r);

      // Status tab filter
      if (currentTab === 'pending' && s.status === 'complied') return false;
      if (currentTab === 'lapsed' && !s.isLapsed) return false;
      if (currentTab === 'duesoon' && (s.status === 'complied' || s.isLapsed || s.daysRemaining > 7)) return false;
      if (currentTab === 'complied' && s.status !== 'complied') return false;

      // Dealing assistant filter
      if (daVal && (r.dealing_assistant || '').trim() !== daVal.trim()) return false;

      // Category filter
      if (catVal && (r.category || '').trim() !== catVal.trim()) return false;

      // Priority filter
      if (prioVal && (r.priority || 'General').trim() !== prioVal.trim()) return false;

      // Nature filter
      const rNature = (r.nature_of_compliance || r.nature || 'Non-peremptory').trim();
      if (natureVal && rNature !== natureVal.trim()) return false;

      // Text search
      if (searchVal) {
        const caseStr = `${r.case_type || ''} ${r.case_no || ''}/${r.case_year || ''}`.toLowerCase();
        const parties = `${r.appellant || ''} ${r.respondent || ''}`.toLowerCase();
        const da = (r.dealing_assistant || '').toLowerCase();
        const directions = (r.directions || '').toLowerCase();
        const category = (r.category || '').toLowerCase();
        const priority = (r.priority || '').toLowerCase();
        const nature = (r.nature_of_compliance || r.nature || '').toLowerCase();

        if (!caseStr.includes(searchVal) &&
            !parties.includes(searchVal) &&
            !da.includes(searchVal) &&
            !directions.includes(searchVal) &&
            !category.includes(searchVal) &&
            !priority.includes(searchVal) &&
            !nature.includes(searchVal)) {
          return false;
        }
      }

      return true;
    });

    // Smart default urgency sorting:
    // 1. Overdue / Lapsed orders first, sorted descending by days lapsed (most critically lapsed at top)
    // 2. Pending orders due today (daysRemaining === 0)
    // 3. Pending orders due in future, sorted ascending by days remaining (closest deadline first)
    // 4. Complied orders, sorted descending by compliance date or created_at
    return list.sort((a, b) => {
      const sa = calculateStatusInfo(a);
      const sb = calculateStatusInfo(b);

      if (sa.isLapsed && sb.isLapsed) {
        return sb.daysLapsed - sa.daysLapsed; // highest lapsed first
      }
      if (sa.isLapsed && !sb.isLapsed) return -1;
      if (!sa.isLapsed && sb.isLapsed) return 1;

      // Neither is lapsed
      if (sa.status !== 'complied' && sb.status === 'complied') return -1;
      if (sa.status === 'complied' && sb.status !== 'complied') return 1;

      if (sa.status !== 'complied' && sb.status !== 'complied') {
        // Nearest deadline first
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      }

      // Both complied
      const ca = a.compliance_date ? new Date(a.compliance_date).getTime() : 0;
      const cb = b.compliance_date ? new Date(b.compliance_date).getTime() : 0;
      return cb - ca;
    });
  }

  function renderTable() {
    const filtered = getFilteredRecords();
    const tbody = document.getElementById('complianceTableBody');
    const emptyState = document.getElementById('noRecordsState');
    const countBadge = document.getElementById('tableCountBadge');

    countBadge.textContent = `${filtered.length} of ${compliances.length} Orders`;

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = filtered.map((r, idx) => {
      const s = calculateStatusInfo(r);
      const rowClass = s.isLapsed ? 'row-lapsed' : '';
      const cType = r.case_type || 'First Appeal';
      const typeShort = cType === 'First Appeal' ? 'FA' : (cType === 'Misc. Appeal' ? 'MA' : 'SA');
      const directionsSnippet = r.directions ? (r.directions.length > 85 ? r.directions.substring(0, 85) + '…' : r.directions) : '—';
      const daName = r.dealing_assistant || 'Unassigned';

      const categoryText = r.category || '';
      const priorityText = r.priority || 'General';
      const isTopPriority = priorityText === 'Top Priority';
      const natureText = r.nature_of_compliance || r.nature || 'Non-peremptory';
      const isPeremptory = natureText === 'Peremptory';

      const priorityBadge = isTopPriority
        ? `<span class="badge badge-top-priority" style="font-size:0.7rem;" title="Top Priority Compliance"><i class="fa-solid fa-bolt"></i> Top Priority</span>`
        : `<span class="badge badge-gray" style="font-size:0.7rem;" title="General Priority"><i class="fa-regular fa-flag"></i> General</span>`;

      const natureBadge = isPeremptory
        ? `<span class="badge badge-peremptory" style="font-size:0.7rem;" title="Peremptory Court Order"><i class="fa-solid fa-gavel"></i> Peremptory</span>`
        : `<span class="badge badge-gray" style="font-size:0.7rem;" title="Non-peremptory">Non-peremptory</span>`;

      const categoryBadge = categoryText
        ? `<span class="badge badge-cyan" style="font-size:0.7rem;" title="Compliance Category"><i class="fa-solid fa-tag"></i> ${esc(categoryText)}</span>`
        : '';

      return `
        <tr class="${rowClass}" data-id="${esc(r.id)}">
          <td style="color:var(--text-muted);">${idx + 1}</td>
          <td>
            <strong>${typeShort} No. ${esc(r.case_no)} / ${esc(r.case_year)}</strong>
            <div style="font-size:0.75rem;color:var(--text-muted);">${esc(cType)}</div>
          </td>
          <td>
            <div style="font-weight:600;font-size:0.85rem;">${esc(r.appellant || '—')}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">vs ${esc(r.respondent || '—')}</div>
          </td>
          <td>
            <span class="da-badge">
              <i class="fa-solid fa-user-tie"></i>
              ${esc(daName)}
            </span>
          </td>
          <td style="white-space:nowrap;">${formatDisplayDate(r.order_date)}</td>
          <td style="white-space:nowrap;font-weight:600;">${formatDisplayDate(r.deadline)}</td>
          <td>${s.badgeHtml}</td>
          <td>
            <div style="max-width:280px;line-height:1.4;">${esc(directionsSnippet)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;align-items:center;">
              ${categoryBadge}
              ${priorityBadge}
              ${natureBadge}
            </div>
          </td>
          <td class="no-print" style="text-align: center; white-space: nowrap;">
            <div style="display:flex;gap:4px;justify-content:center;">
              ${r.status !== 'complied' ? `
                <button type="button" class="btn btn-sm btn-success mark-complied-btn" title="Mark as Complied" data-id="${esc(r.id)}">
                  <i class="fa-solid fa-check"></i>
                </button>
              ` : ''}
              <button type="button" class="btn btn-sm btn-secondary view-details-btn" title="View Full Details" data-id="${esc(r.id)}">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button type="button" class="btn btn-sm btn-secondary edit-order-btn" title="Edit Order" data-id="${esc(r.id)}">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button type="button" class="btn btn-sm btn-danger delete-order-btn" title="Delete Order" data-id="${esc(r.id)}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachTableActionListeners();
  }

  function attachTableActionListeners() {
    document.querySelectorAll('.mark-complied-btn').forEach(btn => {
      btn.addEventListener('click', () => openMarkCompliedModal(btn.dataset.id));
    });
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', () => openDetailsModal(btn.dataset.id));
    });
    document.querySelectorAll('.edit-order-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-order-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteOrder(btn.dataset.id));
    });
  }

  // ── Modals & Actions ──────────────────────────────────────
  const complianceModal = document.getElementById('complianceModal');
  const modalTitle = document.getElementById('modalTitle');
  const complianceForm = document.getElementById('complianceForm');
  const editRecordId = document.getElementById('editRecordId');

  const compCaseNo = document.getElementById('compCaseNo');
  const compCaseYear = document.getElementById('compCaseYear');
  const compCaseType = document.getElementById('compCaseType');
  const compAssistantInput = document.getElementById('compAssistant');
  const compAppellant = document.getElementById('compAppellant');
  const compRespondent = document.getElementById('compRespondent');
  const compOrderDate = document.getElementById('compOrderDate');
  const compDeadline = document.getElementById('compDeadline');
  const compCategory = document.getElementById('compCategory');
  const compPriority = document.getElementById('compPriority');
  const compNature = document.getElementById('compNature');
  const compDirections = document.getElementById('compDirections');

  const caseAutocomplete = document.getElementById('caseAutocomplete');

  function openAddModal() {
    modalTitle.innerHTML = '<i class="fa-solid fa-file-circle-plus"></i> Feed Court Order Compliance';
    complianceForm.reset();
    editRecordId.value = '';
    
    // Set default order date to today
    const todayStr = new Date().toISOString().split('T')[0];
    compOrderDate.value = todayStr;
    
    // Set default deadline 30 days from now
    const d30 = new Date();
    d30.setDate(d30.getDate() + 30);
    compDeadline.value = d30.toISOString().split('T')[0];

    compCategory.value = 'LCR Call';
    compPriority.value = 'General';
    compNature.value = 'Non-peremptory';

    complianceModal.style.display = 'flex';
    compCaseNo.focus();
  }

  function openEditModal(id) {
    const record = compliances.find(r => String(r.id) === String(id));
    if (!record) return;

    modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Compliance Order';
    editRecordId.value = record.id;
    compCaseNo.value = record.case_no || '';
    compCaseYear.value = record.case_year || '';
    compCaseType.value = record.case_type || 'First Appeal';
    compAssistantInput.value = record.dealing_assistant || '';
    compAppellant.value = record.appellant || '';
    compRespondent.value = record.respondent || '';
    compOrderDate.value = record.order_date || '';
    compDeadline.value = record.deadline || '';
    
    const catVal = record.category || 'LCR Call';
    const hasCat = Array.from(compCategory.options).some(o => o.value === catVal);
    compCategory.value = hasCat ? catVal : (catVal === 'Other Direction' ? 'Any other directions' : 'LCR Call');
    
    compPriority.value = record.priority || 'General';
    compNature.value = record.nature_of_compliance || record.nature || 'Non-peremptory';
    compDirections.value = record.directions || '';

    complianceModal.style.display = 'flex';
  }

  function closeAddEditModal() {
    complianceModal.style.display = 'none';
    caseAutocomplete.style.display = 'none';
  }

  document.getElementById('addOrderBtn').addEventListener('click', openAddModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeAddEditModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeAddEditModal);

  // Case Autocomplete
  compCaseNo.addEventListener('input', () => {
    const val = compCaseNo.value.trim();
    if (!val || val.length < 1 || typeof CASES_DB === 'undefined') {
      caseAutocomplete.style.display = 'none';
      return;
    }

    const matches = Object.entries(CASES_DB).filter(([k]) => {
      return k.toLowerCase().includes(val.toLowerCase());
    }).slice(0, 8);

    if (matches.length === 0) {
      caseAutocomplete.style.display = 'none';
      return;
    }

    caseAutocomplete.innerHTML = matches.map(([k, data]) => {
      return `<div class="autocomplete-item" data-key="${k}">${k} — ${(data.appellant || '').substring(0, 30)}</div>`;
    }).join('');
    caseAutocomplete.style.display = 'block';
  });

  caseAutocomplete.addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (!item) return;
    const key = item.dataset.key;
    const parts = key.split('/');
    if (parts.length === 3) {
      compCaseNo.value = parts[1];
      compCaseYear.value = parts[2];
    } else if (parts.length === 2) {
      compCaseNo.value = parts[0];
      compCaseYear.value = parts[1];
    }
    
    // Auto-fill parties and DA
    const caseData = CASES_DB[key];
    if (caseData) {
      if (caseData.appellant) compAppellant.value = caseData.appellant;
      if (caseData.respondent) compRespondent.value = caseData.respondent;
    }
    const da = getAssistantForCase(compCaseNo.value, compCaseYear.value);
    if (da) compAssistantInput.value = da;

    caseAutocomplete.style.display = 'none';
  });

  // On blur/change of case no or year, lookup DA and parties if not filled
  function checkLookup() {
    let rawNo = (compCaseNo.value || '').trim();
    // Allow formats like "FA/123/2026" or "123/2026" typed into the case number field
    const m = rawNo.match(/^(?:(?:FA|MA|SA|CA)\/)?(\d+)\/(\d{2,4})$/i);
    if (m) {
      compCaseNo.value = m[1];
      if (!compCaseYear.value || compCaseYear.value.trim() === '') {
        let yr = m[2];
        if (yr.length === 2) yr = (parseInt(yr, 10) > 50 ? '19' : '20') + yr;
        compCaseYear.value = yr;
      }
    }

    if (compCaseNo.value && compCaseYear.value) {
      const caseData = getCaseFromDB(compCaseNo.value, compCaseYear.value);
      if (caseData) {
        if (!compAppellant.value && caseData.appellant) compAppellant.value = caseData.appellant;
        if (!compRespondent.value && caseData.respondent) compRespondent.value = caseData.respondent;
      }
      if (!compAssistantInput.value) {
        const da = getAssistantForCase(compCaseNo.value, compCaseYear.value);
        if (da) compAssistantInput.value = da;
      }
    }
  }
  compCaseNo.addEventListener('blur', checkLookup);
  compCaseYear.addEventListener('blur', checkLookup);

  document.addEventListener('click', (e) => {
    if (!compCaseNo.contains(e.target) && !caseAutocomplete.contains(e.target)) {
      caseAutocomplete.style.display = 'none';
    }
  });

  // Save Compliance Form
  complianceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editRecordId.value;
    const payload = {
      case_no: compCaseNo.value.trim(),
      case_year: compCaseYear.value.trim(),
      case_type: compCaseType.value,
      dealing_assistant: compAssistantInput.value,
      appellant: compAppellant.value.trim(),
      respondent: compRespondent.value.trim(),
      order_date: compOrderDate.value,
      deadline: compDeadline.value,
      category: compCategory.value,
      priority: compPriority.value,
      nature_of_compliance: compNature.value,
      nature: compNature.value,
      directions: compDirections.value.trim()
    };

    if (payload.order_date && payload.deadline && payload.deadline < payload.order_date) {
      alert('The Last Date to Comply cannot be earlier than the Order Passed Date.');
      compDeadline.focus();
      return;
    }

    // If case is not in CASES_DB, cache it so all portal tools recognize it
    if (payload.case_no && payload.case_year) {
      const cCode = payload.case_type === 'First Appeal' ? 'FA' : (payload.case_type === 'Misc. Appeal' ? 'MA' : 'SA');
      const cKey = `${cCode}/${payload.case_no}/${payload.case_year}`;
      if (typeof CASES_DB !== 'undefined') {
        if (!CASES_DB[cKey]) {
          CASES_DB[cKey] = { appellant: payload.appellant || '', respondent: payload.respondent || '' };
        }
      }
      try {
        const localStore = JSON.parse(localStorage.getItem('phc_local_cases_db') || '{}');
        localStore[cKey] = { appellant: payload.appellant || '', respondent: payload.respondent || '' };
        localStorage.setItem('phc_local_cases_db', JSON.stringify(localStore));
      } catch(err){}
    }

    if (id) {
      if (window.PortalDB) {
        await window.PortalDB.updateCompliance(id, payload);
      }
      const idx = compliances.findIndex(r => String(r.id) === String(id));
      if (idx !== -1) compliances[idx] = { ...compliances[idx], ...payload };
    } else {
      payload.status = 'pending';
      let created = null;
      if (window.PortalDB) {
        created = await window.PortalDB.insertCompliance(payload);
      } else {
        payload.id = 'comp_' + Date.now();
        payload.created_at = new Date().toISOString();
        created = payload;
        const local = JSON.parse(localStorage.getItem('phc_compliance_records') || '[]');
        local.unshift(created);
        localStorage.setItem('phc_compliance_records', JSON.stringify(local));
      }
      compliances.unshift(created || payload);
    }

    closeAddEditModal();
    render();
  });

  // ── Mark as Complied Modal ────────────────────────────────
  const markCompliedModal = document.getElementById('markCompliedModal');
  const markCompliedForm = document.getElementById('markCompliedForm');
  const compliedRecordId = document.getElementById('compliedRecordId');
  const compliedDate = document.getElementById('compliedDate');
  const compliedRemarks = document.getElementById('compliedRemarks');
  const compliedCaseSummary = document.getElementById('compliedCaseSummary');

  function openMarkCompliedModal(id) {
    const record = compliances.find(r => String(r.id) === String(id));
    if (!record) return;

    compliedRecordId.value = record.id;
    compliedDate.value = new Date().toISOString().split('T')[0];
    compliedRemarks.value = '';

    const s = calculateStatusInfo(record);
    compliedCaseSummary.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;color:var(--text-main);">
        ${esc(record.case_type || 'FA')} No. ${esc(record.case_no)} / ${esc(record.case_year)}
      </div>
      <div style="color:var(--text-muted);margin-bottom:6px;">
        ${esc(record.appellant || '')} vs ${esc(record.respondent || '')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>Assigned: <strong>${esc(record.dealing_assistant || '—')}</strong></span>
        <span>Deadline: <strong>${formatDisplayDate(record.deadline)}</strong></span>
      </div>
      <div style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        ${s.badgeHtml}
        ${record.category ? `<span class="badge badge-cyan" style="font-size:0.72rem;">${esc(record.category)}</span>` : ''}
        ${record.priority === 'Top Priority' ? `<span class="badge badge-top-priority" style="font-size:0.72rem;"><i class="fa-solid fa-bolt"></i> Top Priority</span>` : ''}
        ${(record.nature_of_compliance === 'Peremptory' || record.nature === 'Peremptory') ? `<span class="badge badge-peremptory" style="font-size:0.72rem;"><i class="fa-solid fa-gavel"></i> Peremptory</span>` : ''}
      </div>
    `;

    markCompliedModal.style.display = 'flex';
    compliedRemarks.focus();
  }

  function closeMarkCompliedModal() {
    markCompliedModal.style.display = 'none';
  }

  document.getElementById('closeCompliedModalBtn').addEventListener('click', closeMarkCompliedModal);
  document.getElementById('cancelCompliedModalBtn').addEventListener('click', closeMarkCompliedModal);

  markCompliedForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = compliedRecordId.value;
    const cDate = compliedDate.value;
    const cRemarks = compliedRemarks.value.trim();

    const existingRec = compliances.find(r => String(r.id) === String(id));
    if (existingRec && existingRec.order_date && cDate < existingRec.order_date) {
      alert(`Date of Compliance cannot be earlier than the Order Passed Date (${formatDisplayDate(existingRec.order_date)}).`);
      compliedDate.focus();
      return;
    }

    const updates = {
      status: 'complied',
      compliance_date: cDate,
      compliance_remarks: cRemarks
    };

    if (window.PortalDB) {
      await window.PortalDB.updateCompliance(id, updates);
    }
    const idx = compliances.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) compliances[idx] = { ...compliances[idx], ...updates };

    closeMarkCompliedModal();
    render();
  });

  // ── View Details Modal ────────────────────────────────────
  const detailsModal = document.getElementById('detailsModal');
  const detailsModalBody = document.getElementById('detailsModalBody');

  function openDetailsModal(id) {
    const record = compliances.find(r => String(r.id) === String(id));
    if (!record) return;

    const s = calculateStatusInfo(record);

    detailsModalBody.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;border-bottom:1px solid var(--border-color);padding-bottom:12px;">
        <div>
          <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-main);">
            ${esc(record.case_type || 'First Appeal')} No. ${esc(record.case_no)} / ${esc(record.case_year)}
          </h3>
          <div style="color:var(--text-muted);font-size:0.85rem;">
            ${esc(record.appellant || '—')} vs ${esc(record.respondent || '—')}
          </div>
        </div>
        <div>${s.badgeHtml}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div>
          <strong style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">Dealing Assistant:</strong>
          <div style="font-weight:600;color:var(--accent-purple);">${esc(record.dealing_assistant || 'Unassigned')}</div>
        </div>
        <div>
          <strong style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">Compliance Category:</strong>
          <div style="font-weight:600;color:var(--accent-cyan);">${esc(record.category || 'Any other directions')}</div>
        </div>
        <div>
          <strong style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">Priority:</strong>
          <div style="margin-top:2px;">
            ${record.priority === 'Top Priority'
              ? '<span class="badge badge-top-priority" style="font-size:0.78rem;"><i class="fa-solid fa-bolt"></i> Top Priority</span>'
              : '<span class="badge badge-gray" style="font-size:0.78rem;"><i class="fa-regular fa-flag"></i> General</span>'}
          </div>
        </div>
        <div>
          <strong style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">Nature of Compliance:</strong>
          <div style="margin-top:2px;">
            ${(record.nature_of_compliance === 'Peremptory' || record.nature === 'Peremptory')
              ? '<span class="badge badge-peremptory" style="font-size:0.78rem;"><i class="fa-solid fa-gavel"></i> Peremptory</span>'
              : '<span class="badge badge-gray" style="font-size:0.78rem;">Non-peremptory</span>'}
          </div>
        </div>
        <div>
          <strong style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">Order Passed Date:</strong>
          <div>${formatDisplayDate(record.order_date)}</div>
        </div>
        <div>
          <strong style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">Last Date to Comply:</strong>
          <div style="font-weight:700;color:${s.isLapsed ? 'var(--accent-red)' : 'var(--text-main)'};">
            ${formatDisplayDate(record.deadline)}
          </div>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <strong style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">Court Directions / Order Summary:</strong>
        <div style="background:rgba(15,23,42,0.7);border:1px solid var(--border-color);padding:10px 12px;border-radius:6px;margin-top:4px;white-space:pre-wrap;">
          ${esc(record.directions || 'No specific directions entered.')}
        </div>
      </div>

      ${record.status === 'complied' ? `
        <div style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);padding:12px;border-radius:6px;">
          <strong style="color:var(--accent-green);font-size:0.85rem;display:flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-circle-check"></i> Compliance Recorded on ${formatDisplayDate(record.compliance_date)}
          </strong>
          <div style="margin-top:6px;font-size:0.88rem;color:var(--text-main);">
            ${esc(record.compliance_remarks || 'Complied')}
          </div>
        </div>
      ` : ''}
    `;

    detailsModal.style.display = 'flex';
  }

  function closeDetailsModal() {
    detailsModal.style.display = 'none';
  }

  document.getElementById('closeDetailsModalBtn').addEventListener('click', closeDetailsModal);
  document.getElementById('dismissDetailsModalBtn').addEventListener('click', closeDetailsModal);
  document.getElementById('printDetailsBtn').addEventListener('click', () => {
    window.print();
  });

  // ── Delete Order ──────────────────────────────────────────
  async function deleteOrder(id) {
    const record = compliances.find(r => String(r.id) === String(id));
    if (!record) return;
    const confirmMsg = `Are you sure you want to delete compliance order for Case No. ${record.case_no}/${record.case_year}?`;
    if (!confirm(confirmMsg)) return;

    if (window.PortalDB) {
      await window.PortalDB.deleteCompliance(id);
    }
    compliances = compliances.filter(r => String(r.id) !== String(id));
    render();
  }

  // ── Search & Filter Listeners ─────────────────────────────
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    renderTable();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderTable();
  });

  assistantFilter.addEventListener('change', () => {
    renderTable();
  });

  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      renderTable();
    });
  }

  if (priorityFilter) {
    priorityFilter.addEventListener('change', () => {
      renderTable();
    });
  }

  if (natureFilter) {
    natureFilter.addEventListener('change', () => {
      renderTable();
    });
  }

  function switchTab(status) {
    const validTabs = ['all', 'pending', 'lapsed', 'duesoon', 'complied'];
    if (!validTabs.includes(status)) status = 'all';
    document.querySelectorAll('#statusTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.status === status);
    });
    currentTab = status;
    renderTable();
  }

  document.querySelectorAll('#statusTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.status);
    });
  });

  // KPI Card Clicks to Filter
  document.querySelectorAll('.kpi-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.setAttribute('title', 'Click to filter table');
    card.addEventListener('click', () => {
      if (card.classList.contains('blue')) switchTab('all');
      else if (card.classList.contains('amber')) switchTab('pending');
      else if (card.classList.contains('red')) switchTab('lapsed');
      else if (card.classList.contains('green')) switchTab('complied');
    });
  });

  // ── Export CSV ────────────────────────────────────────────
  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    const filtered = getFilteredRecords();
    if (filtered.length === 0) {
      alert('No compliance records to export.');
      return;
    }

    const headers = [
      'Sl No', 'Case Type', 'Case Number', 'Case Year', 'Appellant', 'Respondent',
      'Dealing Assistant', 'Order Date', 'Deadline (Last Date)', 'Status',
      'Days Lapsed', 'Compliance Date', 'Category', 'Priority', 'Nature of Compliance', 'Directions', 'Compliance Remarks'
    ];

    const rows = filtered.map((r, i) => {
      const s = calculateStatusInfo(r);
      return [
        i + 1,
        `"${(r.case_type || 'First Appeal').replace(/"/g, '""')}"`,
        `"${(r.case_no || '').replace(/"/g, '""')}"`,
        `"${(r.case_year || '').replace(/"/g, '""')}"`,
        `"${(r.appellant || '').replace(/"/g, '""')}"`,
        `"${(r.respondent || '').replace(/"/g, '""')}"`,
        `"${(r.dealing_assistant || '').replace(/"/g, '""')}"`,
        `"${(r.order_date || '').replace(/"/g, '""')}"`,
        `"${(r.deadline || '').replace(/"/g, '""')}"`,
        `"${(r.status || 'pending').replace(/"/g, '""')}"`,
        s.daysLapsed || 0,
        `"${(r.compliance_date || '').replace(/"/g, '""')}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        `"${(r.priority || 'General').replace(/"/g, '""')}"`,
        `"${(r.nature_of_compliance || r.nature || 'Non-peremptory').replace(/"/g, '""')}"`,
        `"${(r.directions || '').replace(/"/g, '""')}"`,
        `"${(r.compliance_remarks || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Compliance_Orders_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // ── Print Register ────────────────────────────────────────
  document.getElementById('printRegisterBtn').addEventListener('click', () => {
    window.print();
  });

  // Initial load
  loadCompliances();
});
