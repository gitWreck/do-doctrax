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
    category: 'incoming_outgoing',
    title: 'INCOMING-OUTGOING DOCS',
    table: 'incoming_outgoing_docs',
    headers: ['ID', 'Date', 'Doctrax', 'From', 'Document Type', 'Description', 'Status', 'Received by', 'Remarks'],
    columns: ['id', 'date', 'doctrax_no', 'from_unit', 'doc_type', 'description', 'status', 'received_by', 'remarks']
  },
  {
    category: 'email',
    title: 'EMAIL RECEIVED',
    table: 'email_logs',
    headers: ['ID', 'Date', 'From', 'Doctrax', 'Description', 'Deadline/Link', 'Remarks'],
    columns: ['id', 'date', 'sender', 'doctrax_no', 'description', 'deadline_link', 'remarks']
  },
  {
    category: 'memo_external',
    title: 'MEMO, AO RECEIVED IN EMAIL',
    table: 'memo_ao_external',
    headers: ['ID', 'Date', 'From', 'Document Type', 'Memo No.', 'Description / Subject', 'Remarks'],
    columns: ['id', 'date', 'sender', 'doc_type', 'memo_no', 'subject', 'remarks']
  },
  {
    category: 'personnel',
    title: 'APPOINTMENT, NOSA, ETC.',
    table: 'personnel_appointments',
    headers: ['ID', 'Date', 'Doctrack', 'From', 'To', 'Unit', 'Document Type', 'Description', 'Received by', 'Received by UNITS', 'Remarks'],
    columns: ['id', 'date', 'doctrack_no', 'from_office', 'to_person', 'unit', 'doc_type', 'description', 'received_by', 'received_by_units', 'remarks']
  },
  {
    category: 'cfnr_memo',
    title: 'CFNR MEMO',
    table: 'cfnr_memos',
    headers: ['ID', 'Date', 'CFNR Memo No.', 'To', 'UNIT FOR OIC', 'Document Description', 'Remarks'],
    columns: ['id', 'date', 'memo_no', 'recipient', 'unit_for_oic', 'description', 'remarks']
  },
  {
    category: 'cfnr_ao',
    title: 'CFNR ADMIN ORDER',
    table: 'cfnr_admin_orders',
    headers: ['ID', 'Date', 'CFNR AO No.', 'To', 'Document Description', 'Remarks'],
    columns: ['id', 'date', 'ao_no', 'recipient', 'description', 'remarks']
  },
  {
    category: 'ppmp',
    title: 'OUT PPMP',
    table: 'ppmp_procurement',
    headers: ['ID', 'Date', 'Document Type/Description', 'Doctrack No.', 'Amount', 'Remarks'],
    columns: ['id', 'date', 'description', 'doctrack_no', 'amount', 'remarks']
  }
];

