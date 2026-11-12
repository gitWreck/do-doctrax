/**
 * DO-DocTrax: Live Analytics Dashboard Controller
 * Mirrors COMMUNICATIONS_DASHBOARD_2026.xlsm using live Supabase data + Chart.js.
 */

(function () {
  const DASH_CATEGORIES = [
    { key: 'email', table: 'email_logs', cols: 'date', label: 'Email Received', short: 'Email', color: '#047857' },
    { key: 'memo_external', table: 'memo_ao_external', cols: 'date,doc_type', label: 'Memo & AO (Email)', short: 'Memo/AO', color: '#0d9488' },
    { key: 'incoming_outgoing', table: 'incoming_outgoing_docs', cols: 'date,doc_type,status', label: 'Incoming / Outgoing Docs', short: 'In/Out', color: '#0284c7' },
    { key: 'personnel', table: 'personnel_appointments', cols: 'date,doc_type,unit', label: 'Appointments, NOSA, etc.', short: 'Appts', color: '#d97706' },
    { key: 'cfnr_memo', table: 'cfnr_memos', cols: 'date', label: 'CFNR Memo', short: 'CFNR Memo', color: '#7c3aed' },
    { key: 'cfnr_ao', table: 'cfnr_admin_orders', cols: 'date', label: 'CFNR Admin Order', short: 'CFNR AO', color: '#be123c' }
  ];

  const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const JUNK_HEADER_DATES = new Set(['INCOMING AND OUTGOING DOCUMENTS', 'Email Received']);

  const dashState = {
    cache: null, // Map<categoryKey, Array<{ iso: string|null, year: number|null, month: number|null, ... }>>
    dirty: true,
    loading: false,
    listenersBound: false,
    onNavigateCategory: null,
    charts: {}
  };

  function parseIsoDateLocal(raw) {
    if (!raw) return null;
    if (typeof parseDateParts === 'function') {
      const p = parseDateParts(raw);
      if (!p) return null;
      const mm = String(p.month).padStart(2, '0');
      const dd = String(p.day).padStart(2, '0');
      return { iso: `${p.year}-${mm}-${dd}`, year: p.year, month: p.month, day: p.day };
    }
    const m = String(raw).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return { iso: `${m[1]}-${m[2]}-${m[3]}`, year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  function formatShortDate(iso) {
    if (!iso) return '—';
    const parts = parseIsoDateLocal(iso);
    if (!parts) return iso;
    return `${String(parts.day).padStart(2, '0')} ${SHORT_MONTHS[parts.month - 1]} ${parts.year}`;
  }

  function formatShortMonthDay(iso) {
    if (!iso) return '-';
    const parts = parseIsoDateLocal(iso);
    if (!parts) return '-';
    return `${SHORT_MONTHS[parts.month - 1]} ${parts.day}`;
  }

  function esc(str) {
    if (typeof escapeHtml === 'function') return escapeHtml(str);
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pct(part, total) {
    if (!total) return '0.0%';
    return `${((part / total) * 100).toFixed(1)}%`;
  }

  async function fetchCategoryRows(sb, catDef) {
    const pageSize = 1000;
    let offset = 0;
    const rows = [];

    while (true) {
      const { data, error } = await sb
        .from(catDef.table)
        .select(catDef.cols)
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const r of data) {
        if (r.date && JUNK_HEADER_DATES.has(String(r.date).trim())) continue;
        const parsed = parseIsoDateLocal(r.date);
        rows.push({
          iso: parsed ? parsed.iso : null,
          year: parsed ? parsed.year : null,
          month: parsed ? parsed.month : null,
          doc_type: r.doc_type ? String(r.doc_type).trim() : '',
          status: r.status ? String(r.status).trim() : '',
          unit: r.unit ? String(r.unit).trim() : ''
        });
      }

      if (data.length < pageSize) break;
      offset += pageSize;
    }

    return rows;
  }

  async function loadDashboardData(force = false) {
    if (dashState.loading) return;
    if (dashState.cache && !dashState.dirty && !force) {
      renderDashboard();
      return;
    }

    const sb = window.docTraxAuth?.supabase;
    if (!sb || !window.docTraxAuth?.isAuthorized?.()) return;

    dashState.loading = true;
    const subtitle = document.getElementById('dash-overview-subtitle');
    if (subtitle && !dashState.cache) {
      subtitle.textContent = 'Loading dashboard metrics across all logs...';
    }

    try {
      const entries = await Promise.all(
        DASH_CATEGORIES.map(async cat => [cat.key, await fetchCategoryRows(sb, cat)])
      );
      dashState.cache = Object.fromEntries(entries);
      dashState.dirty = false;
      populateTrendYearOptions();
      renderDashboard();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (subtitle) subtitle.textContent = 'Unable to load dashboard metrics.';
      if (typeof showToast === 'function') {
        showToast(err?.message || 'Failed to load dashboard metrics.', 'error');
      }
    } finally {
      dashState.loading = false;
    }
  }

  function populateTrendYearOptions() {
    const select = document.getElementById('dash-trend-year');
    if (!select || !dashState.cache) return;

    const yearsSet = new Set([2026]);
    Object.values(dashState.cache).forEach(rows => {
      rows.forEach(r => {
        if (r.year) yearsSet.add(r.year);
      });
    });

    const prev = Number(select.value) || 2026;
    const sorted = Array.from(yearsSet).sort((a, b) => b - a);
    select.innerHTML = sorted
      .map(y => `<option value="${y}" ${y === prev ? 'selected' : ''}>${y}</option>`)
      .join('');
  }

  function inDateRange(row, startDate, endDate) {
    if (!startDate && !endDate) return true;
    if (!row.iso) return false;
    if (startDate && row.iso < startDate) return false;
    if (endDate && row.iso > endDate) return false;
    return true;
  }

  function aggregateCounts(rows, fieldName) {
    const map = new Map();
    let otherCount = 0;

    for (const r of rows) {
      const val = r[fieldName];
      if (!val) {
        otherCount++;
      } else {
        map.set(val, (map.get(val) || 0) + 1);
      }
    }

    const items = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    if (otherCount > 0) {
      items.push({ name: 'Other / unspecified', count: otherCount });
    }
    return items;
  }

  function renderBreakdownRows(tbodyId, items, total) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-faint); padding: 1rem;">No records in selected date range</td></tr>`;
      return;
    }

    const rowsHtml = items.map(item => `
      <tr>
        <td>${esc(item.name)}</td>
        <td class="num">${item.count.toLocaleString()}</td>
        <td class="num">${pct(item.count, total)}</td>
      </tr>
    `).join('');

    const totalRow = `
      <tr class="dash-row-total">
        <td>Total in range</td>
        <td class="num">${total.toLocaleString()}</td>
        <td class="num">${total > 0 ? '100.0%' : '0.0%'}</td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml + totalRow;
  }

  function upsertChart(canvasId, config) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (dashState.charts[canvasId]) {
      dashState.charts[canvasId].destroy();
    }
    dashState.charts[canvasId] = new Chart(canvas, config);
  }

  function renderDashboard() {
    if (!dashState.cache) return;

    const startDate = document.getElementById('dash-start-date')?.value || '';
    const endDate = document.getElementById('dash-end-date')?.value || '';
    const trendYear = Number(document.getElementById('dash-trend-year')?.value) || 2026;

    // 1. Compute category summaries
    let grandTotal = 0;
    let grandInRange = 0;
    let globalMinIso = null;
    let globalMaxIso = null;

    const summaryList = DASH_CATEGORIES.map(cat => {
      const rows = dashState.cache[cat.key] || [];
      const inRangeRows = rows.filter(r => inDateRange(r, startDate, endDate));

      let minIso = null;
      let maxIso = null;
      for (const r of rows) {
        if (!r.iso) continue;
        if (!minIso || r.iso < minIso) minIso = r.iso;
        if (!maxIso || r.iso > maxIso) maxIso = r.iso;
      }

      grandTotal += rows.length;
      grandInRange += inRangeRows.length;
      if (minIso && (!globalMinIso || minIso < globalMinIso)) globalMinIso = minIso;
      if (maxIso && (!globalMaxIso || maxIso > globalMaxIso)) globalMaxIso = maxIso;

      return {
        ...cat,
        rows,
        inRangeRows,
        total: rows.length,
        inRange: inRangeRows.length,
        minIso,
        maxIso
      };
    });

    // Header subtitle
    const subtitleEl = document.getElementById('dash-overview-subtitle');
    if (subtitleEl) {
      const latestText = globalMaxIso ? formatShortDate(globalMaxIso) : '—';
      subtitleEl.textContent = `Latest entry across all logs: ${latestText}  |  ${grandTotal.toLocaleString()} total transactions across ${DASH_CATEGORIES.length} logs (${grandInRange.toLocaleString()} in selected range)`;
    }

    // 2. Render Category KPI Cards
    const kpiGrid = document.getElementById('dash-kpi-grid');
    if (kpiGrid) {
      const cardsHtml = summaryList.map(s => `
        <button type="button" class="dash-kpi-card" data-nav-cat="${s.key}" title="Open ${esc(s.label)}">
          <span class="kpi-label">${esc(s.label)} &rsaquo;</span>
          <span class="kpi-value">${s.total.toLocaleString()}</span>
          <span class="kpi-subtext">In range: ${s.inRange.toLocaleString()} &bull; Latest: ${formatShortMonthDay(s.maxIso)}</span>
        </button>
      `).join('');

      const allCardHtml = `
        <div class="dash-kpi-card dash-kpi-all">
          <span class="kpi-label">All Logs Total</span>
          <span class="kpi-value">${grandTotal.toLocaleString()}</span>
          <span class="kpi-subtext">In range: ${grandInRange.toLocaleString()} &bull; Latest: ${formatShortMonthDay(globalMaxIso)}</span>
        </div>
      `;

      kpiGrid.innerHTML = cardsHtml + allCardHtml;
      kpiGrid.querySelectorAll('[data-nav-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (dashState.onNavigateCategory) dashState.onNavigateCategory(btn.dataset.navCat);
        });
      });
    }

    // 3. Render Summary by Category table
    const summaryBody = document.getElementById('dash-summary-body');
    if (summaryBody) {
      const rowsHtml = summaryList.map(s => `
        <tr class="dash-row-clickable" data-nav-cat="${s.key}" title="Open ${esc(s.label)}">
          <td style="font-weight: 600;">${esc(s.label)}</td>
          <td class="num">${s.total.toLocaleString()}</td>
          <td class="num">${s.inRange.toLocaleString()}</td>
          <td class="num">${pct(s.total, grandTotal)}</td>
          <td class="cell-date">${esc(formatShortDate(s.minIso))}</td>
          <td class="cell-date">${esc(formatShortDate(s.maxIso))}</td>
        </tr>
      `).join('');

      const totalRow = `
        <tr class="dash-row-total">
          <td>ALL LOGS</td>
          <td class="num">${grandTotal.toLocaleString()}</td>
          <td class="num">${grandInRange.toLocaleString()}</td>
          <td class="num">${grandTotal > 0 ? '100.0%' : '0.0%'}</td>
          <td class="cell-date">${esc(formatShortDate(globalMinIso))}</td>
          <td class="cell-date">${esc(formatShortDate(globalMaxIso))}</td>
        </tr>
      `;

      summaryBody.innerHTML = rowsHtml + totalRow;
      summaryBody.querySelectorAll('[data-nav-cat]').forEach(row => {
        row.addEventListener('click', () => {
          if (dashState.onNavigateCategory) dashState.onNavigateCategory(row.dataset.navCat);
        });
      });
    }

    // Chart 1: Total Transactions per Category (In Range vs Total)
    upsertChart('dash-chart-categories', {
      type: 'bar',
      data: {
        labels: summaryList.map(s => s.short),
        datasets: [
          {
            label: 'In Selected Range',
            data: summaryList.map(s => s.inRange),
            backgroundColor: '#047857',
            borderRadius: 4
          },
          {
            label: 'All-Time Total',
            data: summaryList.map(s => s.total),
            backgroundColor: '#cbd5e1',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });

    // 4. Compute & Render Monthly Trend (Jan-Dec for trendYear)
    const monthlyTitle = document.getElementById('dash-monthly-title');
    if (monthlyTitle) monthlyTitle.textContent = `Monthly Trend (${trendYear})`;

    // Order matching spreadsheet columns: In/Out, Email, Memo/AO, Appts, CFNR Memo, CFNR AO
    const monthlyCats = [
      summaryList.find(s => s.key === 'incoming_outgoing'),
      summaryList.find(s => s.key === 'email'),
      summaryList.find(s => s.key === 'memo_external'),
      summaryList.find(s => s.key === 'personnel'),
      summaryList.find(s => s.key === 'cfnr_memo'),
      summaryList.find(s => s.key === 'cfnr_ao')
    ];

    const monthCounts = Array.from({ length: 12 }, () => monthlyCats.map(() => 0));
    monthlyCats.forEach((cat, colIdx) => {
      for (const r of cat.rows) {
        if (r.year === trendYear && r.month >= 1 && r.month <= 12) {
          monthCounts[r.month - 1][colIdx]++;
        }
      }
    });

    const catYearTotals = monthlyCats.map((_, colIdx) =>
      monthCounts.reduce((acc, row) => acc + row[colIdx], 0)
    );
    const grandYearTotal = catYearTotals.reduce((a, b) => a + b, 0);

    const monthlyBody = document.getElementById('dash-monthly-body');
    if (monthlyBody) {
      const mRows = SHORT_MONTHS.map((mName, idx) => {
        const rowTotal = monthCounts[idx].reduce((a, b) => a + b, 0);
        const cells = monthCounts[idx].map(v => `<td class="num">${v.toLocaleString()}</td>`).join('');
        return `
          <tr>
            <td style="font-weight: 600;">${mName}</td>
            ${cells}
            <td class="num" style="font-weight: 700;">${rowTotal.toLocaleString()}</td>
          </tr>
        `;
      }).join('');

      const footerRow = `
        <tr class="dash-row-total">
          <td>Year total</td>
          ${catYearTotals.map(v => `<td class="num">${v.toLocaleString()}</td>`).join('')}
          <td class="num">${grandYearTotal.toLocaleString()}</td>
        </tr>
      `;
      monthlyBody.innerHTML = mRows + footerRow;
    }

    // Chart 2: Stacked Monthly Bar Chart
    upsertChart('dash-chart-monthly', {
      type: 'bar',
      data: {
        labels: SHORT_MONTHS,
        datasets: monthlyCats.map((cat, colIdx) => ({
          label: cat.short,
          data: monthCounts.map(m => m[colIdx]),
          backgroundColor: cat.color,
          borderRadius: 2
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 11, font: { size: 11 } } } },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });

    // 5. Breakdowns (driven by Start / End date)
    const inOutSummary = summaryList.find(s => s.key === 'incoming_outgoing');
    const memoExtSummary = summaryList.find(s => s.key === 'memo_external');
    const apptsSummary = summaryList.find(s => s.key === 'personnel');

    const inOutTypes = aggregateCounts(inOutSummary.inRangeRows, 'doc_type');
    const inOutStatuses = aggregateCounts(inOutSummary.inRangeRows, 'status');
    const memoTypes = aggregateCounts(memoExtSummary.inRangeRows, 'doc_type');
    const apptTypes = aggregateCounts(apptsSummary.inRangeRows, 'doc_type');
    const apptUnits = aggregateCounts(apptsSummary.inRangeRows, 'unit');

    renderBreakdownRows('dash-bd-inout-types', inOutTypes, inOutSummary.inRange);
    renderBreakdownRows('dash-bd-inout-status', inOutStatuses, inOutSummary.inRange);
    renderBreakdownRows('dash-bd-memo-types', memoTypes, memoExtSummary.inRange);
    renderBreakdownRows('dash-bd-appt-types', apptTypes, apptsSummary.inRange);
    renderBreakdownRows('dash-bd-appt-units', apptUnits, apptsSummary.inRange);

    // Chart 3: Top 10 Document Types (Incoming / Outgoing)
    const top10Types = inOutTypes.filter(x => x.name !== 'Other / unspecified').slice(0, 10);
    upsertChart('dash-chart-doctypes', {
      type: 'bar',
      data: {
        labels: top10Types.map(x => x.name),
        datasets: [{
          label: 'Count',
          data: top10Types.map(x => x.count),
          backgroundColor: '#0284c7',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });

    // Chart 4: Incoming / Outgoing Status Mix Doughnut
    const statusPalette = ['#047857', '#d97706', '#0284c7', '#16a34a', '#b91c1c', '#7c3aed', '#64748b', '#94a3b8'];
    upsertChart('dash-chart-status', {
      type: 'doughnut',
      data: {
        labels: inOutStatuses.map(x => x.name),
        datasets: [{
          data: inOutStatuses.map(x => x.count),
          backgroundColor: inOutStatuses.map((_, i) => statusPalette[i % statusPalette.length]),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
  }

  function bindDashboardListeners() {
    if (dashState.listenersBound) return;
    dashState.listenersBound = true;

    const startInput = document.getElementById('dash-start-date');
    const endInput = document.getElementById('dash-end-date');
    const yearSelect = document.getElementById('dash-trend-year');

    startInput?.addEventListener('change', renderDashboard);
    endInput?.addEventListener('change', renderDashboard);
    yearSelect?.addEventListener('change', renderDashboard);

    document.getElementById('dash-btn-all-dates')?.addEventListener('click', () => {
      if (startInput) startInput.value = '';
      if (endInput) endInput.value = '';
      renderDashboard();
    });

    document.getElementById('dash-btn-reset')?.addEventListener('click', () => {
      if (startInput) startInput.value = '2026-01-01';
      if (endInput) endInput.value = '2026-12-31';
      if (yearSelect && yearSelect.querySelector('option[value="2026"]')) {
        yearSelect.value = '2026';
      }
      renderDashboard();
    });

    document.getElementById('dash-btn-refresh')?.addEventListener('click', () => {
      dashState.dirty = true;
      loadDashboardData(true);
    });
  }

  window.docTraxDashboard = {
    activate(onNavigateCategory) {
      dashState.onNavigateCategory = onNavigateCategory || null;
      bindDashboardListeners();
      return loadDashboardData(false);
    },
    invalidateCache() {
      dashState.dirty = true;
    },
    reload() {
      dashState.dirty = true;
      return loadDashboardData(true);
    }
  };
})();

