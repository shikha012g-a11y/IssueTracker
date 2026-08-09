const API_BASE_URL = '/api/issues';

let currentModule = 'ALL';
let selectedMonths = [];
let allIssuesData = [];
let filteredIssuesData = [];
let selectedRowIds = new Set();
let currentPage = 1;
const itemsPerPage = 10;

let statusChart = null;
let moduleChart = null;

document.addEventListener('DOMContentLoaded', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const repInput = document.getElementById('formReportedDate');
    const clsInput = document.getElementById('formClosureDate');

    if (repInput) repInput.max = todayStr;
    if (clsInput) clsInput.max = todayStr;

    fetchIssues();
    fetchSummary();
});

// Month Filter Toggle
function toggleMonth(monthNum) {
    const idx = selectedMonths.indexOf(monthNum);
    if (idx > -1) selectedMonths.splice(idx, 1);
    else selectedMonths.push(monthNum);

    document.querySelectorAll('.month-pill').forEach(pill => {
        const m = parseInt(pill.getAttribute('data-month'));
        if (m === monthNum) pill.classList.toggle('active');
    });

    applyFilters();
}

function clearMonthFilters() {
    selectedMonths = [];
    document.querySelectorAll('.month-pill').forEach(pill => pill.classList.remove('active'));
    applyFilters();
}

// Module Selector
function selectModule(moduleName) {
    currentModule = moduleName;
    document.querySelectorAll('.module-card').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(moduleName) || (moduleName === 'ALL' && btn.innerText.includes('All')));
    });

    document.getElementById('activeFilterBadge').innerText = moduleName === 'ALL' ? 'All Modules' : moduleName;
    document.getElementById('tableHeading').innerText = moduleName === 'ALL' ? 'All Module Issues Data (INFRA_CHANNELS)' : `${moduleName} Module Issues Data`;

    applyFilters();
}

// Central Filter Application
a// Case-Insensitive Central Filter Logic
 async function applyFilters() {
     const entity = (document.getElementById('filterEntity')?.value || '').trim().toLowerCase();
     const env = (document.getElementById('filterEnv')?.value || '').trim().toLowerCase();
     const category = (document.getElementById('filterClosureCategory')?.value || '').trim().toLowerCase();
     const assignee = (document.getElementById('filterAssignee')?.value || '').trim();

     let url = `${API_BASE_URL}?`;
     if (currentModule !== 'ALL') url += `module=${encodeURIComponent(currentModule)}&`;
     if (selectedMonths.length > 0) url += `months=${selectedMonths.join(',')}&`;
     if (assignee) url += `assignee=${encodeURIComponent(assignee)}&`;

     try {
         const res = await fetch(url);
         if (res.ok) {
             allIssuesData = await res.json();

             // Case-Insensitive Client-side Filtering
             filteredIssuesData = allIssuesData.filter(item => {
                 let itemEntity = (item.entity || '').toLowerCase();
                 let itemEnv = (item.environment || '').toLowerCase();
                 let itemCat = (item.closureCategory || '').toLowerCase();

                 let matchesEntity = !entity || itemEntity === entity;
                 let matchesEnv = !env || itemEnv === env || itemEnv.includes(env);
                 let matchesCat = !category || itemCat === category;

                 return matchesEntity && matchesEnv && matchesCat;
             });

             currentPage = 1;
             renderPaginatedTable();
             updateCharts(filteredIssuesData);
         }
     } catch (err) {
         console.warn('API Error');
     }

     fetchSummary();
 }

 // Case-Insensitive Quick Search
 function filterTableBySearch() {
     const query = document.getElementById('searchInput').value.toLowerCase().trim();
     filteredIssuesData = allIssuesData.filter(i =>
         (i.issueDescription && i.issueDescription.toLowerCase().includes(query)) ||
         (i.tolId && i.tolId.toLowerCase().includes(query)) ||
         (i.assignee && i.assignee.toLowerCase().includes(query)) ||
         (i.coAssignee && i.coAssignee.toLowerCase().includes(query)) ||
         (i.module && i.module.toLowerCase().includes(query)) ||
         (i.entity && i.entity.toLowerCase().includes(query)) ||
         (i.environment && i.environment.toLowerCase().includes(query))
     );
     currentPage = 1;
     renderPaginatedTable();
 }

