/* ============================================================
   PATNA HIGH COURT — SECTION ANALYTICS SCRIPT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  let lcrCalls    = [];
  let noticeForms = [];
  let directNotes = [];
  let causeLists  = [];
  let fileTracking= [];
  let caseRecords = [];
  let crCount     = 0;

  /* ── Global Helpers ───────────────────────────────────────── */
  function normalizeCaseKey(caseNo, caseYear) {
    if (!caseNo) return '';
    let c = String(caseNo).replace('FA/', '').trim();
    if (c.includes('/')) {
      const parts = c.split('/');
      c = parts.length === 3 ? `${parts[1]}/${parts[2]}` : c;
    } else if (caseYear) {
      c = `${c}/${caseYear}`;
    }
    return c;
  }

  function getDaForCase(caseNo, caseYear) {
    if (typeof ASSISTANTS_DB === 'undefined') return '';
    const c = normalizeCaseKey(caseNo, caseYear);
    return ASSISTANTS_DB[c] || '';
  }

  /* ── Build DA summary from actual case records & ASSISTANTS_DB ── */
  function buildDAs() {
    const daNames = new Set();
    if (typeof ASSISTANTS_DB !== 'undefined') {
      Object.values(ASSISTANTS_DB).forEach(n => daNames.add(String(n).trim()));
    }
    caseRecords.forEach(r => {
      if (r.dealing_assistant) daNames.add(r.dealing_assistant.trim());
    });
    
    const counts = {};
    daNames.forEach(n => counts[n] = 0);
    
    caseRecords.forEach(r => {
      const da = (r.dealing_assistant || '').trim() || getDaForCase(r.case_no, r.case_year);
      if (da && counts[da] !== undefined) counts[da]++;
      else if (da) counts[da] = 1;
    });
    
    return Object.entries(counts)
      .map(([name, casesAllotted], i) => ({ rank: 0, name, casesAllotted }))
      .sort((a, b) => b.casesAllotted - a.casesAllotted)
      .map((d, i) => ({ ...d, rank: i + 1 }));
  }

  /* ── Build decade distribution from CASES_DB or caseRecords ─────────────── */
  function buildDecades() {
    const decades = {};
    
    if (caseRecords && caseRecords.length > 0) {
      caseRecords.forEach(c => {
        const yr = parseInt(c.case_year, 10);
        if (!isNaN(yr)) {
          const dec = `${Math.floor(yr / 10) * 10}s`;
          decades[dec] = (decades[dec] || 0) + 1;
        }
      });
    } else if (typeof CASES_DB !== 'undefined') {
      for (const key of Object.keys(CASES_DB)) {
        const parts = key.split('/');
        if (parts.length === 3) {
          const yr = parseInt(parts[2], 10);
          if (!isNaN(yr)) {
            const dec = `${Math.floor(yr / 10) * 10}s`;
            decades[dec] = (decades[dec] || 0) + 1;
          }
        }
      }
    }
    return decades;
  }

  /* ── Fetch all API data ───────────────────────────────────── */
  async function fetchAll() {
    try {
      if (window.PortalDB) {
        const [analyticsData, crData] = await Promise.all([
          window.PortalDB.getAnalytics(),
          window.PortalDB.getCaseRecords('id,case_no,case_year,appellant,respondent,lc_court,date_of_judgment,record_room_bundle_no,suit_value,dealing_assistant')
        ]);
        lcrCalls    = analyticsData.lcr_calls    || [];
        noticeForms = analyticsData.notice_forms || [];
        directNotes = analyticsData.direct_notices || [];
        causeLists  = analyticsData.cause_lists  || [];
        fileTracking= analyticsData.file_tracking|| [];
        crCount     = analyticsData.case_records_count || 0;
        caseRecords = crData || [];
      }
    } catch (e) {
      console.warn('Analytics API error:', e);
    }
    // Update last synced time
    const syncEl = document.getElementById('lastSyncedTime');
    if (syncEl) syncEl.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    render();
  }

  /* ── Main render ──────────────────────────────────────────── */
  function render() {
    renderKPIs();
    renderCompleteness();
    renderDecades();
    renderDAs();
    renderActivity();
  }

  /* ── KPI Cards ───────────────────────────────────────────── */
  function renderKPIs() {
    const das = buildDAs();
    const totalCases = typeof CASES_DB !== 'undefined' ? Object.keys(CASES_DB).length : crCount;

    // Records with LC court filled (from case_records data_json)
    const withLC = caseRecords.filter(r => r.lc_court && r.lc_court.trim()).length;

    const totalDocs = lcrCalls.length + noticeForms.length + directNotes.length;

    setText('kpiTotalCases',    totalCases.toLocaleString('en-IN'));
    setText('kpiDAs',           das.filter(d => !d.name.includes('/')).length);
    setText('kpiRecordsFilled', withLC.toLocaleString('en-IN'));
    setText('kpiDocsGenerated', totalDocs.toLocaleString('en-IN'));
  }

  /* ── Completeness bars ────────────────────────────────────── */
  function renderCompleteness() {
    const total = caseRecords.length || crCount || 5708;

    const metrics = [
      {
        label: 'Party Names (Appellant & Respondent)',
        icon: 'fa-users',
        color: '#22c55e',
        count: caseRecords.filter(r => r.appellant && r.respondent).length || total,
        note: 'Auto-seeded from master CASES_DB'
      },
      {
        label: 'Lower Court Details',
        icon: 'fa-landmark',
        color: '#3b82f6',
        count: caseRecords.filter(r => r.lc_court && r.lc_court.trim()).length,
        note: 'Filled via LCR Call auto-sync'
      },
      {
        label: 'Judgment / Decree Dates',
        icon: 'fa-calendar-check',
        color: '#a855f7',
        count: caseRecords.filter(r => r.date_of_judgment && r.date_of_judgment.trim()).length,
        note: 'Entered during LCR sync'
      },
      {
        label: 'Record Room Bundle Numbers',
        icon: 'fa-box-archive',
        color: '#f59e0b',
        count: caseRecords.filter(r => r.record_room_bundle_no && r.record_room_bundle_no.trim()).length,
        note: 'Assigned by Record Room staff'
      },
      {
        label: 'Valuation (Suit / Appeal)',
        icon: 'fa-indian-rupee-sign',
        color: '#14b8a6',
        count: caseRecords.filter(r => r.suit_value && r.suit_value.trim()).length,
        note: 'Optional financial valuation field'
      }
    ];

    const grid = document.getElementById('completenessGrid');
    if (!grid) return;

    document.getElementById('totalRecordsBadge').textContent =
      `${total.toLocaleString('en-IN')} Cases`;

    grid.innerHTML = metrics.map(m => {
      const pct = total > 0 ? Math.round((m.count / total) * 100) : 0;
      return `
        <div class="completeness-item">
          <div class="ci-header">
            <div class="ci-label">
              <i class="fa-solid ${m.icon}" style="color:${m.color};"></i>
              <strong>${m.label}</strong>
            </div>
            <div class="ci-stats">
              <span class="ci-count">${m.count.toLocaleString('en-IN')}</span>
              <span class="ci-pct" style="color:${m.color};">${pct}%</span>
            </div>
          </div>
          <div class="ci-bar-bg">
            <div class="ci-bar-fill" style="width:${pct}%;background:${m.color};"></div>
          </div>
          <div class="ci-note">${m.note}</div>
        </div>
      `;
    }).join('');
  }

  /* ── Decade chart ─────────────────────────────────────────── */
  function renderDecades() {
    const decades = buildDecades();
    const entries = Object.entries(decades).sort((a, b) => a[0].localeCompare(b[0]));
    const max = Math.max(...entries.map(e => e[1]));

    const container = document.getElementById('decadeChart');
    if (!container) return;

    const colors = ['#3b82f6','#22c55e','#a855f7','#f59e0b','#14b8a6','#ef4444','#f97316','#6366f1'];

    container.innerHTML = entries.map(([decade, count], i) => {
      const barH = max > 0 ? Math.round((count / max) * 100) : 0;
      const color = colors[i % colors.length];
      return `
        <div class="decade-bar-wrap">
          <div class="decade-bar-outer">
            <div class="decade-count">${count.toLocaleString('en-IN')}</div>
            <div class="decade-bar" style="height:${barH}%;background:${color};"></div>
          </div>
          <div class="decade-label">${decade}</div>
        </div>
      `;
    }).join('');
  }

  /* ── DA Table ─────────────────────────────────────────────── */
  function renderDAs() {
    const all = buildDAs();
    const query = (document.getElementById('daSearch')?.value || '').toLowerCase().trim();
    const das = query ? all.filter(d => d.name.toLowerCase().includes(query)) : all;
    const total = all.reduce((s, d) => s + d.casesAllotted, 0);

    document.getElementById('daCountBadge').textContent =
      `${all.filter(d => !d.name.includes('/')).length} Assistants`;

    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const daStats = {};
    all.forEach(d => {
      daStats[d.name] = { listed7d: new Set(), direct7d: new Set(), notice7d: new Set(), lcr7d: new Set(), files7d: new Set() };
    });

    function addStat(daName, key, caseKey) {
      if (daName && daStats[daName] && caseKey) daStats[daName][key].add(caseKey);
    }

    lcrCalls.forEach(c => {
      const caseKey = normalizeCaseKey(c.case_no, c.case_year);
      const da = (c.dealing_assistant || '').trim() || getDaForCase(c.case_no, c.case_year);
      if (!da) return;
      if (!daStats[da]) daStats[da] = { listed7d: new Set(), direct7d: new Set(), notice7d: new Set(), lcr7d: new Set(), files7d: new Set() };
      
      if (c.saved_at && (now - new Date(c.saved_at).getTime() <= SEVEN_DAYS)) addStat(da, 'lcr7d', caseKey);
    });

    noticeForms.forEach(c => {
      if (c.saved_at && (now - new Date(c.saved_at).getTime() <= SEVEN_DAYS)) {
        const caseKey = normalizeCaseKey(c.caseNo || c.case_no, c.case_year);
        const da = (c.dealing_assistant || '').trim() || getDaForCase(c.caseNo || c.case_no, c.case_year);
        addStat(da, 'notice7d', caseKey);
      }
    });

    directNotes.forEach(c => {
      if (c.saved_at && (now - new Date(c.saved_at).getTime() <= SEVEN_DAYS)) {
        const caseKey = normalizeCaseKey(c.caseNo || c.case_no, c.case_year);
        const da = (c.dealing_assistant || '').trim() || getDaForCase(c.caseNo || c.case_no, c.case_year);
        addStat(da, 'direct7d', caseKey);
      }
    });

    causeLists.forEach(cl => {
      if (cl.saved_at && (now - new Date(cl.saved_at).getTime() <= SEVEN_DAYS)) {
        (cl.cases || []).forEach(c => {
          const caseKey = normalizeCaseKey(c.case_no, c.case_year);
          const da = getDaForCase(c.case_no, c.case_year);
          addStat(da, 'listed7d', caseKey);
        });
      }
    });

    fileTracking.forEach(ft => {
      // "In movement" means status is out, or it was moved recently
      if (ft.status === 'out' || (ft.timestamp && (now - new Date(ft.timestamp).getTime() <= SEVEN_DAYS))) {
        const caseKey = normalizeCaseKey(ft.caseNo, null);
        const da = (ft.assistant || '').trim() || getDaForCase(ft.caseNo, null);
        addStat(da, 'files7d', caseKey);
      }
    });

    const tbody = document.getElementById('daTableBody');
    if (!tbody) return;

    tbody.innerHTML = das.map(d => {
      const pct = total > 0 ? ((d.casesAllotted / total) * 100).toFixed(1) : 0;
      const barW = Math.min(parseFloat(pct) * 4, 100);
      const stat = daStats[d.name] || { listed7d: new Set(), direct7d: new Set(), notice7d: new Set(), lcr7d: new Set(), files7d: new Set() };
      
      const listedCount = stat.listed7d.size;
      const directCount = stat.direct7d.size;
      const noticeCount = stat.notice7d.size;
      const lcrCount = stat.lcr7d.size;
      const filesCount = stat.files7d.size;
      
      const isShared = d.name.includes('/');

      return `
        <tr>
          <td style="color:var(--text-muted);font-size:0.85rem;">${d.rank}</td>
          <td>
            <strong>${esc(d.name)}</strong>
            ${isShared ? '<div style="font-size:0.74rem;color:var(--text-muted);">Jointly Allotted</div>' : ''}
          </td>
          <td><strong style="font-size:1rem;">${d.casesAllotted.toLocaleString('en-IN')}</strong></td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="flex:1;background:rgba(255,255,255,0.08);border-radius:4px;height:8px;min-width:80px;">
                <div style="height:8px;border-radius:4px;background:var(--primary-blue);width:${barW}%;"></div>
              </div>
              <span style="font-size:0.8rem;color:var(--text-muted);min-width:38px;">${pct}%</span>
            </div>
          </td>
          <td><span class="badge ${listedCount > 0 ? 'badge-blue' : ''}" style="${listedCount === 0 ? 'background:transparent;color:var(--text-muted);' : ''}">${listedCount}</span></td>
          <td><span class="badge ${directCount > 0 ? 'badge-purple' : ''}" style="${directCount === 0 ? 'background:transparent;color:var(--text-muted);' : ''}">${directCount}</span></td>
          <td><span class="badge ${noticeCount > 0 ? 'badge-green' : ''}" style="${noticeCount === 0 ? 'background:transparent;color:var(--text-muted);' : ''}">${noticeCount}</span></td>
          <td><span class="badge ${filesCount > 0 ? 'badge-teal' : ''}" style="${filesCount === 0 ? 'background:transparent;color:var(--text-muted);' : ''}">${filesCount}</span></td>
        </tr>
      `;
    }).join('');
  }

  /* ── Recent Activity ──────────────────────────────────────── */
  function renderActivity() {
    const feed  = document.getElementById('activityFeed');
    const empty = document.getElementById('activityEmpty');
    if (!feed) return;

    const allDocs = [
      ...lcrCalls.map(d    => ({ type: 'LCR Call',     icon: 'fa-phone-volume',       color: '#f59e0b', label: `F.A. No. ${d.case_no}/${d.case_year}`, saved_at: d.saved_at })),
      ...noticeForms.map(d => ({ type: 'Notice Form',  icon: 'fa-envelope-open-text', color: '#22c55e', label: `Case ${d.caseNo || d.case_no || 'Unknown'}`,        saved_at: d.saved_at })),
      ...directNotes.map(d => ({ type: 'Direct Notice',icon: 'fa-paper-plane',        color: '#a855f7', label: `Case ${d.caseNo || d.case_no || 'Unknown'}`,        saved_at: d.saved_at })),
    ]
    .filter(d => d.saved_at)
    .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
    .slice(0, 15);

    if (allDocs.length === 0) {
      empty.style.display = 'block';
      feed.style.display  = 'none';
      return;
    }
    empty.style.display = 'none';
    feed.style.display  = 'block';

    document.getElementById('recentBadge').textContent =
      `Last ${allDocs.length} Document${allDocs.length !== 1 ? 's' : ''}`;

    feed.innerHTML = allDocs.map(d => {
      const dt = new Date(d.saved_at);
      const timeStr = isNaN(dt) ? '—' : dt.toLocaleString('en-IN', {
        day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
      });
      return `
        <div class="activity-item">
          <div class="act-icon" style="background:${d.color}22;color:${d.color};">
            <i class="fa-solid ${d.icon}"></i>
          </div>
          <div class="act-body">
            <div class="act-title">${d.label}</div>
            <div class="act-meta"><span class="act-type">${d.type}</span> · ${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ── Event Listeners ──────────────────────────────────────── */
  document.getElementById('refreshBtn').addEventListener('click', fetchAll);
  document.getElementById('printBtn').addEventListener('click', () => window.print());
  document.getElementById('daSearch').addEventListener('input', renderDAs);

  /* ── Boot ─────────────────────────────────────────────────── */
  fetchAll();
});


