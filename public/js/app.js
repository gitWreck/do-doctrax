/**
 * DO-DocTrax: CFNR Document Tracking Application
 * Client-Side Controller & Interface Manager
 */

// Application State
const state = {
  currentCategory: 'incoming_outgoing',
  currentPage: 1,
  limit: 50,
  totalPages: 1,
  totalRecords: 0,
  searchQuery: '',
  selectedUnit: '',
  selectedStatus: '',
  lookups: {
    units: [],
    doc_types: [],
    statuses: [],
    appointment_types: [],
    memo_types: [],
    couriers: []
  },
  stats: {},
  editingRecordId: null,
  activeCustodyDocId: null
};

// Column definitions per category
const CATEGORY_CONFIG = {
  incoming_outgoing: {
    title: 'Incoming & Outgoing Documents',
    columns: [
      { key: 'doctrax_no', label: 'Doctrax No.', type: 'code' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'from_unit', label: 'Unit', type: 'unit' },
      { key: 'doc_type', label: 'Document Type' },
      { key: 'description', label: 'Description', type: 'desc' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'received_by', label: 'Received / Custody', type: 'remarks' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    fields: [
      { name: 'date', label: 'Date', type: 'date', defaultToday: true },
      { name: 'doctrax_no', label: 'Doctrax Number', placeholder: 'e.g. 202501-J6O055' },
      { name: 'from_unit', label: 'Originating Unit', type: 'combobox', lookup: 'units', placeholder: 'Select or type unit...' },
      { name: 'doc_type', label: 'Document Type', type: 'combobox', lookup: 'doc_types', placeholder: 'Select or type document type...' },
      { name: 'status', label: 'Review Status', type: 'select', lookup: 'statuses' },
      { name: 'received_by', label: 'Received by / Custody Stamp', placeholder: 'e.g. pick up by Kuya Paolo 01/03/2025' },
      { name: 'description', label: 'Subject / Description', type: 'textarea', colSpan: 2 },
      { name: 'remarks', label: 'Routing Remarks', type: 'textarea', colSpan: 2 }
    ]
  },

  email: {
    title: 'Email Communications Received',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'sender', label: 'Sender' },
      { key: 'doctrax_no', label: 'Doctrax No.', type: 'code' },
      { key: 'description', label: 'Subject / Content', type: 'desc' },
      { key: 'deadline_link', label: 'Deadline / Link' },
      { key: 'remarks', label: 'Action / Remarks', type: 'remarks' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    fields: [
      { name: 'date', label: 'Date Received', type: 'date', defaultToday: true },
      { name: 'sender', label: 'Sender / Office', placeholder: 'e.g. OC UPLB, IRRI' },
      { name: 'doctrax_no', label: 'Doctrax (if any)' },
      { name: 'deadline_link', label: 'Deadline or Web Link' },
      { name: 'description', label: 'Email Subject / Description', type: 'textarea', colSpan: 2 },
      { name: 'remarks', label: 'Handling Remarks', type: 'textarea', colSpan: 2 }
    ]
  },

  memo_external: {
    title: 'University Memoranda & Admin Orders',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'sender', label: 'Originating Office' },
      { key: 'doc_type', label: 'Type', type: 'badge' },
      { key: 'memo_no', label: 'Memo / AO No.', type: 'code' },
      { key: 'subject', label: 'Description / Subject', type: 'desc' },
      { key: 'remarks', label: 'Dissemination Remarks', type: 'remarks' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    fields: [
      { name: 'date', label: 'Date', type: 'date', defaultToday: true },
      { name: 'sender', label: 'Issuing Office', placeholder: 'e.g. Office of the Chancellor' },
      { name: 'doc_type', label: 'Issuance Type', type: 'select', lookup: 'memo_types' },
      { name: 'memo_no', label: 'Memo / AO Number', placeholder: 'e.g. No. 01 Series of 2025' },
      { name: 'subject', label: 'Subject / Title', type: 'textarea', colSpan: 2 },
      { name: 'remarks', label: 'Dissemination Notes', type: 'textarea', colSpan: 2 }
    ]
  },

  personnel: {
    title: 'Appointments, NOSA & HR',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'to_person', label: 'Personnel Name' },
      { key: 'unit', label: 'Unit', type: 'unit' },
      { key: 'doc_type', label: 'Action Type', type: 'badge' },
      { key: 'description', label: 'Position / Compensation / SG', type: 'desc' },
      { key: 'from_office', label: 'Issuing Office' },
      { key: 'received_by_units', label: 'Released / Picked Up', type: 'remarks' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    fields: [
      { name: 'date', label: 'Date Received', type: 'date', defaultToday: true },
      { name: 'to_person', label: 'Personnel / Faculty Name' },
      { name: 'unit', label: 'CFNR Unit', type: 'combobox', lookup: 'units', placeholder: 'Select or type unit...' },
      { name: 'doc_type', label: 'Action Type', type: 'select', lookup: 'appointment_types' },
      { name: 'from_office', label: 'Issuing Office', placeholder: 'e.g. OVCA, OC, HRDO' },
      { name: 'doctrack_no', label: 'Doctrack No. (if any)' },
      { name: 'received_by_units', label: 'Unit Pickup Details', placeholder: 'e.g. pick up by John Ryan 04/14/2025' },
      { name: 'description', label: 'Designation / SG / Step / Duration', type: 'textarea', colSpan: 2 },
      { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 }
    ]
  },

  cfnr_memo: {
    title: 'CFNR Internal Memoranda',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'memo_no', label: 'Memo No.', type: 'code' },
      { key: 'recipient', label: 'Recipient / Designee' },
      { key: 'unit_for_oic', label: 'OIC Unit', type: 'unit' },
      { key: 'description', label: 'Purpose / Subject', type: 'desc' },
      { key: 'remarks', label: 'Release Log', type: 'remarks' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    fields: [
      { name: 'date', label: 'Issuance Date', type: 'date', defaultToday: true },
      { name: 'memo_no', label: 'CFNR Memo Number', placeholder: 'e.g. 243' },
      { name: 'recipient', label: 'Addressed To', placeholder: 'e.g. DR. ANALYN L. CODILAN' },
      { name: 'unit_for_oic', label: 'Unit for OIC (if applicable)', type: 'combobox', lookup: 'units', placeholder: 'Select or type unit...' },
      { name: 'description', label: 'Memorandum Subject / Text', type: 'textarea', colSpan: 2 },
      { name: 'remarks', label: 'Pickup / Transmission Remarks', type: 'textarea', colSpan: 2 }
    ]
  },

  cfnr_ao: {
    title: 'CFNR Internal Admin Orders',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'ao_no', label: 'AO No.', type: 'code' },
      { key: 'recipient', label: 'Appointed Committee / Members', type: 'desc' },
      { key: 'description', label: 'Subject / Purpose', type: 'desc' },
      { key: 'remarks', label: 'Transmittal Remarks', type: 'remarks' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    fields: [
      { name: 'date', label: 'Date', type: 'date', defaultToday: true },
      { name: 'ao_no', label: 'CFNR AO Number', placeholder: 'e.g. 5' },
      { name: 'recipient', label: 'Appointed Members', type: 'textarea', colSpan: 2 },
      { name: 'description', label: 'Order Subject / Terms', type: 'textarea', colSpan: 2 },
      { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 }
    ]
  },

  ppmp: {
    title: 'PPMP Procurement Plans',
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'doctrack_no', label: 'Doctrack No.', type: 'code' },
      { key: 'description', label: 'Code / Items / Amount', type: 'desc' },
      { key: 'remarks', label: 'Routing to BAC / BMO', type: 'remarks' },
      { key: 'actions', label: 'Actions', type: 'actions' }
    ],
    fields: [
      { name: 'date', label: 'Date', type: 'date', defaultToday: true },
      { name: 'doctrack_no', label: 'Doctrack No.' },
      { name: 'description', label: 'PPMP Code, Items & Amount', type: 'textarea', colSpan: 2 },
      { name: 'remarks', label: 'Routing / Office Notes', type: 'textarea', colSpan: 2 }
    ]
  }
};

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadLookups();
  await loadStats();
  await loadDocuments();
});