const EXPORT_TAB_FILTERS = {
  incoming_outgoing: [
    { name: 'from_unit', label: 'Unit', type: 'combobox', lookup: 'units', placeholder: 'All Units', fromState: 'selectedUnit' },
    { name: 'doc_type', label: 'Document Type', type: 'combobox', lookup: 'doc_types', placeholder: 'All Document Types' },
    { name: 'status', label: 'Status', type: 'combobox', lookup: 'statuses', placeholder: 'All Statuses', fromState: 'selectedStatus' }
  ],
  email: [
    { name: 'sender', label: 'Sender / Office', type: 'text', placeholder: 'e.g. OC UPLB, IRRI' }
  ],
  memo_external: [
    { name: 'doc_type', label: 'Issuance Type', type: 'combobox', lookup: 'memo_types', placeholder: 'All Types (Memo / AO)' },
    { name: 'sender', label: 'Issuing Office', type: 'text', placeholder: 'e.g. Office of the Chancellor' }
  ],
  personnel: [
    { name: 'unit', label: 'CFNR Unit', type: 'combobox', lookup: 'units', placeholder: 'All Units', fromState: 'selectedUnit' },
    { name: 'doc_type', label: 'Action Type', type: 'combobox', lookup: 'appointment_types', placeholder: 'All Action Types' },
    { name: 'from_office', label: 'Issuing Office', type: 'text', placeholder: 'e.g. OVCA, OC, HRDO' }
  ],
  cfnr_memo: [
    { name: 'unit_for_oic', label: 'Unit for OIC', type: 'combobox', lookup: 'units', placeholder: 'All Units', fromState: 'selectedUnit' },
    { name: 'recipient', label: 'Addressed To', type: 'text', placeholder: 'Filter recipient name...' }
  ],
  cfnr_ao: [
    { name: 'recipient', label: 'Appointed Members', type: 'text', placeholder: 'Filter appointed members...' }
  ],
  ppmp: [
    { name: 'doctrack_no', label: 'Doctrack No.', type: 'text', placeholder: 'Filter Doctrack No...' }
  ]
};

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
  currentCategory: 'dashboard',
  currentPage: 1,
  limit: 50,
  totalPages: 1,
  totalRecords: 0,
  searchQuery: '',
  selectedUnit: '',
  selectedStatus: '',
  selectedYear: '',
  lookups: {
    units: [],
    doc_types: [],
    statuses: [],
    appointment_types: [],
    memo_types: [],
    years: [],
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
      { name: 'doc_type', label: 'Action Type', type: 'combobox', lookup: 'appointment_types', placeholder: 'Select or type action type...' },
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
      { name: 'recipient', label: 'Addressed To', type: 'textarea', rows: 1, compact: true, placeholder: 'e.g. DR. ANALYN L. CODILAN' },
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

function switchCategoryTab(category) {
  state.currentCategory = category;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.category === category);
  });

  const isDashboard = category === 'dashboard';
  const dashboardView = document.getElementById('dashboard-view');
  const logbookView = document.getElementById('logbook-view');
  const btnNewRecord = document.getElementById('btn-new-record');

  if (dashboardView) dashboardView.hidden = !isDashboard;
  if (logbookView) logbookView.hidden = isDashboard;
  if (btnNewRecord) btnNewRecord.hidden = isDashboard || !canCurrentUserWrite();

  if (isDashboard) {
    window.docTraxDashboard?.activate?.(switchCategoryTab);
    return;
  }

  state.currentPage = 1;
  state.searchQuery = '';
  document.getElementById('filter-search').value = '';
  updateToolbarForCategory();
  renderKpiCards();
  loadDocuments();
}

async function initDocTraxApp() {
  if (!appInitialized) {
    setupEventListeners();
    appInitialized = true;
  }
  const navManageUsers = document.getElementById('nav-manage-users');
  if (navManageUsers) {
    navManageUsers.hidden = window.docTraxAuth?.getProfile?.()?.role !== 'admin';
  }
  await loadLookups();
  await loadStats();
  switchCategoryTab(state.currentCategory);
}

window.addEventListener('doctrax:authorized', initDocTraxApp);
if (window.docTraxAuth?.isAuthorized?.()) {
  initDocTraxApp();
}

