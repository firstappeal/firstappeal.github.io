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

const updateBtn = document.getElementById('updateBtn');
const recordsTbody = document.getElementById('recordsTbody');
const timelineGrid = document.getElementById('timelineGrid');

async function loadRecords() {
    if (!window.PortalDB) return;
    try {
        const lists = await window.PortalDB.getCauseLists();
        
        // --- Render Detailed Table ---
        let html = '';
        let hasCases = false;
        if (!lists || lists.length === 0) {
            html = '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No causelist records found.</td></tr>';
        } else {
            lists.forEach(list => {
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
                html = '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No FA cases printed in the recent causelists.</td></tr>';
            }
        }
        recordsTbody.innerHTML = html;

        // --- Render 30-Day Timeline ---
        const today = new Date();
        let timelineHtml = '';
        
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().substring(0, 10); // YYYY-MM-DD
            
            // Find a record that corresponds to this date
            // The python script creates records on the day they are fetched (created_at).
            const record = lists.find(l => {
                const createdStr = new Date(l.created_at).toISOString().substring(0, 10);
                return createdStr === dateStr;
            });
            
            const displayDate = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            
            if (record) {
                const caseCount = (record.cases || []).length;
                if (caseCount > 0) {
                    timelineHtml += `
                        <div class="timeline-item status-printed">
                            <div class="timeline-date">${displayDate}</div>
                            <div class="timeline-desc"><strong>${caseCount}</strong> FA Cases Printed</div>
                        </div>`;
                } else {
                    timelineHtml += `
                        <div class="timeline-item status-none">
                            <div class="timeline-date">${displayDate}</div>
                            <div class="timeline-desc">No FA Cases Printed</div>
                        </div>`;
                }
            } else {
                timelineHtml += `
                    <div class="timeline-item status-missing">
                        <div class="timeline-date">${displayDate}</div>
                        <div class="timeline-desc">Causelist Not Printed</div>
                    </div>`;
            }
        }
        timelineGrid.innerHTML = timelineHtml;
        
    } catch (e) {
        console.error(e);
        recordsTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ef4444;">Error loading records.</td></tr>';
        timelineGrid.innerHTML = '<div style="color: #ef4444; padding: 12px;">Error loading timeline.</div>';
    }
}

updateBtn.addEventListener('click', () => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.includes('github.io')) {
        const username = hostname.split('.')[0];
        const repo = pathname.split('/')[1];
        const actionsUrl = `https://github.com/${username}/${repo}/actions/workflows/causelist_updater.yml`;
        
        showToast('Redirecting to GitHub Actions to trigger the update manually...');
        setTimeout(() => {
            window.open(actionsUrl, '_blank');
        }, 1500);
    } else {
        alert('Because the portal is hosted on GitHub Pages, the update process is managed by GitHub Actions.\n\nTo update manually, go to your GitHub Repository -> Actions tab -> Daily Causelist Updater -> Run workflow.');
    }
});

document.addEventListener('DOMContentLoaded', loadRecords);