// Event Listeners Setup
function setupEventListeners() {
  // Category Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentCategory = tab.dataset.category;
      state.currentPage = 1;
      state.searchQuery = '';
      document.getElementById('filter-search').value = '';
      loadDocuments();
    });
  });

  // Search input with debounce
  let searchTimer;
  const searchInput = document.getElementById('filter-search');
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      state.currentPage = 1;
      loadDocuments();
    }, 250);
  });

  // Filter Dropdowns
  document.getElementById('filter-unit').addEventListener('change', (e) => {
    state.selectedUnit = e.target.value;
    state.currentPage = 1;
    loadDocuments();
  });

  document.getElementById('filter-status').addEventListener('change', (e) => {
    state.selectedStatus = e.target.value;
    state.currentPage = 1;
    loadDocuments();
  });

  // Reset Filters Button
  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    state.searchQuery = '';
    state.selectedUnit = '';
    state.selectedStatus = '';
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-unit').value = '';
    document.getElementById('filter-status').value = '';
    state.currentPage = 1;
    loadDocuments();
  });

  // Page limit
  document.getElementById('page-limit').addEventListener('change', (e) => {
    state.limit = parseInt(e.target.value, 10);
    state.currentPage = 1;
    loadDocuments();
  });

  // Pagination buttons
  document.getElementById('btn-first-page').addEventListener('click', () => {
    if (state.currentPage > 1) { state.currentPage = 1; loadDocuments(); }
  });
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (state.currentPage > 1) { state.currentPage--; loadDocuments(); }
  });
  document.getElementById('btn-next-page').addEventListener('click', () => {
    if (state.currentPage < state.totalPages) { state.currentPage++; loadDocuments(); }
  });
  document.getElementById('btn-last-page').addEventListener('click', () => {
    if (state.currentPage < state.totalPages) { state.currentPage = state.totalPages; loadDocuments(); }
  });

  // Share Network URL
  const btnShare = document.getElementById('btn-share-network');
  if (btnShare) {
    btnShare.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/network-info');
        const data = await res.json();
        const shareUrl = data.network_url || data.local_url;
        await navigator.clipboard.writeText(shareUrl);
        showToast(`Copied to clipboard: ${shareUrl}`, 'success');
      } catch (err) {
        showToast(`Colleagues can open: ${window.location.origin}`, 'info');
      }
    });
  }

  // Export to Excel
  document.getElementById('btn-export-excel').addEventListener('click', () => {
    showToast('Generating official Excel export...', 'info');
    window.location.href = '/api/export';
  });

  // Log New Document
  document.getElementById('btn-new-record').addEventListener('click', () => {
    openDocumentModal();
  });

  // Document Modal Form Submit
  document.getElementById('form-document').addEventListener('submit', handleDocumentFormSubmit);

  // Close modals
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      closeModal(modalId);
    });
  });

  // Escape key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    }
  });

  // Custody Stamper apply button
  document.getElementById('btn-apply-custody-stamp').addEventListener('click', handleApplyCustodyStamp);
}

