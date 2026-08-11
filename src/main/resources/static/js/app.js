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
});

// Helper: Robust Module Matcher (Syncs Channels, ADC Channels, Infra, EOD/BOD, etc.)
function isModuleMatch(issueModule, targetKey) {
    const itemMod = (issueModule || '').trim().toLowerCase();
    const target = (targetKey || '').trim().toLowerCase();

    if (!itemMod || !target) return false;
    if (target === 'all') return true;

    if (target.includes('channel')) {
        return itemMod.includes('channel');
    }
    if (target.includes('infra')) {
        return itemMod.includes('infra');
    }
    if (target.includes('eod') || target.includes('bod') || target.includes('eowd')) {
        return itemMod.includes('eod') || itemMod.includes('bod') || itemMod.includes('eowd');
    }
    if (target.includes('finacle') || target.includes('payment')) {
        return itemMod.includes('finacle') || itemMod.includes('payment');
    }
    if (target.includes('trade')) {
        return itemMod.includes('trade');
    }

    return itemMod.includes(target) || target.includes(itemMod);
}

// Helper: Flexible Entity Classifier
function getNormalizedEntity(item) {
    const entity = (item.entity || '').trim().toUpperCase();
    const env = (item.environment || '').trim().toUpperCase();

    if (entity.includes('RRB') || env.includes('RRB') ||
        entity.includes('HGB') || entity.includes('PGB') || entity.includes('MGB') ||
        entity.includes('HMGB') || entity.includes('AGB') || entity.includes('BGB') ||
        entity.includes('MRB') || entity.includes('TGB')) {
        return 'RRB';
    }
    if (entity.includes('OVERSEAS') || env.includes('OVERSEAS')) {
        return 'Overseas';
    }
    return 'Domestic';
}

// Helper: Status Classifier
function isClosedStatus(status) {
    return (status || '').toLowerCase().includes('closed');
}
function isOpenBankStatus(status) {
    return (status || '').toLowerCase().includes('bank');
}
function isOpenInfosysStatus(status) {
    const s = (status || '').toLowerCase();
    return s.includes('infosys') || s.includes('l3');
}

// Navigation Handler
function selectModule(moduleName) {
    currentModule = moduleName;

    document.querySelectorAll('.module-card').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(moduleName) || (moduleName === 'ALL' && btn.innerText.includes('All Modules')));
    });

    const monthCountSection = document.getElementById('monthCountPageSection');
    const tableSection = document.getElementById('issuesTableSection');
    const chartsSection = document.getElementById('chartsSection');

    if (moduleName === 'MONTH_COUNT') {
        monthCountSection.style.display = 'block';
        tableSection.style.display = 'none';
        chartsSection.style.display = 'none';
        document.getElementById('activeFilterBadge').innerText = 'Month Count View';
        recalculateAllSummaryTables(allIssuesData);
    } else {
        monthCountSection.style.display = 'none';
        tableSection.style.display = 'block';
        chartsSection.style.display = 'grid';

        document.getElementById('activeFilterBadge').innerText = moduleName === 'ALL' ? 'All Modules' : moduleName;
        document.getElementById('tableHeading').innerText = moduleName === 'ALL' ? 'All Module Issues Data' : `${moduleName} Module Issues Data`;

        applyFilters();
    }
}

function handleMonthCountFilterChange() {
    const selectedVal = document.getElementById('monthCountFilter').value;
    if (document.getElementById('monthFilter')) {
        document.getElementById('monthFilter').value = selectedVal;
    }
    selectedMonths = selectedVal === "" ? [] : [parseInt(selectedVal, 10)];
    recalculateAllSummaryTables(allIssuesData);
}

function handleMonthChange() {
    const selectedVal = document.getElementById('monthFilter').value;
    if (document.getElementById('monthCountFilter')) {
        document.getElementById('monthCountFilter').value = selectedVal;
    }
    selectedMonths = selectedVal === "" ? [] : [parseInt(selectedVal, 10)];

    if (currentModule === 'MONTH_COUNT') {
        recalculateAllSummaryTables(allIssuesData);
    } else {
        applyFilters();
    }
}

async function fetchIssues() {
    try {
        const res = await fetch(`${API_BASE_URL}`);
        if (res.ok) {
            allIssuesData = await res.json();
            applyFilters();
            recalculateAllSummaryTables(allIssuesData);
        }
    } catch (err) {
        console.warn('API Error');
    }
}

