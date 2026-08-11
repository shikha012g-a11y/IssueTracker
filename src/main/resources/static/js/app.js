const API_BASE_URL = '/api/issues';

let currentModule = 'ALL';
let selectedMonths = [];
let allIssuesData = [];
let filteredIssuesData = [];
let parsedExcelRecords = [];
let selectedRowIds = new Set();
let currentPage = 1;
const itemsPerPage = 10;

let statusChart = null;
let moduleChart = null;

// Expose functions globally on window object
window.selectModule = selectModule;
window.openModal = openModal;
window.closeModal = closeModal;
window.editIssue = editIssue;
window.deleteIssue = deleteIssue;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.handleExcelFileSelect = handleExcelFileSelect;
window.confirmImport = confirmImport;
window.exportToCSV = exportToCSV;
window.resetAllFilters = resetAllFilters;
window.applyFilters = applyFilters;
window.handleMonthChange = handleMonthChange;
window.handleMonthCountFilterChange = handleMonthCountFilterChange;
window.filterTableBySearch = filterTableBySearch;
window.toggleSelectAll = toggleSelectAll;
window.toggleRowSelect = toggleRowSelect;
window.changePage = changePage;
window.handleStatusChange = handleStatusChange;
window.saveIssue = saveIssue;
window.filterTolTable = filterTolTable;

document.addEventListener('DOMContentLoaded', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const repInput = document.getElementById('formReportedDate');
    const clsInput = document.getElementById('formClosureDate');

    if (repInput) repInput.max = todayStr;
    if (clsInput) clsInput.max = todayStr;

    fetchIssues();
});

// Helper: Module Matcher
function isModuleMatch(issueModule, targetKey) {
    const itemMod = (issueModule || '').trim().toLowerCase();
    const target = (targetKey || '').trim().toLowerCase();

    if (!itemMod || !target) return false;
    if (target === 'all') return true;

    if (target.includes('channel')) return itemMod.includes('channel');
    if (target.includes('infra')) return itemMod.includes('infra');
    if (target.includes('eod') || target.includes('bod') || target.includes('eowd')) return itemMod.includes('eod') || itemMod.includes('bod') || itemMod.includes('eowd');
    if (target.includes('finacle') || target.includes('payment')) return itemMod.includes('finacle') || itemMod.includes('payment');
    if (target.includes('trade')) return itemMod.includes('trade');

    return itemMod.includes(target) || target.includes(itemMod);
}

// Helper: Entity Classifier
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

function isClosedStatus(status) { return (status || '').toLowerCase().includes('closed'); }
function isOpenBankStatus(status) { return (status || '').toLowerCase().includes('bank'); }
function isOpenInfosysStatus(status) { const s = (status || '').toLowerCase(); return s.includes('infosys') || s.includes('l3'); }

// 🔄 Navigation Handler (Switching views)
function selectModule(moduleName) {
    currentModule = moduleName;

    document.querySelectorAll('.module-card').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(moduleName) || (moduleName === 'ALL' && btn.innerText.includes('All Modules')));
    });

    const monthCountSection = document.getElementById('monthCountPageSection');
    const tolDetailsSection = document.getElementById('tolDetailsPageSection');
    const tableSection = document.getElementById('issuesTableSection');
    const chartsSection = document.getElementById('chartsSection');

    if (moduleName === 'MONTH_COUNT') {
        monthCountSection.style.display = 'block';
        tolDetailsSection.style.display = 'none';
        tableSection.style.display = 'none';
        chartsSection.style.display = 'none';
        document.getElementById('activeFilterBadge').innerText = 'Month Count View';
        recalculateAllSummaryTables(allIssuesData);
    } else if (moduleName === 'TOL_DETAILS') {
        monthCountSection.style.display = 'none';
        tolDetailsSection.style.display = 'block';
        tableSection.style.display = 'none';
        chartsSection.style.display = 'none';
        document.getElementById('activeFilterBadge').innerText = 'TOL Details View';
        renderTolDetailsPage();
    } else {
        monthCountSection.style.display = 'none';
        tolDetailsSection.style.display = 'none';
        tableSection.style.display = 'block';
        chartsSection.style.display = 'grid';

        document.getElementById('activeFilterBadge').innerText = moduleName === 'ALL' ? 'All Modules' : moduleName;
        document.getElementById('tableHeading').innerText = moduleName === 'ALL' ? 'All Module Issues Data' : `${moduleName} Module Issues Data`;

        applyFilters();
    }
}