async function fetchSummary() {
    let url = `${API_BASE_URL}/summary?`;
    if (currentModule !== 'ALL') url += `module=${encodeURIComponent(currentModule)}&`;
    if (selectedMonths.length > 0) url += `months=${selectedMonths.join(',')}&`;

    try {
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            updateSummaryCards(data.matrix);
        }
    } catch (err) {
        console.warn('Summary Fetch Error');
    }
}

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

// Table Checkbox Operations
function toggleSelectAll(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.checked = isChecked;
        const id = parseInt(cb.getAttribute('data-id'));
        if (isChecked) selectedRowIds.add(id);
        else selectedRowIds.delete(id);
    });
}

function toggleRowSelect(id, checkbox) {
    if (checkbox.checked) selectedRowIds.add(id);
    else selectedRowIds.delete(id);
}

function renderPaginatedTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const total = filteredIssuesData.length;
    const totalPages = Math.ceil(total / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, total);
    const pageItems = filteredIssuesData.slice(startIdx, endIdx);

    document.getElementById('pageInfo').innerText = `Showing ${total === 0 ? 0 : startIdx + 1} to ${endIdx} of ${total} entries`;
    document.getElementById('currentPageNum').innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;

    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="14" style="text-align:center; color:#94a3b8;">No issue records found.</td></tr>`;
        return;
    }

    pageItems.forEach(item => {
        let statusClass = 'status-closed';
        if (item.issueStatus === 'Open with Bank') statusClass = 'status-bank';
        if (item.issueStatus === 'Open with Infosys and L3') statusClass = 'status-infosys';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${item.id}" ${selectedRowIds.has(item.id) ? 'checked' : ''} onclick="toggleRowSelect(${item.id}, this)"></td>
            <td><strong>${item.module}</strong></td>
            <td>${item.entity}</td>
            <td>${item.environment || 'UAT'}</td>
            <td>${item.reportedDate || '-'}</td>
            <td>${item.issueDescription || '-'}</td>
            <td>${item.l2Analysis || '-'}</td>
            <td><code>${item.tolId || '-'}</code></td>
            <td>${item.l3UpdatesRemarks || '-'}</td>
            <td><span class="status-badge ${statusClass}">${item.issueStatus}</span></td>
            <td>${item.closureCategory || '-'}</td>
            <td>${item.closureDate || '-'}</td>
            <td>${item.assignee || '-'}${item.coAssignee ? ' / ' + item.coAssignee : ''}</td>
            <td>
                <button style="background:none; border:none; color:#60a5fa; cursor:pointer; margin-right:8px;" onclick="editIssue(${item.id})">✏️</button>
                <button style="background:none; border:none; color:#ef4444; cursor:pointer;" onclick="deleteIssue(${item.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function changePage(delta) {
    currentPage += delta;
    renderPaginatedTable();
}

function filterTableBySearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    filteredIssuesData = allIssuesData.filter(i =>
        (i.issueDescription && i.issueDescription.toLowerCase().includes(query)) ||
        (i.tolId && i.tolId.toLowerCase().includes(query)) ||
        (i.assignee && i.assignee.toLowerCase().includes(query)) ||
        (i.module && i.module.toLowerCase().includes(query))
    );
    currentPage = 1;
    renderPaginatedTable();
}

function isCompleteDate(dateStr) {
    if (!dateStr || dateStr.length !== 10) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[0], 10);
    return year >= 2000 && year <= 2100;
}

function validateDates() {
    const repInput = document.getElementById('formReportedDate');
    const clsInput = document.getElementById('formClosureDate');
    const statusInput = document.getElementById('formStatus');

    const repVal = repInput.value;
    const clsVal = clsInput.value;
    const statusVal = statusInput.value;
    const todayStr = new Date().toISOString().split('T')[0];

    clearDateError();

    if (!repVal) return showDateError("Reported Date is required.");
    if (isCompleteDate(repVal) && repVal > todayStr) return showDateError("Reported Date cannot be a future date.");
    if (statusVal === 'Closed' && !clsVal) return showDateError("Closure Date is required when Issue Status is 'Closed'.");

    if (clsVal && isCompleteDate(clsVal) && isCompleteDate(repVal)) {
        if (clsVal > todayStr) return showDateError("Closure Date cannot be a future date.");
        if (clsVal < repVal) return showDateError("Closure Date cannot be earlier than Reported Date.");
    }

    return true;
}

// Closure Category is Enabled for ALL Issue Statuses
function handleStatusChange() {
    const statusVal = document.getElementById('formStatus').value;
    const closureDateInput = document.getElementById('formClosureDate');
    const closureCatInput = document.getElementById('formClosureCategory');

    // Always keep closure category enabled for all statuses
    closureCatInput.disabled = false;

    if (statusVal !== 'Closed') {
        closureDateInput.value = '';
        closureDateInput.disabled = true;
    } else {
        closureDateInput.disabled = false;
    }
    clearDateError();
}

function showDateError(message) {
    let errorBox = document.getElementById('formErrorBanner');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.id = 'formErrorBanner';
        errorBox.className = 'error-banner';
        const form = document.getElementById('issueForm');
        form.insertBefore(errorBox, form.firstChild);
    }
    errorBox.innerHTML = `⚠️ <strong>Validation Error:</strong> ${message}`;
    errorBox.style.display = 'block';
    return false;
}

function clearDateError() {
    const errorBox = document.getElementById('formErrorBanner');
    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.innerHTML = '';
    }
}

function openModal() {
    document.getElementById('issueForm').reset();
    document.getElementById('formId').value = '';
    document.getElementById('formTitle').innerText = 'Add New Issue Details';
    clearDateError();

    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('formReportedDate').max = todayStr;
    document.getElementById('formClosureDate').max = todayStr;

    handleStatusChange();
    document.getElementById('issueModal').classList.add('show');
}

function closeModal() {
    document.getElementById('issueModal').classList.remove('show');
}

function editIssue(id) {
    const item = allIssuesData.find(i => i.id === id);
    if (!item) return;

    clearDateError();
    document.getElementById('formId').value = item.id;
    document.getElementById('formModule').value = item.module;
    document.getElementById('formEntity').value = item.entity;
    document.getElementById('formEnv').value = item.environment || 'UAT';
    document.getElementById('formReportedDate').value = item.reportedDate;
    document.getElementById('formDescription').value = item.issueDescription;
    document.getElementById('formL2').value = item.l2Analysis || '';
    document.getElementById('formTolId').value = item.tolId || '';
    document.getElementById('formStatus').value = item.issueStatus;
    document.getElementById('formL3').value = item.l3UpdatesRemarks || '';
    document.getElementById('formClosureCategory').value = item.closureCategory || '';
    document.getElementById('formClosureDate').value = item.closureDate || '';
    document.getElementById('formAssignee').value = item.assignee || '';
    document.getElementById('formCoAssignee').value = item.coAssignee || '';

    handleStatusChange();
    document.getElementById('formTitle').innerText = 'Edit Issue Details (ID: ' + item.id + ')';
    document.getElementById('issueModal').classList.add('show');
}

async function saveIssue(e) {
    e.preventDefault();

    if (!validateDates()) {
        return false;
    }

    const rawId = document.getElementById('formId').value;
    const isEdit = rawId && rawId !== '' && rawId !== 'undefined' && rawId !== 'null';

    const closureDateVal = document.getElementById('formClosureDate').value;
    const closureCatVal = document.getElementById('formClosureCategory').value;
    const assigneeVal = document.getElementById('formAssignee').value;
    const coAssigneeVal = document.getElementById('formCoAssignee').value;

    const issueData = {
        module: document.getElementById('formModule').value,
        entity: document.getElementById('formEntity').value,
        environment: document.getElementById('formEnv').value || 'UAT',
        reportedDate: document.getElementById('formReportedDate').value,
        issueDescription: document.getElementById('formDescription').value,
        l2Analysis: document.getElementById('formL2').value || null,
        tolId: document.getElementById('formTolId').value || null,
        issueStatus: document.getElementById('formStatus').value,
        l3UpdatesRemarks: document.getElementById('formL3').value || null,
        closureCategory: closureCatVal ? closureCatVal : null,
        closureDate: closureDateVal ? closureDateVal : null,
        assignee: assigneeVal ? assigneeVal : null,
        coAssignee: coAssigneeVal ? coAssigneeVal : null
    };

    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `${API_BASE_URL}/${rawId}` : API_BASE_URL;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issueData)
        });

        if (res.ok) {
            closeModal();
            applyFilters();
        } else {
            const errorText = await res.text();
            showDateError(`Server Error (${res.status}): Unable to save issue.`);
        }
    } catch (err) {
        showDateError('Backend server connection error.');
    }
}

async function deleteIssue(id) {
    if (!confirm('Are you sure you want to delete this issue record?')) return;
    try {
        await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
        applyFilters();
    } catch (err) {
        alert('Failed to delete issue.');
    }
}

function exportToCSV() {
    if (filteredIssuesData.length === 0) {
        alert('No data available to export.');
        return;
    }

    const headers = ["ID", "Module", "Entity", "Environment", "Reported Date", "Issue Description", "L2 Analysis", "TOL ID", "L3 Updates", "Status", "Closure Category", "Closure Date", "Assignee", "Co-Assignee"];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

    filteredIssuesData.forEach(row => {
        const rowData = [
            row.id,
            `"${row.module || ''}"`,
            `"${row.entity || ''}"`,
            `"${row.environment || ''}"`,
            `"${row.reportedDate || ''}"`,
            `"${(row.issueDescription || '').replace(/"/g, '""')}"`,
            `"${(row.l2Analysis || '').replace(/"/g, '""')}"`,
            `"${row.tolId || ''}"`,
            `"${(row.l3UpdatesRemarks || '').replace(/"/g, '""')}"`,
            `"${row.issueStatus || ''}"`,
            `"${row.closureCategory || ''}"`,
            `"${row.closureDate || ''}"`,
            `"${row.assignee || ''}"`,
            `"${row.coAssignee || ''}"`
        ];
        csvContent += rowData.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Infra_Channels_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// Dropdown Month Filter Handler