aasync function applyFilters() {
     const entity = (document.getElementById('filterEntity')?.value || '').trim().toLowerCase();
     const env = (document.getElementById('filterEnv')?.value || '').trim().toLowerCase();
     const status = (document.getElementById('filterStatus')?.value || '').trim().toLowerCase();
     const category = (document.getElementById('filterClosureCategory')?.value || '').trim().toLowerCase();
     const assignee = (document.getElementById('filterAssignee')?.value || '').trim();

     let dataset = [...allIssuesData];

     // Filter by Module
     if (currentModule !== 'ALL' && currentModule !== 'MONTH_COUNT') {
         dataset = dataset.filter(i => isModuleMatch(i.module, currentModule));
     }

     // Filter by Month
     if (selectedMonths.length > 0) {
         dataset = dataset.filter(i => {
             if (!i.reportedDate) return false;
             const m = parseInt(i.reportedDate.split('-')[1], 10);
             return selectedMonths.includes(m);
         });
     }

     // Filter by Entity, Environment, Status, Closure Category, Assignee
     filteredIssuesData = dataset.filter(item => {
         let itemEntity = (item.entity || '').toLowerCase();
         let itemEnv = (item.environment || '').toLowerCase();
         let itemStatus = (item.issueStatus || '').toLowerCase();
         let itemCat = (item.closureCategory || '').toLowerCase();
         let itemAss = (item.assignee || '').toLowerCase() + (item.coAssignee || '').toLowerCase() + (item.l3Assignee || '').toLowerCase();

         let matchesEntity = !entity || itemEntity === entity;
         let matchesEnv = !env || itemEnv === env || itemEnv.includes(env);
         let matchesStatus = !status || itemStatus.includes(status);
         let matchesCat = !category || itemCat === category;
         let matchesAss = !assignee || itemAss.includes(assignee.toLowerCase());

         return matchesEntity && matchesEnv && matchesStatus && matchesCat && matchesAss;
     });

     currentPage = 1;
     renderPaginatedTable();
     updateCharts(filteredIssuesData);
     recalculateAllSummaryTables(dataset);
 }

 function resetAllFilters() {
     if (document.getElementById('monthFilter')) document.getElementById('monthFilter').value = '';
     if (document.getElementById('monthCountFilter')) document.getElementById('monthCountFilter').value = '';
     if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
     if (document.getElementById('filterEntity')) document.getElementById('filterEntity').value = '';
     if (document.getElementById('filterEnv')) document.getElementById('filterEnv').value = '';
     if (document.getElementById('filterClosureCategory')) document.getElementById('filterClosureCategory').value = '';
     if (document.getElementById('filterAssignee')) document.getElementById('filterAssignee').value = '';
     if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
     selectedMonths = [];
     selectModule('ALL');
 }

    // Filter by Entity, Environment, Category, Assignee
    filteredIssuesData = dataset.filter(item => {
        let itemEntity = (item.entity || '').toLowerCase();
        let itemEnv = (item.environment || '').toLowerCase();
        let itemCat = (item.closureCategory || '').toLowerCase();
        let itemAss = (item.assignee || '').toLowerCase() + (item.coAssignee || '').toLowerCase();

        let matchesEntity = !entity || itemEntity === entity;
        let matchesEnv = !env || itemEnv === env || itemEnv.includes(env);
        let matchesCat = !category || itemCat === category;
        let matchesAss = !assignee || itemAss.includes(assignee.toLowerCase());

        return matchesEntity && matchesEnv && matchesCat && matchesAss;
    });

    currentPage = 1;
    renderPaginatedTable();
    updateCharts(filteredIssuesData);
    recalculateAllSummaryTables(dataset);
}

