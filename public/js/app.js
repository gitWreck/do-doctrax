/**
 * DO-DocTrax: CFNR Document Tracking Application
 * Client-Side Controller & Interface Manager (Supabase Backend)
 */

const TABLE_MAP = {
  incoming_outgoing: 'incoming_outgoing_docs',
  email: 'email_logs',
  memo_external: 'memo_ao_external',
  personnel: 'personnel_appointments',
  cfnr_memo: 'cfnr_memos',
  cfnr_ao: 'cfnr_admin_orders',
  ppmp: 'ppmp_procurement'
};

const SEARCH_COLS = {
  incoming_outgoing: ['doctrax_no', 'from_unit', 'doc_type', 'description', 'status', 'received_by', 'remarks'],
  email: ['sender', 'doctrax_no', 'description', 'remarks'],
  memo_external: ['sender', 'doc_type', 'memo_no', 'subject', 'remarks'],
  personnel: ['doctrack_no', 'from_office', 'to_person', 'unit', 'doc_type', 'description', 'received_by', 'received_by_units'],
  cfnr_memo: ['memo_no', 'recipient', 'unit_for_oic', 'description', 'remarks'],
  cfnr_ao: ['ao_no', 'recipient', 'description', 'remarks'],
  ppmp: ['description', 'doctrack_no', 'remarks']
};

const DEFAULT_COURIERS = [
  'Kuya Paolo', 'Kuya Alberth', 'Kuya Emeng', 'Ms. April', 'John Ryan',
  'Ms. Glenda', 'Ms. Barbie (RA)', 'Ms. Nelia', 'Kuya Willie', 'Ryan Zafra (RA)'
];

const EXCEL_SHEETS = [
  {
    title: 'INCOMING-OUTGOING DOCS',
    table: 'incoming_outgoing_docs',
    headers: ['ID', 'Date', 'Doctrax', 'From', 'Document Type', 'Description', 'Status', 'Received by', 'Remarks'],
    columns: ['id', 'date', 'doctrax_no', 'from_unit', 'doc_type', 'description', 'status', 'received_by', 'remarks']
  },
  {
    title: 'EMAIL RECEIVED',
    table: 'email_logs',
    headers: ['ID', 'Date', 'From', 'Doctrax', 'Description', 'Deadline/Link', 'Remarks'],
    columns: ['id', 'date', 'sender', 'doctrax_no', 'description', 'deadline_link', 'remarks']
  },
  {
    title: 'MEMO, AO RECEIVED IN EMAIL',
    table: 'memo_ao_external',
    headers: ['ID', 'Date', 'From', 'Document Type', 'Memo No.', 'Description / Subject', 'Remarks'],
    columns: ['id', 'date', 'sender', 'doc_type', 'memo_no', 'subject', 'remarks']
  },
  {
    title: 'APPOINTMENT, NOSA, ETC.',
    table: 'personnel_appointments',
    headers: ['ID', 'Date', 'Doctrack', 'From', 'To', 'Unit', 'Document Type', 'Description', 'Received by', 'Received by UNITS', 'Remarks'],
    columns: ['id', 'date', 'doctrack_no', 'from_office', 'to_person', 'unit', 'doc_type', 'description', 'received_by', 'received_by_units', 'remarks']
  },
  {
    title: 'CFNR MEMO',
    table: 'cfnr_memos',
    headers: ['ID', 'Date', 'CFNR Memo No.', 'To', 'UNIT FOR OIC', 'Document Description', 'Remarks'],
    columns: ['id', 'date', 'memo_no', 'recipient', 'unit_for_oic', 'description', 'remarks']
  },
  {
    title: 'CFNR ADMIN ORDER',
    table: 'cfnr_admin_orders',
    headers: ['ID', 'Date', 'CFNR AO No.', 'To', 'Document Description', 'Remarks'],
    columns: ['id', 'date', 'ao_no', 'recipient', 'description', 'remarks']
  },
  {
    title: 'OUT PPMP',
    table: 'ppmp_procurement',
    headers: ['ID', 'Date', 'Document Type/Description', 'Doctrack No.', 'Amount', 'Remarks'],
    columns: ['id', 'date', 'description', 'doctrack_no', 'amount', 'remarks']
  }
];

function getSupabaseClient() {
  if (!window.docTraxAuth?.isAuthorized?.()) return null;
  return window.docTraxAuth.supabase || null;
}

function getCurrentUserEmail() {
  return window.docTraxAuth?.getSession?.()?.user?.email || null;
}