function handleMonthChange() {
    const selectedVal = document.getElementById('monthFilter').value;
    if (selectedVal === "") {
        selectedMonths = [];
    } else {
        selectedMonths = [parseInt(selectedVal, 10)];
    }
    applyFilters();
}

// Reset All Filters (including month dropdown)
function resetAllFilters() {
    if (document.getElementById('monthFilter')) {
        document.getElementById('monthFilter').value = '';
    }
    document.getElementById('filterEntity').value = '';
    document.getElementById('filterEnv').value = '';
    document.getElementById('filterClosureCategory').value = '';
    document.getElementById('filterAssignee').value = '';
    document.getElementById('searchInput').value = '';
    selectedMonths = [];
    selectModule('ALL');
}

function updateCharts(data) {
    if (typeof Chart === 'undefined') return;

    const closedCount = data.filter(i => i.issueStatus === 'Closed').length;
    const bankCount = data.filter(i => i.issueStatus === 'Open with Bank').length;
    const infCount = data.filter(i => i.issueStatus === 'Open with Infosys and L3').length;

    const ctxPie = document.getElementById('statusPieChart')?.getContext('2d');
    if (ctxPie) {
        if (statusChart) statusChart.destroy();
        statusChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['Closed', 'Open with Bank', 'Open with Infosys & L3'],
                datasets: [{
                    data: [closedCount, bankCount, infCount],
                    backgroundColor: ['#10b981', '#f59e0b', '#3b82f6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }
            }
        });
    }

    const modulesList = ['Channels', 'Infra', 'Trade Finance', 'GBM', 'EOD/EOWD', 'Loans', 'Deposits', 'CRM', 'Finacle Payments', 'FAS'];
    const moduleCounts = modulesList.map(m => data.filter(i => i.module === m).length);

    const ctxBar = document.getElementById('moduleBarChart')?.getContext('2d');
    if (ctxBar) {
        if (moduleChart) moduleChart.destroy();
        moduleChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: modulesList,
                datasets: [{
                    label: 'Total Issues',
                    data: moduleCounts,
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 10 } } },
                    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, beginAtZero: true }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}