// Fetch lookups from API
async function loadLookups() {
  try {
    const res = await fetch('/api/lookups');
    const data = await res.json();
    state.lookups = data;

    // Populate Unit Filter
    const unitSelect = document.getElementById('filter-unit');
    unitSelect.innerHTML = '<option value="">All Units</option>';
    data.units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      unitSelect.appendChild(opt);
    });

    // Populate Status Filter
    const statusSelect = document.getElementById('filter-status');
    statusSelect.innerHTML = '<option value="">All Statuses</option>';
    data.statuses.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      statusSelect.appendChild(opt);
    });

    // Populate Custody Modal Courier select
    const courierSelect = document.getElementById('custody-courier-select');
    courierSelect.innerHTML = '';
    data.couriers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      courierSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load lookups:', err);
  }
}

// Fetch operational stats & KPI counts
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    state.stats = data;

    // Update Tab Badges
    Object.keys(data.counts).forEach(k => {
      const badge = document.getElementById(`badge-${k}`);
      if (badge) badge.textContent = Number(data.counts[k]).toLocaleString();
    });

    // KPI Values
    document.getElementById('kpi-grand-total').textContent = Number(data.total_all).toLocaleString();
    document.getElementById('kpi-signed').textContent = Number(data.signed_count).toLocaleString();
    document.getElementById('kpi-pending').textContent = Number(data.pending_count).toLocaleString();
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Load Documents for current category, page, and filters
async function loadDocuments() {
  const tableBody = document.getElementById('table-body');
  const tableEmpty = document.getElementById('table-empty');
  tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-faint);">Loading records...</td></tr>';
  tableEmpty.style.display = 'none';

  renderTableHeader();

  const params = new URLSearchParams({
    category: state.currentCategory,
    page: state.currentPage,
    limit: state.limit
  });

  if (state.searchQuery) params.append('search', state.searchQuery);
  if (state.selectedUnit) params.append('unit', state.selectedUnit);
  if (state.selectedStatus) params.append('status', state.selectedStatus);

  try {
    const res = await fetch(`/api/documents?${params.toString()}`);
    const data = await res.json();

    state.totalRecords = data.total;
    state.totalPages = data.total_pages;

    // Update KPI for active category
    document.getElementById('kpi-cat-total').textContent = Number(data.total).toLocaleString();

    // Update pagination bar
    const startIdx = data.total > 0 ? (state.currentPage - 1) * state.limit + 1 : 0;
    const endIdx = Math.min(state.currentPage * state.limit, data.total);
    document.getElementById('pagination-info').textContent = `Showing ${startIdx} to ${endIdx} of ${Number(data.total).toLocaleString()} records`;
    document.getElementById('current-page-display').textContent = `Page ${state.currentPage} of ${state.totalPages || 1}`;

    if (!data.records || data.records.length === 0) {
      tableBody.innerHTML = '';
      tableEmpty.style.display = 'flex';
      return;
    }

    renderTableRows(data.records);
  } catch (err) {
    console.error('Failed to fetch documents:', err);
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: #dc2626;">Failed to load records from database.</td></tr>';
  }
}

