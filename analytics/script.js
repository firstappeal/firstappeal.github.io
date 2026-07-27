/* ============================================================
   PATNA HIGH COURT — SECTION ANALYTICS SCRIPT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Data from APIs ───────────────────────────────────────── */
  let lcrCalls    = [];
  let noticeForms = [];
  let directNotes = [];
  let caseRecords = [];
  let crCount     = 0;

  /* ── Build DA summary from ASSISTANTS_DB ──────────────────── */
  function buildDAs() {
    if (typeof ASSISTANTS_DB === 'undefined') return [];
    const counts = {};
    for (const name of Object.values(ASSISTANTS_DB)) {
      const n = String(name).trim();
      counts[n] = (counts[n] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, casesAllotted], i) => ({ rank: i + 1, name, casesAllotted }))
      .sort((a, b) => b.casesAllotted - a.casesAllotted)
      .map((d, i) => ({ ...d, rank: i + 1 }));
  }

  /* ── Build decade distribution from CASES_DB ─────────────── */
  function buildDecades() {
    if (typeof CASES_DB === 'undefined') return {};
    const decades = {};
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
    return decades;
  }

  /* ── Fetch all API data ───────────────────────────────────── */
  async function fetchAll() {
    try {
      const [aRes, crRes] = await Promise.all([
        fetch('/api/analytics').then(r => r.json()).catch(() => ({})),
        fetch('/api/case_records').then(r => r.json()).catch(() => ({}))
      ]);

      lcrCalls    = aRes.lcr_calls    || [];
      noticeForms = aRes.notice_forms || [];
      directNotes = aRes.direct_notices || [];
      crCount     = aRes.case_records_count || 0;
      caseRecords = crRes.data || [];
    } catch (e) {
      console.warn('Analytics API error:', e);
    }
    render();
  }

  /* ── Main render ──────────────────────────────────────────── */
  function render() {
    renderKPIs();
    renderCompleteness();
    renderDecades();
    renderDAs();
    renderLCR();
    renderActivity();
  }

  /* ── KPI Cards ───────────────────────────────────────────── */
  function renderKPIs() {
    const das = buildDAs();
    const totalCases = typeof CASES_DB !== 'undefined' ? Object.keys(CASES_DB).length : crCount;

    const now = Date.now();
    const pending  = lcrCalls.filter(c => (c.lcr_status || c.status) !== 'received').length;
    const overdue  = lcrCalls.filter(c => {
      if ((c.lcr_status || c.status) === 'received') return false;
      const dt = new Date(c.saved_at || '');
      return !isNaN(dt) && Math.floor((now - dt) / 86400000) >= 30;
    }).length;

    // Records with LC court filled (from case_records data_json)
    const withLC = caseRecords.filter(r => r.lc_court && r.lc_court.trim()).length;

    const totalDocs = lcrCalls.length + noticeForms.length + directNotes.length;

    setText('kpiTotalCases',    totalCases.toLocaleString('en-IN'));
    setText('kpiDAs',           das.filter(d => !d.name.includes('/')).length);
    setText('kpiLcrPending',    pending);
    setText('kpiLcrOverdue',    overdue);
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

    // Per-DA LCR stats
    const lcrByDA = {};
    lcrCalls.forEach(c => {
      const da = (c.dealing_assistant || '').trim();
      if (!da) return;
      if (!lcrByDA[da]) lcrByDA[da] = { pending: 0, received: 0 };
      if ((c.lcr_status || c.status) === 'received') lcrByDA[da].received++;
      else lcrByDA[da].pending++;
    });

    const tbody = document.getElementById('daTableBody');
    if (!tbody) return;

    tbody.innerHTML = das.map(d => {
      const pct = total > 0 ? ((d.casesAllotted / total) * 100).toFixed(1) : 0;
      const barW = Math.min(parseFloat(pct) * 4, 100);
      const lcrStat = lcrByDA[d.name] || { pending: 0, received: 0 };
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
          <td><span class="badge ${lcrStat.pending > 0 ? 'badge-orange' : 'badge-green'}">${lcrStat.pending}</span></td>
          <td><span class="badge badge-green">${lcrStat.received}</span></td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No results.</td></tr>`;
  }

  /* ── LCR Pipeline ─────────────────────────────────────────── */
  function renderLCR() {
    const badge = document.getElementById('lcrBadge');
    const empty = document.getElementById('lcrEmpty');
    const wrap  = document.getElementById('lcrTableWrapper');
    const tbody = document.getElementById('lcrTableBody');
    if (!tbody) return;

    badge.textContent = `${lcrCalls.length} Call${lcrCalls.length !== 1 ? 's' : ''} Logged`;

    if (lcrCalls.length === 0) {
      empty.style.display = 'block';
      wrap.style.display  = 'none';
      return;
    }
    empty.style.display = 'none';
    wrap.style.display  = 'block';

    const now = Date.now();
    const sorted = [...lcrCalls].sort((a, b) => {
      // Overdue first, then pending, then received
      const statusScore = c => (c.lcr_status || c.status) === 'received' ? 2 : 1;
      return statusScore(a) - statusScore(b);
    });

    tbody.innerHTML = sorted.map(c => {
      const caseNo   = c.case_no   || '-';
      const caseYear = c.case_year || '-';
      const status   = c.lcr_status || c.status || 'pending';
      const received = status === 'received';
      let days = 0;
      if (c.saved_at) {
        const dt = new Date(c.saved_at);
        if (!isNaN(dt)) days = Math.floor((now - dt) / 86400000);
      }
      const overdue = !received && days >= 30;

      return `
        <tr>
          <td><strong style="color:var(--primary-blue);">F.A. No. ${esc(caseNo)} / ${esc(caseYear)}</strong></td>
          <td style="font-size:0.83rem;">
            ${esc(c.appellant || '—')}
            <span style="color:var(--accent-orange);font-weight:700;"> VS </span>
            ${esc(c.respondent || '—')}
          </td>
          <td style="font-size:0.83rem;">${c.custom_date || (c.saved_at ? c.saved_at.slice(0,10) : '—')}</td>
          <td>
            <span style="font-weight:700;color:${overdue ? '#ef4444' : days > 15 ? '#f59e0b' : 'var(--text-main)'};">${days}</span>
            <span style="font-size:0.8rem;color:var(--text-muted);"> days</span>
          </td>
          <td>
            <span class="badge ${received ? 'badge-green' : overdue ? 'badge-red' : 'badge-orange'}">
              ${received ? '✓ Received' : overdue ? '⚠ Overdue' : '⏳ Pending'}
            </span>
          </td>
          <td class="no-print">
            ${overdue
              ? `<a href="../lcr_call/reminder.html?case_no=${encodeURIComponent(caseNo)}&case_year=${encodeURIComponent(caseYear)}" class="btn-link-action">
                   <i class="fa-solid fa-envelope-circle-check"></i> Send Reminder
                 </a>`
              : `<span style="font-size:0.8rem;color:var(--text-muted);">—</span>`
            }
          </td>
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
      ...noticeForms.map(d => ({ type: 'Notice Form',  icon: 'fa-envelope-open-text', color: '#22c55e', label: `Case ${d.case_no || 'Unknown'}`,        saved_at: d.saved_at })),
      ...directNotes.map(d => ({ type: 'Direct Notice',icon: 'fa-paper-plane',        color: '#a855f7', label: `Case ${d.case_no || 'Unknown'}`,        saved_at: d.saved_at })),
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