// Event Listeners Setup
function setupEventListeners() {
  // Category Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchCategoryTab(tab.dataset.category);
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

  // Typable Toolbar Filter Comboboxes
  initToolbarFilters();

  // Reset Filters Button
  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    state.searchQuery = '';
    state.selectedUnit = '';
    state.selectedStatus = '';
    state.selectedYear = '';
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-unit').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-year').value = '';
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

  // Export to Excel (opens filter modal)
  document.getElementById('btn-export-excel').addEventListener('click', openExportModal);
  document.getElementById('form-export').addEventListener('submit', handleExportExcel);
  document.getElementById('btn-export-clear').addEventListener('click', () => {
    const container = document.getElementById('export-form-fields');
    if (!container) return;
    container.querySelectorAll('input').forEach(el => { el.value = ''; });
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

    const maxYear = Math.max(2026, new Date().getFullYear());
    const years = [];
    for (let y = maxYear; y >= 2025; y--) {
      years.push(String(y));
    }

    const lookups = {
      units: [],
      doc_types: [],
      statuses: [],
      appointment_types: [],
      memo_types: [],
      years,
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

function updateToolbarForCategory() {
  const statusWrapper = document.getElementById('filter-status-wrapper');
  const hideStatus = state.currentCategory === 'cfnr_memo' || state.currentCategory === 'cfnr_ao';
  if (statusWrapper) {
    statusWrapper.hidden = hideStatus;
  }
  if (hideStatus && state.selectedStatus) {
    state.selectedStatus = '';
    const statusInput = document.getElementById('filter-status');
    if (statusInput) statusInput.value = '';
  }
}

function renderKpiCards() {
  const label1 = document.getElementById('kpi-label-1');
  const sub1 = document.getElementById('kpi-sub-1');
  const label2 = document.getElementById('kpi-label-2');
  const val2 = document.getElementById('kpi-signed');
  const sub2 = document.getElementById('kpi-sub-2');
  const label3 = document.getElementById('kpi-label-3');
  const val3 = document.getElementById('kpi-pending');
  const sub3 = document.getElementById('kpi-sub-3');

  const stats = state.stats || {};
  const counts = stats.counts || {};

  if (state.currentCategory === 'memo_external') {
    label1.textContent = 'Total Registered Transactions';
    sub1.textContent = 'University Memos & AO';
    label2.textContent = 'Total Number of Memoranda';
    val2.textContent = Number(stats.memo_external_memoranda || 0).toLocaleString();
    sub2.textContent = 'External university memoranda';
    label3.textContent = 'Total Number of Admin Orders';
    val3.textContent = Number(stats.memo_external_admin_orders || 0).toLocaleString();
    sub3.textContent = 'External administrative orders';
    return;
  }

  if (state.currentCategory === 'cfnr_memo' || state.currentCategory === 'cfnr_ao') {
    label1.textContent = 'Total Registered Transactions';
    sub1.textContent = state.currentCategory === 'cfnr_memo' ? 'CFNR Internal Memos' : 'CFNR Admin Orders';
    label2.textContent = 'Total Number of Memoranda';
    val2.textContent = Number(counts.cfnr_memo || 0).toLocaleString();
    sub2.textContent = 'CFNR internal memoranda';
    label3.textContent = 'Total Number of Admin Orders';
    val3.textContent = Number(counts.cfnr_ao || 0).toLocaleString();
    sub3.textContent = 'CFNR internal administrative orders';
    return;
  }

  label1.textContent = 'Total Registered Transactions';
  sub1.textContent = 'Active category total';
  label2.textContent = 'Signed / Completed';
  val2.textContent = Number(stats.signed_count || 0).toLocaleString();
  sub2.textContent = 'Released or filed documents';
  label3.textContent = 'For Review / Action';
  val3.textContent = Number(stats.pending_count || 0).toLocaleString();
  sub3.textContent = 'Currently pending review';
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

    const extMemoPromise = sb
      .from('memo_ao_external')
      .select('id', { count: 'exact', head: true })
      .ilike('doc_type', 'Memorandum');

    const extAoPromise = sb
      .from('memo_ao_external')
      .select('id', { count: 'exact', head: true })
      .ilike('doc_type', 'Admin Order');

    const [catResults, signedRes, pendingRes, extMemoRes, extAoRes] = await Promise.all([
      Promise.all(countPromises),
      signedPromise,
      pendingPromise,
      extMemoPromise,
      extAoPromise
    ]);

    const counts = {};
    for (const { catKey, res } of catResults) {
      if (res.error) throw res.error;
      counts[catKey] = res.count || 0;
    }

    if (signedRes.error) throw signedRes.error;
    if (pendingRes.error) throw pendingRes.error;
    if (extMemoRes.error) throw extMemoRes.error;
    if (extAoRes.error) throw extAoRes.error;

    state.stats = {
      counts,
      signed_count: signedRes.count || 0,
      pending_count: pendingRes.count || 0,
      memo_external_memoranda: extMemoRes.count || 0,
      memo_external_admin_orders: extAoRes.count || 0
    };

    Object.keys(counts).forEach(k => {
      const badge = document.getElementById(`badge-${k}`);
      if (badge) badge.textContent = Number(counts[k]).toLocaleString();
    });

    renderKpiCards();
  } catch (err) {
    handleSupabaseError(err, 'Failed to load KPI stats.');
  }
}

function applySearchFilter(query, searchCols, rawSearch) {
  const sanitized = (rawSearch || '').replace(/"/g, '').trim();
  if (!sanitized || !searchCols?.length) return query;
  const pattern = `"%${sanitized}%"`;
  return query.or(searchCols.map(col => `${col}.ilike.${pattern}`).join(','));
}

function applyLookupOrLikeFilter(query, column, rawValue, lookupList = []) {
  const clean = (rawValue || '').trim();
  if (!clean || !column) return query;
  const exactMatch = lookupList.some(item => item.toLowerCase() === clean.toLowerCase());
  return exactMatch
    ? query.ilike(column, clean)
    : query.ilike(column, `%${clean}%`);
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

    query = applySearchFilter(query, searchCols, state.searchQuery);

    if (state.selectedUnit) {
      const unitCol = state.currentCategory === 'incoming_outgoing'
        ? 'from_unit'
        : state.currentCategory === 'personnel'
          ? 'unit'
          : state.currentCategory === 'cfnr_memo'
            ? 'unit_for_oic'
            : null;
      query = applyLookupOrLikeFilter(query, unitCol, state.selectedUnit, state.lookups.units || []);
    }

    if (state.selectedStatus && state.currentCategory === 'incoming_outgoing') {
      query = applyLookupOrLikeFilter(query, 'status', state.selectedStatus, state.lookups.statuses || []);
    }

    if (state.selectedYear) {
      const cleanYear = state.selectedYear.trim();
      if (cleanYear) {
        query = query.ilike('date', `%${cleanYear}%`);
      }
    }

    const { data: records, count, error } = await query
      .order('date', { ascending: false, nullsFirst: false })
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
        td.textContent = val ? formatReadableDate(val) : '—';
        if (val) td.title = val;

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
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function parseDateParts(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let year, month, day;

  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const longMatch = s.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (slashMatch) {
    month = Number(slashMatch[1]);
    day = Number(slashMatch[2]);
    year = Number(slashMatch[3]);
  } else if (longMatch) {
    const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === longMatch[1].toLowerCase());
    if (monthIdx === -1) return null;
    month = monthIdx + 1;
    day = Number(longMatch[2]);
    year = Number(longMatch[3]);
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
    return null;
  }
  return { year, month, day };
}

function formatReadableDate(raw) {
  const parts = parseDateParts(raw);
  if (!parts) return String(raw);
  const dd = String(parts.day).padStart(2, '0');
  return `${dd} ${MONTH_NAMES[parts.month - 1]} ${parts.year}`;
}

function toIsoDate(raw) {
  const parts = parseDateParts(raw);
  if (!parts) return String(raw || '');
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

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

// Shared Combobox Binding Helper (for both toolbar filters and form modals)
function bindCombobox(wrapper, getOptions, { resetLabel = null, allowCustom = true, onValueChange = null } = {}) {
  if (!wrapper) return;
  const input = wrapper.querySelector('.combobox-input');
  const toggleBtn = wrapper.querySelector('.combobox-toggle');
  const dropdown = wrapper.querySelector('.combobox-dropdown');
  if (!input || !toggleBtn || !dropdown) return;

  function renderOptions(filterText = '', showAll = false) {
    const allOptions = getOptions() || [];
    const cleanFilter = filterText.toLowerCase().trim();
    const filtered = (showAll || !cleanFilter)
      ? allOptions
      : allOptions.filter(opt => String(opt).toLowerCase().includes(cleanFilter));

    let itemsHtml = '';
    if (resetLabel && (showAll || !cleanFilter)) {
      const isResetSelected = !input.value.trim();
      itemsHtml += `<div class="combobox-item ${isResetSelected ? 'selected' : ''}" data-value="">${escapeHtml(resetLabel)}</div>`;
    }

    if (filtered.length === 0) {
      itemsHtml += allowCustom
        ? `<div class="combobox-empty">Use custom: "<strong>${escapeHtml(filterText)}</strong>"</div>`
        : `<div class="combobox-empty">No matching options</div>`;
    } else {
      itemsHtml += filtered.map(opt => {
        const isSelected = String(opt).toLowerCase() === input.value.toLowerCase().trim();
        return `<div class="combobox-item ${isSelected ? 'selected' : ''}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`;
      }).join('');
    }

    dropdown.innerHTML = itemsHtml;

    dropdown.querySelectorAll('.combobox-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = item.dataset.value;
        closeDropdown();
        input.focus();
        if (onValueChange) {
          onValueChange(input.value, { immediate: true });
        } else {
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
  }

  const inModal = Boolean(wrapper.closest('.modal-card'));
  const modalBody = wrapper.closest('.modal-body');

  function positionFloatingDropdown() {
    if (!inModal || dropdown.style.display !== 'block') return;
    if (!wrapper.isConnected) {
      closeDropdown();
      return;
    }
    const rect = wrapper.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(100, Math.min(210, openUpward ? spaceAbove : spaceBelow));

    dropdown.style.position = 'fixed';
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
    dropdown.style.right = 'auto';
    dropdown.style.zIndex = '1200';
    dropdown.style.maxHeight = `${maxHeight}px`;

    if (openUpward) {
      dropdown.style.top = 'auto';
      dropdown.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    } else {
      dropdown.style.bottom = 'auto';
      dropdown.style.top = `${rect.bottom + 4}px`;
    }
  }

  function handleScrollOrResize() {
    closeDropdown();
  }

  function openDropdown(showAll = false) {
    renderOptions(input.value, showAll);
    if (inModal) {
      if (dropdown.parentElement !== document.body) {
        document.body.appendChild(dropdown);
      }
      dropdown.style.display = 'block';
      positionFloatingDropdown();
      if (modalBody) modalBody.addEventListener('scroll', handleScrollOrResize, { passive: true });
      window.addEventListener('resize', handleScrollOrResize, { passive: true });
    } else {
      dropdown.style.display = 'block';
    }
    const sel = dropdown.querySelector('.combobox-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function closeDropdown() {
    dropdown.style.display = 'none';
    const active = dropdown.querySelector('.combobox-item.active');
    if (active) active.classList.remove('active');
    if (inModal) {
      if (modalBody) modalBody.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      dropdown.style.position = '';
      dropdown.style.left = '';
      dropdown.style.top = '';
      dropdown.style.bottom = '';
      dropdown.style.width = '';
      dropdown.style.right = '';
      dropdown.style.zIndex = '';
      dropdown.style.maxHeight = '';
      if (wrapper.isConnected) {
        wrapper.appendChild(dropdown);
      } else {
        dropdown.remove();
      }
    }
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
    if (onValueChange) {
      onValueChange(input.value, { immediate: input.value.trim() === '' });
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(closeDropdown, 160);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      if (dropdown.style.display !== 'block') {
        openDropdown(true);
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
        if (onValueChange) onValueChange(input.value, { immediate: true });
      } else if (onValueChange) {
        e.preventDefault();
        closeDropdown();
        onValueChange(input.value, { immediate: true });
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });
}

function initToolbarFilters() {
  let unitTimer;
  bindCombobox(
    document.getElementById('filter-unit-wrapper'),
    () => state.lookups.units,
    {
      resetLabel: 'All Units',
      onValueChange: (val, { immediate }) => {
        clearTimeout(unitTimer);
        const apply = () => {
          state.selectedUnit = val.trim();
          state.currentPage = 1;
          loadDocuments();
        };
        if (immediate) apply();
        else unitTimer = setTimeout(apply, 250);
      }
    }
  );

  let statusTimer;
  bindCombobox(
    document.getElementById('filter-status-wrapper'),
    () => state.lookups.statuses,
    {
      resetLabel: 'All Statuses',
      onValueChange: (val, { immediate }) => {
        clearTimeout(statusTimer);
        const apply = () => {
          state.selectedStatus = val.trim();
          state.currentPage = 1;
          loadDocuments();
        };
        if (immediate) apply();
        else statusTimer = setTimeout(apply, 250);
      }
    }
  );

  let yearTimer;
  bindCombobox(
    document.getElementById('filter-year-wrapper'),
    () => state.lookups.years,
    {
      resetLabel: 'All Years',
      onValueChange: (val, { immediate }) => {
        clearTimeout(yearTimer);
        const trimmed = val.trim();
        const apply = () => {
          state.selectedYear = trimmed;
          state.currentPage = 1;
          loadDocuments();
        };
        if (immediate || trimmed === '' || /^\d{4}$/.test(trimmed)) {
          apply();
        } else {
          yearTimer = setTimeout(apply, 350);
        }
      }
    }
  );
}

function renderComboboxFieldHtml(name, value = '', placeholder = '') {
  return `
    <div class="combobox-wrapper" data-combobox-field="${name}">
      <input type="text"
             name="${name}"
             class="input-text combobox-input"
             value="${escapeHtml(value)}"
             placeholder="${escapeHtml(placeholder)}"
             autocomplete="off">
      <button type="button" class="combobox-toggle" tabindex="-1" title="Show suggestions">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <div class="combobox-dropdown" style="display: none;"></div>
    </div>`;
}

// Initialize Comboboxes inside dynamic form modals
function initComboboxes(container, fieldsDef = null) {
  const fields = fieldsDef || (CATEGORY_CONFIG[state.currentCategory]?.fields || []);
  container.querySelectorAll('.combobox-wrapper').forEach(wrapper => {
    const fieldName = wrapper.dataset.comboboxField;
    const fieldDef = fields.find(f => f.name === fieldName);
    bindCombobox(wrapper, () => (fieldDef && state.lookups[fieldDef.lookup]) ? state.lookups[fieldDef.lookup] : []);
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
      if (f.type === 'date' && val) {
        val = toIsoDate(val);
      }
    } else if (f.defaultToday) {
      val = new Date().toISOString().split('T')[0];
    }

    html += `<div class="form-group ${colClass}">`;
    html += `<label class="form-label">${f.label}</label>`;

    if (f.type === 'combobox') {
      html += renderComboboxFieldHtml(f.name, val, f.placeholder || `Type or select ${f.label}...`);
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
      const compactClass = f.compact ? ' textarea-compact' : '';
      html += `<textarea name="${f.name}" rows="${f.rows || 3}" class="input-text${compactClass}" placeholder="${f.placeholder || ''}">${escapeHtml(val)}</textarea>`;
    } else {
      html += `<input type="${f.type || 'text'}" name="${f.name}" class="input-text" value="${escapeHtml(val)}" placeholder="${f.placeholder || ''}">`;
    }

    html += `</div>`;
  });
  html += '</div>';

  fieldsContainer.innerHTML = html;
  initComboboxes(fieldsContainer);
  modal.classList.add('open');

  const autoResize = el => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  fieldsContainer.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', () => autoResize(ta));
    requestAnimationFrame(() => autoResize(ta));
  });
}

function closeModal(modalId) {
  document.querySelectorAll('body > .combobox-dropdown').forEach(dd => {
    dd.style.display = 'none';
  });
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
    window.docTraxDashboard?.invalidateCache?.();
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
    window.docTraxDashboard?.invalidateCache?.();
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
    window.docTraxDashboard?.invalidateCache?.();
    loadDocuments();
    loadStats();
  } catch (err) {
    handleSupabaseError(err, 'Error applying custody stamp.');
  }
}

// Browser-side Excel (.xlsx) Export Modal & Filtered Queries
function openExportModal() {
  const modal = document.getElementById('modal-export');
  const title = document.getElementById('modal-export-title');
  const fieldsContainer = document.getElementById('export-form-fields');
  const cat = state.currentCategory;
  const isDashboard = cat === 'dashboard';
  const config = CATEGORY_CONFIG[cat];
  const tabFilters = isDashboard ? [] : (EXPORT_TAB_FILTERS[cat] || []);

  title.textContent = isDashboard
    ? 'Export Excel — All Document Logs'
    : `Export Excel — ${config.title}`;

  const comboboxDefs = [
    { name: 'year', lookup: 'years' },
    ...tabFilters.filter(f => f.type === 'combobox')
  ];

  let html = '<div class="form-grid">';
  html += `
    <div class="form-group col-span-2">
      <label class="form-label">Export Scope</label>
      <select name="scope" id="export-scope" class="select-control">
        ${isDashboard ? '' : `<option value="current" selected>Current Tab: ${escapeHtml(config.title)}</option>`}
        <option value="all" ${isDashboard ? 'selected' : ''}>All Document Logs (Multi-Sheet Workbook)</option>
      </select>
    </div>

    <div class="form-section-heading">Date &amp; Year Filters</div>

    <div class="form-group">
      <label class="form-label">Year</label>
      ${renderComboboxFieldHtml('year', state.selectedYear || '', 'All Years (e.g. 2026)')}
    </div>

    <div class="form-group">
      <label class="form-label">Keyword Search</label>
      <input type="text" name="search" class="input-text" value="${escapeHtml(state.searchQuery || '')}" placeholder="Doctrax #, name, keyword...">
    </div>

    <div class="form-group">
      <label class="form-label">Date From</label>
      <input type="date" name="dateFrom" class="input-text">
    </div>

    <div class="form-group">
      <label class="form-label">Date To</label>
      <input type="date" name="dateTo" class="input-text">
    </div>
  `;

  if (tabFilters.length > 0) {
    html += `<div id="export-tab-filters-section" class="col-span-2 form-grid">`;
    html += `<div class="form-section-heading">${escapeHtml(config.title)} Filters</div>`;
    tabFilters.forEach(f => {
      const initialVal = f.fromState ? (state[f.fromState] || '') : '';
      html += `<div class="form-group">`;
      html += `<label class="form-label">${escapeHtml(f.label)}</label>`;
      if (f.type === 'combobox') {
        html += renderComboboxFieldHtml(f.name, initialVal, f.placeholder || `Type or select ${f.label}...`);
      } else {
        html += `<input type="text" name="${f.name}" class="input-text" value="${escapeHtml(initialVal)}" placeholder="${escapeHtml(f.placeholder || '')}">`;
      }
      html += `</div>`;
    });
    html += `</div>`;
  }

  html += `
    <div id="export-all-tabs-hint" class="export-tab-hint col-span-2" hidden>
      Tab-specific filters only apply to <strong>Current Tab</strong> export. Year, Date Range, and Keyword filters will apply across all sheets.
    </div>
  `;
  html += '</div>';

  fieldsContainer.innerHTML = html;
  initComboboxes(fieldsContainer, comboboxDefs);

  const scopeSelect = document.getElementById('export-scope');
  const tabSection = document.getElementById('export-tab-filters-section');
  const allHint = document.getElementById('export-all-tabs-hint');
  if (scopeSelect) {
    scopeSelect.addEventListener('change', () => {
      const isAll = scopeSelect.value === 'all';
      if (tabSection) tabSection.hidden = isAll;
      if (allHint) allHint.hidden = !isAll;
    });
  }

  modal.classList.add('open');
}

async function fetchAllRowsForExport(sb, sheetDef, filterCriteria = {}) {
  const pageSize = 1000;
  let offset = 0;
  const allRows = [];

  const tabFilters = EXPORT_TAB_FILTERS[sheetDef.category] || [];
  const searchCols = SEARCH_COLS[sheetDef.category] || [];

  while (true) {
    let query = sb
      .from(sheetDef.table)
      .select(sheetDef.columns.join(','));

    if (filterCriteria.year) {
      query = query.ilike('date', `%${filterCriteria.year}%`);
    }

    if (filterCriteria.search) {
      query = applySearchFilter(query, searchCols, filterCriteria.search);
    }

    if (filterCriteria.scope === 'current' && filterCriteria.tabValues) {
      tabFilters.forEach(f => {
        const val = filterCriteria.tabValues[f.name];
        if (val) {
          const list = f.lookup ? (state.lookups[f.lookup] || []) : [];
          query = applyLookupOrLikeFilter(query, f.name, val, list);
        }
      });
    }

    const { data, error } = await query
      .order('date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  const { dateFrom, dateTo } = filterCriteria;
  if (dateFrom || dateTo) {
    return allRows.filter(rec => {
      if (!parseDateParts(rec.date)) return false;
      const iso = toIsoDate(rec.date);
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    });
  }

  return allRows;
}

async function handleExportExcel(e) {
  e.preventDefault();
  const sb = getSupabaseClient();
  if (!sb) return;

  const formData = new FormData(e.target);
  const scope = (formData.get('scope') || 'current').toString();
  const year = (formData.get('year') || '').toString().trim();
  const search = (formData.get('search') || '').toString().trim();
  const dateFrom = (formData.get('dateFrom') || '').toString().trim();
  const dateTo = (formData.get('dateTo') || '').toString().trim();

  if (dateFrom && dateTo && dateFrom > dateTo) {
    showToast('Date From cannot be later than Date To.', 'error');
    return;
  }

  const tabValues = {};
  (EXPORT_TAB_FILTERS[state.currentCategory] || []).forEach(f => {
    const val = (formData.get(f.name) || '').toString().trim();
    if (val) tabValues[f.name] = val;
  });

  const filterCriteria = { scope, year, search, dateFrom, dateTo, tabValues };
  const sheetsToExport = scope === 'all'
    ? EXCEL_SHEETS
    : EXCEL_SHEETS.filter(s => s.category === state.currentCategory);

  const btnConfirm = document.getElementById('btn-confirm-export');
  const btnToolbar = document.getElementById('btn-export-excel');
  if (btnConfirm) btnConfirm.disabled = true;
  if (btnToolbar) btnToolbar.disabled = true;
  showToast('Fetching records & building Excel workbook...', 'info');

  try {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
    const wb = XLSX.utils.book_new();
    let totalExported = 0;

    for (const sheetDef of sheetsToExport) {
      const rows = await fetchAllRowsForExport(sb, sheetDef, filterCriteria);
      totalExported += rows.length;
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

    if (totalExported === 0) {
      showToast('No matching records found for the selected filters.', 'error');
      return;
    }

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const prefix = scope === 'all' ? 'DOCTRAX_EXPORT' : `DOCTRAX_${state.currentCategory.toUpperCase()}`;
    XLSX.writeFile(wb, `${prefix}_${stamp}.xlsx`);
    closeModal('modal-export');
    showToast(`Exported ${totalExported.toLocaleString()} record(s) to Excel!`, 'success');
  } catch (err) {
    handleSupabaseError(err, 'Failed to export Excel workbook.');
  } finally {
    if (btnConfirm) btnConfirm.disabled = false;
    if (btnToolbar) btnToolbar.disabled = false;
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