// Render dynamic table header
function renderTableHeader() {
  const thead = document.getElementById('table-head');
  const config = CATEGORY_CONFIG[state.currentCategory];
  if (!config) return;

  const row = document.createElement('tr');
  config.columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    if (col.type === 'actions') {
      th.style.textAlign = 'right';
    }
    row.appendChild(th);
  });
  thead.innerHTML = '';
  thead.appendChild(row);
}

// Render records into table rows
function renderTableRows(records) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  const config = CATEGORY_CONFIG[state.currentCategory];

  records.forEach(rec => {
    const tr = document.createElement('tr');

    config.columns.forEach(col => {
      const td = document.createElement('td');
      const val = rec[col.key] || '';

      if (col.type === 'actions') {
        td.className = 'actions-cell';
        td.style.justifyContent = 'flex-end';

        // Custody Stamp button (for incoming_outgoing and personnel)
        if (state.currentCategory === 'incoming_outgoing' || state.currentCategory === 'personnel') {
          const stampBtn = document.createElement('button');
          stampBtn.className = 'btn btn-ghost btn-sm';
          stampBtn.title = 'One-click Pick-up Stamp';
          stampBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            Stamp
          `;
          stampBtn.onclick = () => openCustodyModal(rec.id);
          td.appendChild(stampBtn);
        }

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-ghost btn-sm';
        editBtn.title = 'Edit record';
        editBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        `;
        editBtn.onclick = () => openDocumentModal(rec);
        td.appendChild(editBtn);

        // Clone button
        const cloneBtn = document.createElement('button');
        cloneBtn.className = 'btn btn-ghost btn-sm';
        cloneBtn.title = 'Clone / Duplicate record';
        cloneBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        `;
        cloneBtn.onclick = () => {
          const clonedData = { ...rec };
          delete clonedData.id;
          clonedData.date = new Date().toISOString().split('T')[0];
          openDocumentModal(clonedData, true);
        };
        td.appendChild(cloneBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-ghost btn-sm';
        deleteBtn.style.color = '#ef4444';
        deleteBtn.title = 'Delete record';
        deleteBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        `;
        deleteBtn.onclick = () => handleDeleteRecord(rec.id);
        td.appendChild(deleteBtn);

      } else if (col.type === 'status') {
        const span = document.createElement('span');
        const s = String(val).toUpperCase();
        let statusClass = 'signed';
        if (s.includes('REVIEW') || s.includes('PENDING')) statusClass = 'for-review';
        else if (s.includes('ACTION') || s.includes('COMMENT')) statusClass = 'for-action';
        else if (s.includes('RETURN') || s.includes('DISAPPROVED')) statusClass = 'returned';

        span.className = `status-badge ${statusClass}`;
        span.textContent = val || 'SIGNED';
        td.appendChild(span);

      } else if (col.type === 'unit') {
        if (val) {
          const span = document.createElement('span');
          span.className = 'unit-tag';
          span.textContent = val;
          td.appendChild(span);
        } else {
          td.textContent = '—';
        }

      } else if (col.type === 'code') {
        td.className = 'cell-code';
        td.textContent = val || '—';

      } else if (col.type === 'date') {
        td.className = 'cell-date';
        td.textContent = val || '—';

      } else if (col.type === 'desc') {
        td.className = 'cell-desc';
        td.title = val;
        td.textContent = val || '—';

      } else if (col.type === 'remarks') {
        td.className = 'cell-remarks';
        td.title = val;
        td.textContent = val || '—';

      } else if (col.type === 'badge') {
        const span = document.createElement('span');
        span.className = 'status-badge signed';
        span.textContent = val || '—';
        td.appendChild(span);

      } else {
        td.textContent = val || '—';
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// Modal handling
// HTML Escaping Helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Initialize Comboboxes (Typable Dropdowns)
function initComboboxes(container) {
  container.querySelectorAll('.combobox-wrapper').forEach(wrapper => {
    const input = wrapper.querySelector('.combobox-input');
    const toggleBtn = wrapper.querySelector('.combobox-toggle');
    const dropdown = wrapper.querySelector('.combobox-dropdown');
    const fieldName = wrapper.dataset.comboboxField;

    const config = CATEGORY_CONFIG[state.currentCategory];
    const fieldDef = config ? config.fields.find(f => f.name === fieldName) : null;
    const allOptions = (fieldDef && state.lookups[fieldDef.lookup]) ? state.lookups[fieldDef.lookup] : [];

    function renderOptions(filterText = '', showAll = false) {
      const cleanFilter = filterText.toLowerCase().trim();
      const filtered = (showAll || !cleanFilter)
        ? allOptions
        : allOptions.filter(opt => String(opt).toLowerCase().includes(cleanFilter));

      if (filtered.length === 0) {
        dropdown.innerHTML = `<div class="combobox-empty">Use custom: "<strong>${escapeHtml(filterText)}</strong>"</div>`;
      } else {
        dropdown.innerHTML = filtered.map(opt => {
          const isSelected = String(opt).toLowerCase() === input.value.toLowerCase().trim();
          return `<div class="combobox-item ${isSelected ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`;
        }).join('');

        dropdown.querySelectorAll('.combobox-item').forEach(item => {
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            input.value = item.dataset.value;
            closeDropdown();
            input.focus();
            input.dispatchEvent(new Event('input', { bubbles: true }));
          });
        });
      }
    }

    function openDropdown(showAll = false) {
      renderOptions(input.value, showAll);
      dropdown.style.display = 'block';
      const sel = dropdown.querySelector('.combobox-item.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function closeDropdown() {
      dropdown.style.display = 'none';
      const active = dropdown.querySelector('.combobox-item.active');
      if (active) active.classList.remove('active');
    }

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (dropdown.style.display === 'block') {
        closeDropdown();
      } else {
        input.focus();
        openDropdown(true);
      }
    });

    input.addEventListener('focus', () => {
      openDropdown(true);
    });

    input.addEventListener('input', () => {
      openDropdown(false);
    });

    input.addEventListener('blur', () => {
      setTimeout(closeDropdown, 160);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        if (dropdown.style.display !== 'block') {
          openDropdown();
          return;
        }
        const items = dropdown.querySelectorAll('.combobox-item');
        if (items.length > 0) {
          const active = dropdown.querySelector('.combobox-item.active');
          let nextIndex = 0;
          if (active) {
            active.classList.remove('active');
            nextIndex = Array.from(items).indexOf(active) + 1;
            if (nextIndex >= items.length) nextIndex = 0;
          }
          items[nextIndex].classList.add('active');
          items[nextIndex].scrollIntoView({ block: 'nearest' });
          e.preventDefault();
        }
      } else if (e.key === 'ArrowUp') {
        if (dropdown.style.display === 'block') {
          const items = dropdown.querySelectorAll('.combobox-item');
          if (items.length > 0) {
            const active = dropdown.querySelector('.combobox-item.active');
            let prevIndex = items.length - 1;
            if (active) {
              active.classList.remove('active');
              prevIndex = Array.from(items).indexOf(active) - 1;
              if (prevIndex < 0) prevIndex = items.length - 1;
            }
            items[prevIndex].classList.add('active');
            items[prevIndex].scrollIntoView({ block: 'nearest' });
            e.preventDefault();
          }
        }
      } else if (e.key === 'Enter') {
        const active = dropdown.querySelector('.combobox-item.active');
        if (active && dropdown.style.display === 'block') {
          e.preventDefault();
          input.value = active.dataset.value;
          closeDropdown();
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });
  });
}

function openDocumentModal(record = null, isClone = false) {
  const modal = document.getElementById('modal-document');
  const title = document.getElementById('modal-document-title');
  const fieldsContainer = document.getElementById('dynamic-form-fields');
  const config = CATEGORY_CONFIG[state.currentCategory];

  state.editingRecordId = isClone ? null : (record ? record.id : null);
  title.textContent = isClone ? 'Clone / Batch Document Entry' : (record ? 'Edit Document Entry' : `Log New ${config.title}`);

  // Build dynamic form HTML
  let html = '<div class="form-grid">';
  config.fields.forEach(f => {
    const colClass = f.colSpan ? `col-span-${f.colSpan}` : '';
    let val = '';
    if (record && record[f.name] !== undefined) {
      val = record[f.name] || '';
    } else if (f.defaultToday) {
      val = new Date().toISOString().split('T')[0];
    }

    html += `<div class="form-group ${colClass}">`;
    html += `<label class="form-label">${f.label}</label>`;

    if (f.type === 'combobox') {
      html += `
        <div class="combobox-wrapper" data-combobox-field="${f.name}">
          <input type="text" 
                 name="${f.name}" 
                 class="input-text combobox-input" 
                 value="${escapeHtml(val)}" 
                 placeholder="${f.placeholder || 'Type or select ' + f.label + '...'}" 
                 autocomplete="off">
          <button type="button" class="combobox-toggle" tabindex="-1" title="Show suggestions">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <div class="combobox-dropdown" style="display: none;"></div>
        </div>`;
    } else if (f.type === 'select') {
      const options = state.lookups[f.lookup] || [];
      html += `<select name="${f.name}" class="select-control">`;
      html += `<option value="">-- Select ${f.label} --</option>`;
      options.forEach(opt => {
        const isSel = String(opt) === String(val) ? 'selected' : '';
        html += `<option value="${opt}" ${isSel}>${opt}</option>`;
      });
      html += `</select>`;
    } else if (f.type === 'textarea') {
      html += `<textarea name="${f.name}" rows="2" class="input-text" placeholder="${f.placeholder || ''}">${escapeHtml(val)}</textarea>`;
    } else {
      html += `<input type="${f.type || 'text'}" name="${f.name}" class="input-text" value="${escapeHtml(val)}" placeholder="${f.placeholder || ''}">`;
    }

    html += `</div>`;
  });
  html += '</div>';

  fieldsContainer.innerHTML = html;
  initComboboxes(fieldsContainer);
  modal.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

// Handle Form Submit
async function handleDocumentFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = {};

  formData.forEach((value, key) => {
    data[key] = value.trim();
  });

  const payload = {
    category: state.currentCategory,
    data: data
  };

  try {
    let url = '/api/documents';
    let method = 'POST';

    if (state.editingRecordId) {
      url = `/api/documents/${state.editingRecordId}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success) {
      showToast(state.editingRecordId ? 'Record updated successfully!' : 'Document logged successfully!', 'success');
      closeModal('modal-document');
      loadStats();
      loadDocuments();
    } else {
      showToast(result.error || 'Failed to save record', 'error');
    }
  } catch (err) {
    console.error('Save error:', err);
    showToast('Network error while saving.', 'error');
  }
}

// Delete Record
async function handleDeleteRecord(id) {
  if (!confirm('Are you sure you want to permanently delete this record?')) return;

  try {
    const res = await fetch(`/api/documents/${id}?category=${state.currentCategory}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (result.success) {
      showToast('Record deleted.', 'success');
      loadStats();
      loadDocuments();
    } else {
      showToast(result.error || 'Failed to delete', 'error');
    }
  } catch (err) {
    showToast('Failed to delete record.', 'error');
  }
}

// Quick Custody Stamper Modal
function openCustodyModal(docId) {
  state.activeCustodyDocId = docId;
  document.getElementById('custody-courier-custom').value = '';
  document.getElementById('modal-custody').classList.add('open');
}

async function handleApplyCustodyStamp() {
  if (!state.activeCustodyDocId) return;

  const selectVal = document.getElementById('custody-courier-select').value;
  const customVal = document.getElementById('custody-courier-custom').value.trim();
  const courier = customVal || selectVal;

  try {
    const res = await fetch(`/api/documents/${state.activeCustodyDocId}/custody`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: state.currentCategory,
        courier: courier
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Stamped: ${result.stamp}`, 'success');
      closeModal('modal-custody');
      loadDocuments();
      loadStats();
    } else {
      showToast(result.error || 'Stamp failed', 'error');
    }
  } catch (err) {
    showToast('Error applying custody stamp.', 'error');
  }
}

// Toast Feedback Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
  if (type === 'error') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  }

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease-out';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}
