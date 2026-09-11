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
let selectedDateStr = null; // Store ISO date format

function renderTable() {
    let html = '';
    let hasCases = false;
    
    if (!selectedDateStr) {
        recordsTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Select a date from the timeline above to view its causelist records.</td></tr>';
        return;
    }

    let listsToRender = allScrapedLists.filter(l => {
        const createdStr = new Date(l.created_at).toISOString().substring(0, 10);
        if (createdStr === selectedDateStr) return true;
        
        const targetDate = new Date(selectedDateStr);
        const monthMap = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dayStr = String(targetDate.getDate());
        const monStr = monthMap[targetDate.getMonth()];
        
        const recDate = l.date || (l.header && l.header.date) || "";
        return recDate.includes(dayStr) && recDate.includes(monStr);
    });

    if (!listsToRender || listsToRender.length === 0) {
        html = `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No causelist records found${selectedDateStr ? ' for this date' : ''}.</td></tr>`;
    } else {
        listsToRender.forEach(list => {
            const cases = list.cases || [];
            cases.forEach(c => {
                hasCases = true;
                const savedDate = new Date(list.created_at).toLocaleString();
                html += `<tr>
                    <td>${c.date || list.header.date || 'N/A'}</td>
                    <td><strong>${c.case_no}</strong></td>
                    <td>${c.judge || 'N/A'}</td>
                    <td style="color: #64748b; font-size: 0.85rem;">${savedDate}</td>
                </tr>`;
            });
        });
        if (!hasCases) {
            html = `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No FA cases printed${selectedDateStr ? ' on this date' : ' in the recent causelists'}.</td></tr>`;
        }
    }
    recordsTbody.innerHTML = html;
}

function renderTimeline() {
    const today = new Date();
    const minDate = new Date('2026-09-01T00:00:00');
    let timelineHtml = '';
    
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        
        if (d < minDate) break;

        const dateStr = d.toISOString().substring(0, 10);
        
        const monthMap = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dayStr = String(d.getDate());
        const monStr = monthMap[d.getMonth()];
        
        const record = allScrapedLists.find(l => {
            const createdStr = new Date(l.created_at).toISOString().substring(0, 10);
            if (createdStr === dateStr) return true;
            
            const recDate = l.date || (l.header && l.header.date) || "";
            if (recDate.includes(dayStr) && recDate.includes(monStr)) return true;
            return false;
        });
        
        const displayDate = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        
        const isActive = dateStr === selectedDateStr ? 'active' : '';
        
        if (record) {
            const caseCount = (record.cases || []).length;
            if (caseCount > 0) {
                timelineHtml += `
                    <div class="timeline-item status-printed ${isActive}" data-date="${dateStr}">
                        <div class="timeline-date">${displayDate}</div>
                        <div class="timeline-desc"><strong>${caseCount}</strong> FA Cases Printed</div>
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
    
    // Add click event listeners to timeline items
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const clickedDate = e.currentTarget.getAttribute('data-date');
            
            // Toggle selection: if clicking the already selected date, deselect it
            if (selectedDateStr === clickedDate) {
                selectedDateStr = null;
            } else {
                selectedDateStr = clickedDate;
            }
            
            renderTimeline(); // Re-render to update the 'active' highlight CSS
            renderTable();    // Re-render the table filtered by the selected date
        });
    });
}

async function loadRecords() {
    if (!window.PortalDB) return;
    try {
        const allLists = await window.PortalDB.getCauseLists();
        allScrapedLists = allLists.filter(l => !(l.header && l.header.head_court));
        
        renderTimeline();
        renderTable();
        
    } catch (e) {
        console.error(e);
        recordsTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ef4444;">Error loading records.</td></tr>';
        timelineGrid.innerHTML = '<div style="color: #ef4444; padding: 12px;">Error loading timeline.</div>';
    }
}


document.addEventListener('DOMContentLoaded', loadRecords);