// 🎫 DEDICATED "TOL DETAILS" ENGINE
function renderTolDetailsPage() {
    filterTolTable();
}

function filterTolTable() {
    const modFilter = (document.getElementById('tolModuleFilter')?.value || '').trim().toLowerCase();
    const stFilter = (document.getElementById('tolStatusFilter')?.value || '').trim().toLowerCase();
    const searchQuery = (document.getElementById('tolSearchInput')?.value || '').trim().toLowerCase();

    // Map Issue Status to TOL Status
    const getTolStatus = (st) => {
        if (isClosedStatus(st)) return 'Closed';
        if (isOpenBankStatus(st)) return 'Open with L2';
        if (isOpenInfosysStatus(st)) return 'Open with L3';
        return 'Open with L2';
    };

    let tolRecords = allIssuesData.filter(i => i.tolId && i.tolId.trim() !== '');
    if (tolRecords.length === 0) {
        tolRecords = [...allIssuesData]; // Fallback if no specific tolId provided
    }

    let filteredTols = tolRecords.filter(item => {
        const itemTolStatus = getTolStatus(item.issueStatus);
        const matchesMod = !modFilter || isModuleMatch(item.module, modFilter);
        const matchesSt = !stFilter || itemTolStatus.toLowerCase() === stFilter;
        const matchesSearch = !searchQuery ||
            (item.tolId && item.tolId.toLowerCase().includes(searchQuery)) ||
            (item.issueDescription && item.issueDescription.toLowerCase().includes(searchQuery)) ||
            (item.assignee && item.assignee.toLowerCase().includes(searchQuery)) ||
            (item.l3Assignee && item.l3Assignee.toLowerCase().includes(searchQuery));

        return matchesMod && matchesSt && matchesSearch;
    });

    // Update TOL Metrics Cards
    const totCount = filteredTols.length;
    const l2Count = filteredTols.filter(i => getTolStatus(i.issueStatus) === 'Open with L2').length;
    const l3Count = filteredTols.filter(i => getTolStatus(i.issueStatus) === 'Open with L3').length;
    const closedCount = filteredTols.filter(i => getTolStatus(i.issueStatus) === 'Closed').length;

    if (document.getElementById('tolTotalCount')) document.getElementById('tolTotalCount').innerText = totCount;
    if (document.getElementById('tolOpenL2Count')) document.getElementById('tolOpenL2Count').innerText = l2Count;
    if (document.getElementById('tolOpenL3Count')) document.getElementById('tolOpenL3Count').innerText = l3Count;
    if (document.getElementById('tolClosedCount')) document.getElementById('tolClosedCount').innerText = closedCount;

    // Render TOL Table Rows
    const tbody = document.getElementById('tolTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filteredTols.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; color:#94a3b8;">No TOL ticket records found.</td></tr>`;
        return;
    }

    filteredTols.forEach(item => {
        const tolSt = getTolStatus(item.issueStatus);
        let statusBadgeClass = 'status-closed';
        if (tolSt === 'Open with L2') statusBadgeClass = 'status-bank';
        if (tolSt === 'Open with L3') statusBadgeClass = 'status-infosys';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code><strong>${item.tolId || 'TOL-' + item.id}</strong></code></td>
            <td><strong>${item.module}</strong></td>
            <td>${item.issueDescription || '-'}</td>
            <td>${item.reportedDate || '-'}</td>
            <td>${item.entity}</td>
            <td>${item.environment || 'PROD'}</td>
            <td>${item.l2Analysis || '-'}</td>
            <td>${item.assignee || '-'}${item.coAssignee ? ' / ' + item.coAssignee : ''}</td>
            <td>${item.l3UpdatesRemarks || '-'}</td>
            <td>${item.l3Assignee || '-'}</td>
            <td>${item.closureDate || '-'}</td>
            <td><span class="status-badge ${statusBadgeClass}">${tolSt}</span></td>
            <td>
                <button type="button" class="action-btn edit-btn" onclick="window.editIssue(${item.id})">✏️ Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleMonthCountFilterChange() {
    const selectedVal = document.getElementById('monthCountFilter').value;
    if (document.getElementById('monthFilter')) document.getElementById('monthFilter').value = selectedVal;
    selectedMonths = selectedVal === "" ? [] : [parseInt(selectedVal, 10)];
    recalculateAllSummaryTables(allIssuesData);
}

function handleMonthChange() {
    const selectedVal = document.getElementById('monthFilter').value;
    if (document.getElementById('monthCountFilter')) document.getElementById('monthCountFilter').value = selectedVal;
    selectedMonths = selectedVal === "" ? [] : [parseInt(selectedVal, 10)];

    if (currentModule === 'MONTH_COUNT') recalculateAllSummaryTables(allIssuesData);
    else if (currentModule === 'TOL_DETAILS') renderTolDetailsPage();
    else applyFilters();
}

async function fetchIssues() {
    try {
        const res = await fetch(`${API_BASE_URL}`);
        if (res.ok) {
            allIssuesData = await res.json();
            applyFilters();
            recalculateAllSummaryTables(allIssuesData);
            if (currentModule === 'TOL_DETAILS') renderTolDetailsPage();
        }
    } catch (err) {
        console.warn('API Fetch Error');
    }
}

async function applyFilters() {
    const entity = (document.getElementById('filterEntity')?.value || '').trim().toLowerCase();
    const env = (document.getElementById('filterEnv')?.value || '').trim().toLowerCase();
    const status = (document.getElementById('filterStatus')?.value || '').trim().toLowerCase();
    const category = (document.getElementById('filterClosureCategory')?.value || '').trim().toLowerCase();
    const assignee = (document.getElementById('filterAssignee')?.value || '').trim();

    let dataset = [...allIssuesData];

    if (currentModule !== 'ALL' && currentModule !== 'MONTH_COUNT' && currentModule !== 'TOL_DETAILS') {
        dataset = dataset.filter(i => isModuleMatch(i.module, currentModule));
    }

    if (selectedMonths.length > 0) {
        dataset = dataset.filter(i => {
            if (!i.reportedDate) return false;
            const m = parseInt(i.reportedDate.split('-')[1], 10);
            return selectedMonths.includes(m);
        });
    }

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

// 🧮 RECALCULATION ENGINE FOR SUMMARY TABLES
function recalculateAllSummaryTables(dataset) {
    const monthData = dataset.filter(i => {
        if (selectedMonths.length === 0) return true;
        if (!i.reportedDate) return false;
        const m = parseInt(i.reportedDate.split('-')[1], 10);
        return selectedMonths.includes(m);
    });

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

    const modulesConfig = ['Infra', 'ADC Channels', 'Trade Finance', 'GBM', 'EOD/BOD', 'Loans', 'Deposits', 'CRM', 'Finacle Payments', 'FAS'];
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

        issueDataRowsHtml += `
            <tr>
                <td><strong>${modName}</strong></td>
                <td>${mcDom}</td><td>${mcRrb}</td><td>${mcOvs}</td>
                <td>${miDom}</td><td>${miRrb}</td><td>${miOvs}</td>
                <td>${mbDom}</td><td>${mbRrb}</td><td>${mbOvs}</td>
            </tr>
        `;

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

    issueDataRowsHtml += `
        <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td>${gCdom}</td><td>${gCrrb}</td><td>${gCovs}</td>
            <td>${gIdom}</td><td>${gIrrb}</td><td>${gIovs}</td>
            <td>${gBdom}</td><td>${gBrrb}</td><td>${gBovs}</td>
        </tr>
    `;

    trackLevelRowsHtml += `
        <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td><strong>${overallClosed}</strong></td>
            <td><strong>${overallInf}</strong></td>
            <td><strong>${overallBank}</strong></td>
            <td><strong>${overallGrandTotal}</strong></td>
        </tr>
    `;

    if (document.getElementById('issueDataMatrixBody')) document.getElementById('issueDataMatrixBody').innerHTML = issueDataRowsHtml;
    if (document.getElementById('trackLevelStatusBody')) document.getElementById('trackLevelStatusBody').innerHTML = trackLevelRowsHtml;

    renderDomainTable('group1Body', monthData, ['Infra', 'ADC Channels', 'Channels']);
    renderDomainTable('group2Body', monthData, ['Finacle Payments', 'FAS', 'Payments']);
    renderDomainTable('group3Body', monthData, ['Trade Finance', 'GBM', 'EOD/BOD', 'EOD', 'BOD', 'Loans', 'Deposits', 'CRM']);

    const domTot = gCdom + gIdom + gBdom;
    const rrbTot = gCrrb + gIrrb + gBrrb;
    const ovsTot = gCovs + gIovs + gBovs;

    if (document.getElementById('grandSummaryBody')) {
        document.getElementById('grandSummaryBody').innerHTML = `
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
            <td><input type="checkbox" class="row-checkbox" data-id="${item.id}" ${selectedRowIds.has(item.id) ? 'checked' : ''} onclick="window.toggleRowSelect(${item.id}, this)"></td>
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
            <td style="white-space: nowrap;">
                <button type="button" class="action-btn edit-btn" onclick="window.editIssue(${item.id})">✏️ Edit</button>
                <button type="button" class="action-btn delete-btn" onclick="window.deleteIssue(${item.id})">🗑️ Delete</button>
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
        (i.l3Assignee && i.l3Assignee.toLowerCase().includes(query)) ||
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

// 📤 EXCEL IMPORT HANDLERS
function openImportModal() {
    parsedExcelRecords = [];
    document.getElementById('excelFileInput').value = '';
    document.getElementById('importPreviewWrapper').style.display = 'none';
    document.getElementById('confirmImportBtn').style.display = 'none';
    document.getElementById('importStatusBanner').style.display = 'none';
    document.getElementById('importModal').classList.add('show');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('show');
}

function parseExcelDate(rawDate) {
    if (!rawDate) return new Date().toISOString().split('T')[0];

    if (typeof rawDate === 'number') {
        const dateObj = XLSX.SSF.parse_date_code(rawDate);
        if (dateObj) {
            const y = dateObj.y;
            const m = String(dateObj.m).padStart(2, '0');
            const d = String(dateObj.d).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }

    const str = String(rawDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const parts = str.split(/[\/\-\.]/);
    if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
    }

    return new Date().toISOString().split('T')[0];
}

function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (!jsonRows || jsonRows.length === 0) {
                showImportStatus('⚠️ No valid rows found in the selected Excel file.', 'danger');
                return;
            }

            parsedExcelRecords = jsonRows.map(row => {
                const getVal = (keys) => {
                    for (let k of keys) {
                        const foundKey = Object.keys(row).find(rk => rk.toLowerCase().trim().replace(/_/g, ' ') === k.toLowerCase());
                        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
                            return String(row[foundKey]).trim();
                        }
                    }
                    return '';
                };

                return {
                    module: getVal(['module', 'module name']) || 'Channels',
                    entity: getVal(['entity']) || 'UAT',
                    environment: getVal(['environment', 'env']) || 'PROD',
                    reportedDate: parseExcelDate(getVal(['reported date', 'reporteddate', 'date'])),
                    issueDescription: getVal(['issue description', 'description', 'issue']) || 'Imported issue record',
                    l2Analysis: getVal(['l2 analysis', 'l2']) || null,
                    tolId: getVal(['tol id', 'tolid', 'tol']) || null,
                    issueStatus: getVal(['issue status', 'status']) || 'Open with Bank',
                    l3UpdatesRemarks: getVal(['l3 updates', 'l3 updates remarks', 'l3']) || null,
                    closureCategory: getVal(['closure category', 'category']) || null,
                    closureDate: getVal(['closure date']) ? parseExcelDate(getVal(['closure date'])) : null,
                    assignee: getVal(['assignee']) || null,
                    coAssignee: getVal(['co-assignee', 'co assignee']) || null,
                    l3Assignee: getVal(['l3 assignee', 'l3assignee']) || null
                };
            });

            renderImportPreview(parsedExcelRecords);
            showImportStatus(`✅ Successfully parsed ${parsedExcelRecords.length} records. Click below to import.`, 'success');
            document.getElementById('confirmImportBtn').style.display = 'inline-block';

        } catch (err) {
            showImportStatus('❌ Failed to read Excel file format.', 'danger');
        }
    };
    reader.readAsArrayBuffer(file);
}

function renderImportPreview(records) {
    const tbody = document.getElementById('importPreviewBody');
    tbody.innerHTML = '';
    document.getElementById('parsedRowsCount').innerText = records.length;

    records.slice(0, 10).forEach((rec, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${rec.module}</strong></td>
            <td>${rec.entity}</td>
            <td>${rec.environment}</td>
            <td>${rec.reportedDate}</td>
            <td>${rec.issueDescription.substring(0, 30)}...</td>
            <td>${rec.issueStatus}</td>
            <td>${rec.assignee || '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('importPreviewWrapper').style.display = 'block';
}

function showImportStatus(msg, type) {
    const banner = document.getElementById('importStatusBanner');
    banner.innerHTML = msg;
    banner.style.display = 'block';
    if (type === 'success') {
        banner.style.background = 'rgba(16, 185, 129, 0.2)';
        banner.style.color = '#34d399';
        banner.style.border = '1px solid #10b981';
    } else {
        banner.style.background = 'rgba(239, 68, 68, 0.2)';
        banner.style.color = '#f87171';
        banner.style.border = '1px solid #ef4444';
    }
}

async function confirmImport() {
    if (!parsedExcelRecords || parsedExcelRecords.length === 0) return;

    try {
        const res = await fetch(`${API_BASE_URL}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedExcelRecords)
        });

        if (res.ok) {
            closeImportModal();
            fetchIssues();
            alert(`🎉 Successfully imported ${parsedExcelRecords.length} records into the database!`);
        } else {
            showImportStatus(`Server Error (${res.status}): Unable to save imported records.`, 'danger');
        }
    } catch (err) {
        showImportStatus('Connection error with backend server.', 'danger');
    }
}

function exportToCSV() {
    if (filteredIssuesData.length === 0) {
        alert('No data available to export.');
        return;
    }

    const headers = ["ID", "Module", "Entity", "Environment", "Reported Date", "Issue Description", "L2 Analysis", "TOL ID", "L3 Updates", "Status", "Closure Category", "Closure Date", "Assignee", "Co-Assignee", "L3 Assignee"];
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
            `"${row.coAssignee || ''}"`,
            `"${row.l3Assignee || ''}"`
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
    if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
    if (document.getElementById('filterEntity')) document.getElementById('filterEntity').value = '';
    if (document.getElementById('filterEnv')) document.getElementById('filterEnv').value = '';
    if (document.getElementById('filterClosureCategory')) document.getElementById('filterClosureCategory').value = '';
    if (document.getElementById('filterAssignee')) document.getElementById('filterAssignee').value = '';
    if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
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