const API_BASE_URL = '/api/issues';

// State management
let currentModule = 'ALL';
let currentMonth = '';
let issuesData = [];

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchIssues();
    fetchSummary();
});

// Fetch All Issues from Spring Boot API (with fallback mock mode if backend offline)
async function fetchIssues() {
    try {
        let url = `${API_BASE_URL}?`;
        if (currentModule !== 'ALL') url += `module=${encodeURIComponent(currentModule)}&`;
        if (currentMonth) url += `month=${currentMonth}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('API offline');
        issuesData = await res.json();
        renderTable(issuesData);
    } catch (err) {
        console.warn('Backend server unavailable. Operating in local demo mode.');
        loadMockData();
    }
}

// Fetch Metrics Summary Breakdown Matrix
async function fetchSummary() {
    try {
        let url = `${API_BASE_URL}/summary?`;
        if (currentModule !== 'ALL') url += `module=${encodeURIComponent(currentModule)}&`;
        if (currentMonth) url += `month=${currentMonth}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Summary API offline');
        const data = await res.json();
        updateSummaryCards(data.matrix);
    } catch (err) {
        updateSummaryCardsFromLocal();
    }
}

// Render Main Table
function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:#94a3b8;">No issue records found for selected filters.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');

        let statusClass = 'status-closed';
        if (item.issueStatus === 'Open with Bank') statusClass = 'status-bank';
        if (item.issueStatus === 'Open with Infosys and L3') statusClass = 'status-infosys';

        tr.innerHTML = `
            <td><strong>${item.module}</strong></td>
            <td>${item.entity}</td>
            <td>${item.environment || 'PROD'}</td>
            <td>${item.reportedDate || '-'}</td>
            <td>${item.issueDescription || '-'}</td>
            <td>${item.l2Analysis || '-'}</td>
            <td><code>${item.tolId || '-'}</code></td>
            <td>${item.l3UpdatesRemarks || '-'}</td>
            <td><span class="status-badge ${statusClass}">${item.issueStatus}</span></td>
            <td>${item.closureDate || '-'}</td>
            <td>${item.assignee || '-'}</td>
            <td>
                <button style="background:none; border:none; color:#ef4444; cursor:pointer;" onclick="deleteIssue(${item.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Update Metrics Summary Header
function updateSummaryCards(matrix) {
    matrix.forEach(row => {
        if (row.category === 'Closed') {
            document.getElementById('closedTotal').innerText = row.totalCount;
            document.getElementById('closedDom').innerText = row.domesticCount;
            document.getElementById('closedRrb').innerText = row.rrbCount;
            document.getElementById('closedOvs').innerText = row.overseasCount;
        } else if (row.category === 'Open with Bank') {
            document.getElementById('bankTotal').innerText = row.totalCount;
            document.getElementById('bankDom').innerText = row.domesticCount;
            document.getElementById('bankRrb').innerText = row.rrbCount;
            document.getElementById('bankOvs').innerText = row.overseasCount;
        } else if (row.category === 'Open with Infosys and L3') {
            document.getElementById('infTotal').innerText = row.totalCount;
            document.getElementById('infDom').innerText = row.domesticCount;
            document.getElementById('infRrb').innerText = row.rrbCount;
            document.getElementById('infOvs').innerText = row.overseasCount;
        }
    });
}

// Handle Module Selector Click
function selectModule(moduleName) {
    currentModule = moduleName;
    document.querySelectorAll('.module-card').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(moduleName) || (moduleName === 'ALL' && btn.innerText.includes('All')));
    });

    document.getElementById('activeFilterBadge').innerText = moduleName === 'ALL' ? 'All Modules' : moduleName;
    document.getElementById('tableHeading').innerText = moduleName === 'ALL' ? 'All Module Issues Data (INFRA_CHANNELS)' : `${moduleName} Module Issues Data`;

    fetchIssues();
    fetchSummary();
}

// Handle Month Dropdown Change
function handleMonthChange() {
    currentMonth = document.getElementById('monthFilter').value;
    fetchIssues();
    fetchSummary();
}

// Search Filter
function filterTable() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = issuesData.filter(i =>
        (i.issueDescription && i.issueDescription.toLowerCase().includes(query)) ||
        (i.tolId && i.tolId.toLowerCase().includes(query)) ||
        (i.assignee && i.assignee.toLowerCase().includes(query)) ||
        (i.module && i.module.toLowerCase().includes(query))
    );
    renderTable(filtered);
}

// Modal Form Controls
function openModal() {
    document.getElementById('issueForm').reset();
    document.getElementById('issueModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('issueModal').style.display = 'none';
}

// Save Issue (Write all data form into DB)
async function saveIssue(e) {
    e.preventDefault();

    const newIssue = {
        module: document.getElementById('formModule').value,
        entity: document.getElementById('formEntity').value,
        environment: document.getElementById('formEnv').value,
        reportedDate: document.getElementById('formReportedDate').value,
        issueDescription: document.getElementById('formDescription').value,
        l2Analysis: document.getElementById('formL2').value,
        tolId: document.getElementById('formTolId').value,
        issueStatus: document.getElementById('formStatus').value,
        l3UpdatesRemarks: document.getElementById('formL3').value,
        closureDate: document.getElementById('formClosureDate').value || null,
        closureCategory: document.getElementById('formClosureCategory').value || null,
        assignee: document.getElementById('formAssignee').value || null,
        coAssignee: document.getElementById('formCoAssignee').value || null
    };

    try {
        const res = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newIssue)
        });

        if (res.ok) {
            closeModal();
            fetchIssues();
            fetchSummary();
        } else {
            alert('Failed to save issue to server.');
        }
    } catch (err) {
        // Fallback for offline demo mode
        newIssue.id = Date.now();
        issuesData.unshift(newIssue);
        renderTable(issuesData);
        updateSummaryCardsFromLocal();
        closeModal();
    }
}

// Delete Issue
async function deleteIssue(id) {
    if (!confirm('Are you sure you want to delete this issue record?')) return;
    try {
        await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
        fetchIssues();
        fetchSummary();
    } catch (err) {
        issuesData = issuesData.filter(i => i.id !== id);
        renderTable(issuesData);
        updateSummaryCardsFromLocal();
    }
}

// Demo Sample Data Fallback
function loadMockData() {
    issuesData = [
        { id: 1, module: 'Channels', entity: 'Domestic', environment: 'PROD', reportedDate: '2026-06-24', issueDescription: 'Domestic IMPS Sample RRN skipped response', l2Analysis: 'Bank team shared RRNs for declined 911 transactions', tolId: 'TOL-6178201', l3UpdatesRemarks: 'Checked CBC logs and shared timing windows', issueStatus: 'Closed', closureDate: '2026-06-29', assignee: 'Barath' },
        { id: 2, module: 'Infra', entity: 'RRB', environment: 'PROD', reportedDate: '2026-07-15', issueDescription: 'RE: IMPS Decline RRN timeout host 10.192.238.218', l2Analysis: 'Connection timed out on port 51006', tolId: 'TOL-992811', l3UpdatesRemarks: 'Details shared over mail with bank team', issueStatus: 'Open with Bank', closureDate: null, assignee: 'Arun' },
        { id: 3, module: 'Trade Finance', entity: 'Overseas', environment: 'PROD', reportedDate: '2026-07-24', issueDescription: 'RE: RRN for declined IMPS run session terminated', l2Analysis: 'Observed in unipay at line of session', tolId: 'TOL-771120', l3UpdatesRemarks: 'Under review by L3 team', issueStatus: 'Open with Infosys and L3', closureDate: null, assignee: 'Barath' }
    ];
    renderTable(issuesData);
    updateSummaryCardsFromLocal();
}

function updateSummaryCardsFromLocal() {
    let closed = { dom: 0, rrb: 0, ovs: 0, tot: 0 };
    let bank = { dom: 0, rrb: 0, ovs: 0, tot: 0 };
    let inf = { dom: 0, rrb: 0, ovs: 0, tot: 0 };

    issuesData.forEach(item => {
        if (currentModule !== 'ALL' && item.module !== currentModule) return;

        let target = null;
        if (item.issueStatus === 'Closed') target = closed;
        else if (item.issueStatus === 'Open with Bank') target = bank;
        else if (item.issueStatus === 'Open with Infosys and L3') target = inf;

        if (target) {
            target.tot++;
            if (item.entity === 'Domestic') target.dom++;
            if (item.entity === 'RRB') target.rrb++;
            if (item.entity === 'Overseas') target.ovs++;
        }
    });

    document.getElementById('closedTotal').innerText = closed.tot;
    document.getElementById('closedDom').innerText = closed.dom;
    document.getElementById('closedRrb').innerText = closed.rrb;
    document.getElementById('closedOvs').innerText = closed.ovs;

    document.getElementById('bankTotal').innerText = bank.tot;
    document.getElementById('bankDom').innerText = bank.dom;
    document.getElementById('bankRrb').innerText = bank.rrb;
    document.getElementById('bankOvs').innerText = bank.ovs;

    document.getElementById('infTotal').innerText = inf.tot;
    document.getElementById('infDom').innerText = inf.dom;
    document.getElementById('infRrb').innerText = inf.rrb;
    document.getElementById('infOvs').innerText = inf.ovs;
}