function canCurrentUserWrite() {
  const role = window.docTraxAuth?.getProfile?.()?.role || 'staff';
  return role === 'admin' || role === 'staff';
}

function handleSupabaseError(err, fallbackMsg) {
  console.error(fallbackMsg, err);
  const status = err?.status || err?.code;
  if (status === 401 || status === 'PGRST301') {
    showToast('Session expired. Please sign in again.', 'error');
    window.docTraxAuth?.signOut?.();
    return;
  }
  if (status === 403 || status === '42501') {
    showToast('Permission denied by database access policy.', 'error');
    return;
  }
  showToast(err?.message || fallbackMsg, 'error');
}

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

// Application Initialization (runs only after Auth Gate authorizes user)
let appInitialized = false;

async function initDocTraxApp() {
  if (!appInitialized) {
    setupEventListeners();
    appInitialized = true;
  }
  const btnNewRecord = document.getElementById('btn-new-record');
  if (btnNewRecord) {
    btnNewRecord.hidden = !canCurrentUserWrite();
  }
  await loadLookups();
  await loadStats();
  await loadDocuments();
}

window.addEventListener('doctrax:authorized', initDocTraxApp);
if (window.docTraxAuth?.isAuthorized?.()) {
  initDocTraxApp();
}

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

  // Export to Excel (browser-side from authenticated Supabase queries)
  document.getElementById('btn-export-excel').addEventListener('click', handleExportExcel);

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

// Fetch lookups from Supabase
async function loadLookups() {
  const sb = getSupabaseClient();
  if (!sb) return;

  try {
    const { data: rows, error } = await sb
      .from('lookup_values')
      .select('category, value, sort_order')
      .order('sort_order', { ascending: true })
      .order('value', { ascending: true });

    if (error) throw error;

    const lookups = {
      units: [],
      doc_types: [],
      statuses: [],
      appointment_types: [],
      memo_types: [],
      couriers: [...DEFAULT_COURIERS]
    };

    (rows || []).forEach(r => {
      if (r.category === 'unit' && !lookups.units.includes(r.value)) {
        lookups.units.push(r.value);
      } else if (r.category === 'doc_type' && !lookups.doc_types.includes(r.value)) {
        lookups.doc_types.push(r.value);
      } else if (r.category === 'status' && !lookups.statuses.includes(r.value)) {
        lookups.statuses.push(r.value);
      } else if (r.category === 'appointment_type' && !lookups.appointment_types.includes(r.value)) {
        lookups.appointment_types.push(r.value);
      } else if (r.category === 'memo_type' && !lookups.memo_types.includes(r.value)) {
        lookups.memo_types.push(r.value);
      }
    });

    state.lookups = lookups;

    // Populate Unit Filter
    const unitSelect = document.getElementById('filter-unit');
    unitSelect.innerHTML = '<option value="">All Units</option>';
    lookups.units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      unitSelect.appendChild(opt);
    });

    // Populate Status Filter
    const statusSelect = document.getElementById('filter-status');
    statusSelect.innerHTML = '<option value="">All Statuses</option>';
    lookups.statuses.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      statusSelect.appendChild(opt);
    });

    // Populate Custody Modal Courier select
    const courierSelect = document.getElementById('custody-courier-select');
    courierSelect.innerHTML = '';
    lookups.couriers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      courierSelect.appendChild(opt);
    });
  } catch (err) {
    handleSupabaseError(err, 'Failed to load lookup lists.');
  }
}