// 🧮 RECALCULATION ENGINE FOR SUMMARY TABLES
function recalculateAllSummaryTables(dataset) {
    const monthData = dataset.filter(i => {
        if (selectedMonths.length === 0) return true;
        if (!i.reportedDate) return false;
        const m = parseInt(i.reportedDate.split('-')[1], 10);
        return selectedMonths.includes(m);
    });

    // --- 1. TOP METRICS CARDS RECALCULATION ---
    let cDom = 0, cRrb = 0, cOvs = 0;
    let bDom = 0, bRrb = 0, bOvs = 0;
    let iDom = 0, iRrb = 0, iOvs = 0;

    monthData.forEach(item => {
        const normEnt = getNormalizedEntity(item);
        const st = item.issueStatus;

        if (isClosedStatus(st)) {
            if (normEnt === 'Domestic') cDom++;
            else if (normEnt === 'RRB') cRrb++;
            else if (normEnt === 'Overseas') cOvs++;
        } else if (isOpenBankStatus(st)) {
            if (normEnt === 'Domestic') bDom++;
            else if (normEnt === 'RRB') bRrb++;
            else if (normEnt === 'Overseas') bOvs++;
        } else if (isOpenInfosysStatus(st)) {
            if (normEnt === 'Domestic') iDom++;
            else if (normEnt === 'RRB') iRrb++;
            else if (normEnt === 'Overseas') iOvs++;
        }
    });

    document.getElementById('closedTotal').innerText = cDom + cRrb + cOvs;
    document.getElementById('closedDom').innerText = cDom;
    document.getElementById('closedRrb').innerText = cRrb;
    document.getElementById('closedOvs').innerText = cOvs;

    document.getElementById('bankTotal').innerText = bDom + bRrb + bOvs;
    document.getElementById('bankDom').innerText = bDom;
    document.getElementById('bankRrb').innerText = bRrb;
    document.getElementById('bankOvs').innerText = bOvs;

    document.getElementById('infTotal').innerText = iDom + iRrb + iOvs;
    document.getElementById('infDom').innerText = iDom;
    document.getElementById('infRrb').innerText = iRrb;
    document.getElementById('infOvs').innerText = iOvs;

    // --- 2. SEPARATED TABLES RECALCULATION ---
    const modulesConfig = [
        'Infra', 'ADC Channels', 'Trade Finance', 'GBM', 'EOD/BOD', 'Loans', 'Deposits', 'CRM', 'Finacle Payments', 'FAS'
    ];

    let issueDataRowsHtml = '';
    let trackLevelRowsHtml = '';

    let gCdom = 0, gCrrb = 0, gCovs = 0;
    let gIdom = 0, gIrrb = 0, gIovs = 0;
    let gBdom = 0, gBrrb = 0, gBovs = 0;

    modulesConfig.forEach(modName => {
        const modIssues = monthData.filter(i => isModuleMatch(i.module, modName));

        const mcDom = modIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
        const mcRrb = modIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
        const mcOvs = modIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;
        const totC = mcDom + mcRrb + mcOvs;

        const miDom = modIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
        const miRrb = modIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
        const miOvs = modIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;
        const totI = miDom + miRrb + miOvs;

        const mbDom = modIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
        const mbRrb = modIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
        const mbOvs = modIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;
        const totB = mbDom + mbRrb + mbOvs;

        const rowGrandTotal = totC + totI + totB;

        gCdom += mcDom; gCrrb += mcRrb; gCovs += mcOvs;
        gIdom += miDom; gIrrb += miRrb; gIovs += miOvs;
        gBdom += mbDom; gBrrb += mbRrb; gBovs += mbOvs;

        // Table 1 Row: Issue Data
        issueDataRowsHtml += `
            <tr>
                <td><strong>${modName}</strong></td>
                <td>${mcDom}</td><td>${mcRrb}</td><td>${mcOvs}</td>
                <td>${miDom}</td><td>${miRrb}</td><td>${miOvs}</td>
                <td>${mbDom}</td><td>${mbRrb}</td><td>${mbOvs}</td>
            </tr>
        `;

        // Table 2 Row: Track Level Issue Status
        trackLevelRowsHtml += `
            <tr>
                <td><strong>${modName}</strong></td>
                <td><strong>${totC}</strong></td>
                <td><strong>${totI}</strong></td>
                <td><strong>${totB}</strong></td>
                <td><strong>${rowGrandTotal}</strong></td>
            </tr>
        `;
    });

    const overallClosed = gCdom + gCrrb + gCovs;
    const overallInf = gIdom + gIrrb + gIovs;
    const overallBank = gBdom + gBrrb + gBovs;
    const overallGrandTotal = overallClosed + overallInf + overallBank;

    // Table 1 Total Row
    issueDataRowsHtml += `
        <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td>${gCdom}</td><td>${gCrrb}</td><td>${gCovs}</td>
            <td>${gIdom}</td><td>${gIrrb}</td><td>${gIovs}</td>
            <td>${gBdom}</td><td>${gBrrb}</td><td>${gBovs}</td>
        </tr>
    `;

    // Table 2 Total Row
    trackLevelRowsHtml += `
        <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td><strong>${overallClosed}</strong></td>
            <td><strong>${overallInf}</strong></td>
            <td><strong>${overallBank}</strong></td>
            <td><strong>${overallGrandTotal}</strong></td>
        </tr>
    `;

    const issueDataMatrixBody = document.getElementById('issueDataMatrixBody');
    if (issueDataMatrixBody) issueDataMatrixBody.innerHTML = issueDataRowsHtml;

    const trackLevelStatusBody = document.getElementById('trackLevelStatusBody');
    if (trackLevelStatusBody) trackLevelStatusBody.innerHTML = trackLevelRowsHtml;

    // --- 3. DOMAIN BREAKDOWN TABLES ---
    renderDomainTable('group1Body', monthData, ['Infra', 'ADC Channels', 'Channels']);
    renderDomainTable('group2Body', monthData, ['Finacle Payments', 'FAS', 'Payments']);
    renderDomainTable('group3Body', monthData, ['Trade Finance', 'GBM', 'EOD/BOD', 'EOD', 'BOD', 'Loans', 'Deposits', 'CRM']);

    // --- 4. ENTITY LEVEL OVERALL SUMMARY ---
    const domTot = gCdom + gIdom + gBdom;
    const rrbTot = gCrrb + gIrrb + gBrrb;
    const ovsTot = gCovs + gIovs + gBovs;

    const grandSummaryBody = document.getElementById('grandSummaryBody');
    if (grandSummaryBody) {
        grandSummaryBody.innerHTML = `
            <tr><td><strong>PNB Domestic</strong></td><td>${gCdom}</td><td>${gIdom}</td><td>${gBdom}</td><td><strong>${domTot}</strong></td></tr>
            <tr><td><strong>RRBs</strong></td><td>${gCrrb}</td><td>${gIrrb}</td><td>${gBrrb}</td><td><strong>${rrbTot}</strong></td></tr>
            <tr><td><strong>Overseas</strong></td><td>${gCovs}</td><td>${gIovs}</td><td>${gBovs}</td><td><strong>${ovsTot}</strong></td></tr>
            <tr class="total-row"><td><strong>TOTAL</strong></td><td><strong>${overallClosed}</strong></td><td><strong>${overallInf}</strong></td><td><strong>${overallBank}</strong></td><td><strong>${overallGrandTotal}</strong></td></tr>
        `;
    }
}

