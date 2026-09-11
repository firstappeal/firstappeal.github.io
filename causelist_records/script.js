function showToast(msg) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.style.opacity = '1');
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

const recordsTbody = document.getElementById('recordsTbody');
const timelineGrid = document.getElementById('timelineGrid');

let allScrapedLists = [];
let selectedDateStr = null; // YYYY-MM-DD

const MONTH_MAP = {
    "Jan":0,"Feb":1,"Mar":2,"Apr":3,"May":4,"Jun":5,
    "Jul":6,"Aug":7,"Sep":8,"Oct":9,"Nov":10,"Dec":11,
    "January":0,"February":1,"March":2,"April":3,"June":5,
    "July":6,"August":7,"September":8,"October":9,"November":10,"December":11
};

/**
 * Normalizes ANY date string we might encounter in the DB to YYYY-MM-DD.
 * Handles:
 *   "03-Sep-2026"           -> "2026-09-03"
 *   "03-09-2026" (DD-MM-YYYY) -> "2026-09-03"
 *   "Thursday 3rd September, 2026" -> "2026-09-03"
 *   "Friday 11th September, 2026"  -> "2026-09-11"
 */
function normalizeDateStr(raw) {
    if (!raw) return null;
    const s = raw.trim();

    // Format: DD-Mon-YYYY  e.g. "03-Sep-2026"
    let m = s.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
    if (m) {
        const day = parseInt(m[1], 10);
        const mon = MONTH_MAP[m[2]];
        const yr  = parseInt(m[3], 10);
        if (mon !== undefined) {
            return `${yr}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        }
    }

    // Format: DD-MM-YYYY  e.g. "03-09-2026"
    m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) {
        const day = parseInt(m[1], 10);
        const mon = parseInt(m[2], 10) - 1;
        const yr  = parseInt(m[3], 10);
        if (mon >= 0 && mon <= 11 && day >= 1 && day <= 31) {
            return `${yr}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        }
    }

    // Format: "Thursday 3rd September, 2026"
    m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)[,\s]+(\d{4})\b/);
    if (m) {
        const day = parseInt(m[1], 10);
        const mon = MONTH_MAP[m[2]];
        const yr  = parseInt(m[3], 10);
        if (mon !== undefined && yr > 2000) {
            return `${yr}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        }
    }

    return null;
}

function renderTable() {
    let html = '';
    let hasCases = false;

    const searchInput = document.getElementById('caseSearch');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    if (searchQuery) {
        allScrapedLists.forEach(list => {
            (list.cases || []).forEach(c => {
                if (c.case_no && c.case_no.toLowerCase().includes(searchQuery)) {
                    hasCases = true;
                    html += `<tr>
                        <td>${list._normalizedDate || 'N/A'}</td>
                        <td><strong>${c.case_no}</strong></td>
                        <td>${c.judge || 'N/A'}</td>
                    </tr>`;
                }
            });
        });
        if (!hasCases) {
            html = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No matching cases found for "${searchQuery}".</td></tr>`;
        }
        recordsTbody.innerHTML = html;
        return;
    }

    if (!selectedDateStr) {
        recordsTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">Select a date from the timeline above to view its causelist records.</td></tr>';
        return;
    }

    const listsToRender = allScrapedLists.filter(l => l._normalizedDate === selectedDateStr);

    if (!listsToRender.length) {
        html = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No causelist records found for this date.</td></tr>`;
    } else {
        listsToRender.forEach(list => {
            (list.cases || []).forEach(c => {
                hasCases = true;
                html += `<tr>
                    <td>${list._normalizedDate}</td>
                    <td><strong>${c.case_no}</strong></td>
                    <td>${c.judge || 'N/A'}</td>
                </tr>`;
            });
        });
        if (!hasCases) {
            html = `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No FA cases printed on this date.</td></tr>`;
        }
    }
    recordsTbody.innerHTML = html;
}

function renderTimeline() {
    const today = new Date();
    const minDate = new Date(2026, 8, 1);
    let timelineHtml = '';

    for (let i = 0; i < 30; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        if (d < minDate) break;

        const yr  = d.getFullYear();
        const mon = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yr}-${mon}-${day}`;

        let totalCases = 0;
        let hasRecord = false;
        allScrapedLists.forEach(l => {
            if (l._normalizedDate === dateStr) {
                hasRecord = true;
                totalCases += (l.cases || []).length;
            }
        });

        const displayDate = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        const isActive = dateStr === selectedDateStr ? 'active' : '';

        if (hasRecord) {
            if (totalCases > 0) {
                timelineHtml += `
                    <div class="timeline-item status-printed ${isActive}" data-date="${dateStr}">
                        <div class="timeline-date">${displayDate}</div>
                        <div class="timeline-desc"><strong>${totalCases}</strong> FA Cases Printed</div>
                    </div>`;
            } else {
                timelineHtml += `
                    <div class="timeline-item status-none ${isActive}" data-date="${dateStr}">
                        <div class="timeline-date">${displayDate}</div>
                        <div class="timeline-desc">No FA Cases Printed</div>
                    </div>`;
            }
        } else {
            timelineHtml += `
                <div class="timeline-item status-missing ${isActive}" data-date="${dateStr}">
                    <div class="timeline-date">${displayDate}</div>
                    <div class="timeline-desc">Causelist Not Printed</div>
                </div>`;
        }
    }
    timelineGrid.innerHTML = timelineHtml;

    document.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const clickedDate = e.currentTarget.getAttribute('data-date');
            selectedDateStr = (selectedDateStr === clickedDate) ? null : clickedDate;
            renderTimeline();
            renderTable();
        });
    });
}

async function loadRecords() {
    if (!window.PortalDB) return;
    try {
        const allLists = await window.PortalDB.getCauseLists();
        const rawScraped = allLists.filter(l => !(l.header && l.header.head_court));

        // Normalize each record's date and deduplicate — keep record with most cases per date
        const byDate = new Map();
        for (const l of rawScraped) {
            const rawDate = l.date || (l.header && l.header.date) || "";
            const norm = normalizeDateStr(rawDate);
            l._normalizedDate = norm;
            if (!norm) continue;

            if (!byDate.has(norm)) {
                byDate.set(norm, l);
            } else {
                const existing = byDate.get(norm);
                if ((l.cases || []).length > (existing.cases || []).length) {
                    byDate.set(norm, l);
                }
            }
        }

        allScrapedLists = Array.from(byDate.values());

        renderTimeline();
        renderTable();

    } catch (e) {
        console.error(e);
        recordsTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#ef4444;">Error loading records.</td></tr>';
        timelineGrid.innerHTML = '<div style="color:#ef4444;padding:12px;">Error loading timeline.</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadRecords();
    const searchInput = document.getElementById('caseSearch');
    if (searchInput) {
        searchInput.addEventListener('input', renderTable);
    }
});