// Fetch operational stats & KPI counts from Supabase
async function loadStats() {
  const sb = getSupabaseClient();
  if (!sb) return;

  try {
    const categoryEntries = Object.entries(TABLE_MAP);
    const countPromises = categoryEntries.map(([catKey, tableName]) =>
      sb.from(tableName).select('id', { count: 'exact', head: true }).then(res => ({ catKey, res }))
    );

    const signedPromise = sb
      .from('incoming_outgoing_docs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['SIGNED', 'APPROVED']);

    const pendingPromise = sb
      .from('incoming_outgoing_docs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['FOR REVIEW', 'FOR APPROPRIATE ACTION', 'FOR COMMENTS']);

    const [catResults, signedRes, pendingRes] = await Promise.all([
      Promise.all(countPromises),
      signedPromise,
      pendingPromise
    ]);

    const counts = {};
    let totalAll = 0;
    for (const { catKey, res } of catResults) {
      if (res.error) throw res.error;
      const c = res.count || 0;
      counts[catKey] = c;
      totalAll += c;
    }

    if (signedRes.error) throw signedRes.error;
    if (pendingRes.error) throw pendingRes.error;

    const signedCount = signedRes.count || 0;
    const pendingCount = pendingRes.count || 0;

    state.stats = {
      total_all: totalAll,
      counts,
      signed_count: signedCount,
      pending_count: pendingCount
    };

    Object.keys(counts).forEach(k => {
      const badge = document.getElementById(`badge-${k}`);
      if (badge) badge.textContent = Number(counts[k]).toLocaleString();
    });

    document.getElementById('kpi-grand-total').textContent = Number(totalAll).toLocaleString();
    document.getElementById('kpi-signed').textContent = Number(signedCount).toLocaleString();
    document.getElementById('kpi-pending').textContent = Number(pendingCount).toLocaleString();
  } catch (err) {
    handleSupabaseError(err, 'Failed to load KPI stats.');
  }
}

// Load Documents for current category, page, and filters
async function loadDocuments() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const tableBody = document.getElementById('table-body');
  const tableEmpty = document.getElementById('table-empty');
  tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-faint);">Loading records...</td></tr>';
  tableEmpty.style.display = 'none';

  renderTableHeader();

  const tableName = TABLE_MAP[state.currentCategory] || 'incoming_outgoing_docs';
  const searchCols = SEARCH_COLS[state.currentCategory] || ['description'];
  const fromIdx = (state.currentPage - 1) * state.limit;
  const toIdx = fromIdx + state.limit - 1;

  try {
    let query = sb
      .from(tableName)
      .select('*', { count: 'exact' });

    if (state.searchQuery) {
      const sanitized = state.searchQuery.replace(/"/g, '').trim();
      if (sanitized) {
        const pattern = `"%${sanitized}%"`;
        query = query.or(searchCols.map(col => `${col}.ilike.${pattern}`).join(','));
      }
    }

    if (state.selectedUnit) {
      if (state.currentCategory === 'incoming_outgoing') {
        query = query.eq('from_unit', state.selectedUnit);
      } else if (state.currentCategory === 'personnel') {
        query = query.eq('unit', state.selectedUnit);
      } else if (state.currentCategory === 'cfnr_memo') {
        query = query.eq('unit_for_oic', state.selectedUnit);
      }
    }

    if (state.selectedStatus && state.currentCategory === 'incoming_outgoing') {
      query = query.eq('status', state.selectedStatus);
    }

    const { data: records, count, error } = await query
      .order('id', { ascending: false })
      .range(fromIdx, toIdx);

    if (error) throw error;

    const total = count || 0;
    state.totalRecords = total;
    state.totalPages = state.limit > 0 ? Math.max(1, Math.ceil(total / state.limit)) : 1;

    document.getElementById('kpi-cat-total').textContent = Number(total).toLocaleString();

    const startIdx = total > 0 ? fromIdx + 1 : 0;
    const endIdx = Math.min(state.currentPage * state.limit, total);
    document.getElementById('pagination-info').textContent = `Showing ${startIdx} to ${endIdx} of ${Number(total).toLocaleString()} records`;
    document.getElementById('current-page-display').textContent = `Page ${state.currentPage} of ${state.totalPages}`;

    if (!records || records.length === 0) {
      tableBody.innerHTML = '';
      tableEmpty.style.display = 'flex';
      return;
    }

    renderTableRows(records);
  } catch (err) {
    handleSupabaseError(err, 'Failed to load records from Supabase.');
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

        if (!canCurrentUserWrite()) {
          td.textContent = 'View only';
          td.style.color = 'var(--text-faint)';
          td.style.fontSize = '0.75rem';
          tr.appendChild(td);
          return;
        }

        // Custody Stamp button (for incoming_outgoing and personnel)
        if (state.currentCategory === 'incoming_outgoing' || state.currentCategory === 'personnel') {
          const stampBtn = document.createElement('button');
          stampBtn.className = 'btn btn-ghost btn-sm';
          stampBtn.title = 'One-click Pick-up Stamp';
          stampBtn.setAttribute('aria-label', 'One-click Pick-up Stamp');
          stampBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
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
  const sb = getSupabaseClient();
  if (!sb) return;
  if (!canCurrentUserWrite()) {
    showToast('Viewer accounts cannot modify records.', 'error');
    return;
  }

  const form = e.target;
  const formData = new FormData(form);
  const data = {};

  formData.forEach((value, key) => {
    data[key] = value.trim();
  });

  if (!state.editingRecordId && !data.date) {
    data.date = new Date().toISOString().split('T')[0];
  }

  const userEmail = getCurrentUserEmail();
  const tableName = TABLE_MAP[state.currentCategory] || 'incoming_outgoing_docs';

  try {
    if (state.editingRecordId) {
      data.updated_by = userEmail;
      const { error } = await sb
        .from(tableName)
        .update(data)
        .eq('id', state.editingRecordId);
      if (error) throw error;
      showToast('Record updated successfully!', 'success');
    } else {
      data.created_by = userEmail;
      data.updated_by = userEmail;
      const { error } = await sb
        .from(tableName)
        .insert(data);
      if (error) throw error;
      showToast('Document logged successfully!', 'success');
    }

    closeModal('modal-document');
    loadStats();
    loadDocuments();
  } catch (err) {
    handleSupabaseError(err, 'Failed to save record.');
  }
}

// Delete Record
async function handleDeleteRecord(id) {
  if (!confirm('Are you sure you want to permanently delete this record?')) return;
  const sb = getSupabaseClient();
  if (!sb) return;
  if (!canCurrentUserWrite()) {
    showToast('Viewer accounts cannot delete records.', 'error');
    return;
  }

  const tableName = TABLE_MAP[state.currentCategory] || 'incoming_outgoing_docs';

  try {
    const { error } = await sb
      .from(tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;

    showToast('Record deleted.', 'success');
    loadStats();
    loadDocuments();
  } catch (err) {
    handleSupabaseError(err, 'Failed to delete record.');
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
  const sb = getSupabaseClient();
  if (!sb) return;
  if (!canCurrentUserWrite()) {
    showToast('Viewer accounts cannot stamp records.', 'error');
    return;
  }

  const selectVal = document.getElementById('custody-courier-select').value;
  const customVal = document.getElementById('custody-courier-custom').value.trim();
  const courier = customVal || selectVal || 'Courier';

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const stampText = `pick up by ${courier} ${mm}/${dd}/${yyyy}`;
  const userEmail = getCurrentUserEmail();

  try {
    if (state.currentCategory === 'personnel') {
      const { error } = await sb
        .from('personnel_appointments')
        .update({ received_by_units: stampText, updated_by: userEmail })
        .eq('id', state.activeCustodyDocId);
      if (error) throw error;
    } else {
      const { error } = await sb
        .from('incoming_outgoing_docs')
        .update({ received_by: stampText, status: 'SIGNED', updated_by: userEmail })
        .eq('id', state.activeCustodyDocId);
      if (error) throw error;
    }

    showToast(`Stamped: ${stampText}`, 'success');
    closeModal('modal-custody');
    loadDocuments();
    loadStats();
  } catch (err) {
    handleSupabaseError(err, 'Error applying custody stamp.');
  }
}

// Browser-side Excel (.xlsx) Export from authenticated Supabase queries
async function fetchAllRowsForExport(sb, table, columns) {
  const pageSize = 1000;
  let offset = 0;
  const allRows = [];

  while (true) {
    const { data, error } = await sb
      .from(table)
      .select(columns.join(','))
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return allRows;
}

async function handleExportExcel() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const btn = document.getElementById('btn-export-excel');
  if (btn) btn.disabled = true;
  showToast('Fetching records & building Excel workbook...', 'info');

  try {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
    const wb = XLSX.utils.book_new();

    for (const sheetDef of EXCEL_SHEETS) {
      const rows = await fetchAllRowsForExport(sb, sheetDef.table, sheetDef.columns);
      const aoa = [
        sheetDef.headers,
        ...rows.map(rec => sheetDef.columns.map(col => rec[col] ?? ''))
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = sheetDef.headers.map((h, idx) => {
        const maxLen = Math.max(
          h.length,
          ...rows.slice(0, 50).map(r => String(r[sheetDef.columns[idx]] ?? '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 3, 12), 60) };
      });
      XLSX.utils.book_append_sheet(wb, ws, sheetDef.title);
    }

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    XLSX.writeFile(wb, `DOCTRAX_EXPORT_${stamp}.xlsx`);
    showToast('Excel workbook downloaded!', 'success');
  } catch (err) {
    handleSupabaseError(err, 'Failed to export Excel workbook.');
  } finally {
    if (btn) btn.disabled = false;
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