function renderDomainTable(elementId, monthData, modulesGroup) {
    const groupIssues = monthData.filter(i => modulesGroup.some(m => isModuleMatch(i.module, m)));

    const cDom = groupIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
    const cRrb = groupIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
    const cOvs = groupIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;

    const iDom = groupIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
    const iRrb = groupIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
    const iOvs = groupIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;

    const bDom = groupIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
    const bRrb = groupIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
    const bOvs = groupIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;

    const tDom = cDom + iDom + bDom;
    const tRrb = cRrb + iRrb + bRrb;
    const tOvs = cOvs + iOvs + bOvs;

    const totC = cDom + cRrb + cOvs;
    const totI = iDom + iRrb + iOvs;
    const totB = bDom + bRrb + bOvs;
    const gTot = totC + totI + totB;

    const elem = document.getElementById(elementId);
    if (elem) {
        elem.innerHTML = `
            <tr><td>PNB Domestic</td><td>${cDom}</td><td>${iDom}</td><td>${bDom}</td><td><strong>${tDom}</strong></td></tr>
            <tr><td>RRBs</td><td>${cRrb}</td><td>${iRrb}</td><td>${bRrb}</td><td><strong>${tRrb}</strong></td></tr>
            <tr><td>Overseas</td><td>${cOvs}</td><td>${iOvs}</td><td>${bOvs}</td><td><strong>${tOvs}</strong></td></tr>
            <tr class="total-row"><td><strong>Total</strong></td><td><strong>${totC}</strong></td><td><strong>${totI}</strong></td><td><strong>${totB}</strong></td><td><strong>${gTot}</strong></td></tr>
        `;
    }
}

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

// Render Table Row with L3 Assignee
function renderPaginatedTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
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
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; color:#94a3b8;">No issue records found.</td></tr>`;
        return;
    }
    pageItems.forEach(item => {
        let statusClass = 'status-closed';
        if (isOpenBankStatus(item.issueStatus)) statusClass = 'status-bank';
        if (isOpenInfosysStatus(item.issueStatus)) statusClass = 'status-infosys';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${item.id}" ${selectedRowIds.has(item.id) ? 'checked' : ''} onclick="toggleRowSelect(${item.id}, this)"></td>
            <td><strong>${item.module}</strong></td>
            <td>${item.entity}</td>
            <td>${item.environment || 'PROD'}</td>
            <td>${item.reportedDate || '-'}</td>
            <td>${item.issueDescription || '-'}</td>
            <td>${item.l2Analysis || '-'}</td>
            <td><code>${item.tolId || '-'}</code></td>
            <td>${item.l3UpdatesRemarks || '-'}</td>
            <td><span class="status-badge ${statusClass}">${item.issueStatus}</span></td>
            <td>${item.closureCategory || '-'}</td>
            <td>${item.closureDate || '-'}</td>
            <td>${item.assignee || '-'}${item.coAssignee ? ' / ' + item.coAssignee : ''}</td>
            <td>${item.l3Assignee || '-'}</td>
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
    if (isClosedStatus(statusVal) && !clsVal) return showDateError("Closure Date is required when Issue Status is 'Closed'.");

    if (clsVal && isCompleteDate(clsVal) && isCompleteDate(repVal)) {
        if (clsVal > todayStr) return showDateError("Closure Date cannot be a future date.");
        if (clsVal < repVal) return showDateError("Closure Date cannot be earlier than Reported Date.");
    }

    return true;
}

function handleStatusChange() {
    const statusVal = document.getElementById('formStatus').value;
    const closureDateInput = document.getElementById('formClosureDate');
    const closureCatInput = document.getElementById('formClosureCategory');

    closureCatInput.disabled = false;

    if (!isClosedStatus(statusVal)) {
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

// Edit Form pre-fill with L3 Assignee
function editIssue(id) {
    const item = allIssuesData.find(i => i.id === id);
    if (!item) return;
    clearDateError();
    document.getElementById('formId').value = item.id;
    document.getElementById('formModule').value = item.module;
    document.getElementById('formEntity').value = item.entity;
    document.getElementById('formEnv').value = item.environment || 'PROD';
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
    if (document.getElementById('formL3Assignee')) document.getElementById('formL3Assignee').value = item.l3Assignee || '';
    handleStatusChange();
    document.getElementById('formTitle').innerText = 'Edit Issue Details (ID: ' + item.id + ')';
    document.getElementById('issueModal').classList.add('show');
}

// Save Form payload with L3 Assignee
async function saveIssue(e) {
    e.preventDefault();
    if (!validateDates()) return false;
    const rawId = document.getElementById('formId').value;
    const isEdit = rawId && rawId !== '' && rawId !== 'undefined' && rawId !== 'null';
    const issueData = {
        module: document.getElementById('formModule').value,
        entity: document.getElementById('formEntity').value,
        environment: document.getElementById('formEnv').value || 'PROD',
        reportedDate: document.getElementById('formReportedDate').value,
        issueDescription: document.getElementById('formDescription').value,
        l2Analysis: document.getElementById('formL2').value || null,
        tolId: document.getElementById('formTolId').value || null,
        issueStatus: document.getElementById('formStatus').value,
        l3UpdatesRemarks: document.getElementById('formL3').value || null,
        closureCategory: document.getElementById('formClosureCategory').value || null,
        closureDate: document.getElementById('formClosureDate').value || null,
        assignee: document.getElementById('formAssignee').value || null,
        coAssignee: document.getElementById('formCoAssignee').value || null,
        l3Assignee: document.getElementById('formL3Assignee')?.value || null
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
            fetchIssues();
        } else {
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
        fetchIssues();
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

function resetAllFilters() {
    if (document.getElementById('monthFilter')) document.getElementById('monthFilter').value = '';
    if (document.getElementById('monthCountFilter')) document.getElementById('monthCountFilter').value = '';
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

    const closedCount = data.filter(i => isClosedStatus(i.issueStatus)).length;
    const bankCount = data.filter(i => isOpenBankStatus(i.issueStatus)).length;
    const infCount = data.filter(i => isOpenInfosysStatus(i.issueStatus)).length;

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

    const modulesList = ['Channels', 'Infra', 'Trade Finance', 'GBM', 'EOD/BOD', 'Loans', 'Deposits', 'CRM', 'Finacle Payments', 'FAS'];
    const moduleCounts = modulesList.map(m => data.filter(i => isModuleMatch(i.module, m)).length);

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