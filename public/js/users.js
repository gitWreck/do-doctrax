/**
 * DO-DocTrax: Authorized Users Management Controller
 * Allows admins to add, update, toggle, and remove users in public.allowed_users.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const usersState = {
  allUsers: [],
  searchQuery: '',
  roleFilter: '',
  statusFilter: '',
  editingUserId: null,
  initialized: false
};

function getSupabaseClient() {
  if (!window.docTraxAuth?.isAuthorized?.()) return null;
  return window.docTraxAuth.supabase || null;
}

function getCurrentUserEmail() {
  return (window.docTraxAuth?.getSession?.()?.user?.email || '').trim().toLowerCase();
}

function isCurrentUserAdmin() {
  return window.docTraxAuth?.getProfile?.()?.role === 'admin';
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatReadableTimestamp(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr);
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';

  let iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
  if (type === 'error') {
    iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  }

  toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 200ms ease-out';
    setTimeout(() => toast.remove(), 200);
  }, 3200);
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
    showToast('Permission denied. Only administrators can manage users.', 'error');
    return;
  }
  if (status === '23505') {
    showToast('That email address is already registered.', 'error');
    return;
  }
  showToast(err?.message || fallbackMsg, 'error');
}

function closeUserModal() {
  const modal = document.getElementById('modal-user');
  if (modal) modal.classList.remove('open');
  usersState.editingUserId = null;
}

function openUserModal(user = null) {
  const modal = document.getElementById('modal-user');
  const title = document.getElementById('modal-user-title');
  const emailInput = document.getElementById('user-email-input');
  const nameInput = document.getElementById('user-name-input');
  const roleSelect = document.getElementById('user-role-select');
  const activeSelect = document.getElementById('user-active-select');

  usersState.editingUserId = user ? user.id : null;
  const isSelf = user && user.email.trim().toLowerCase() === getCurrentUserEmail();

  title.textContent = user ? 'Edit Authorized User' : 'Add Authorized User';
  emailInput.value = user ? user.email : '';
  emailInput.readOnly = Boolean(user);
  emailInput.style.backgroundColor = user ? 'var(--bg-subtle)' : '';
  nameInput.value = user ? (user.full_name || '') : '';
  roleSelect.value = user ? (user.role || 'staff') : 'staff';
  activeSelect.value = user ? String(user.is_active !== false) : 'true';

  roleSelect.disabled = Boolean(isSelf);
  activeSelect.disabled = Boolean(isSelf);

  modal.classList.add('open');
  setTimeout(() => (user ? nameInput : emailInput).focus(), 40);
}

async function loadUsers() {
  const sb = getSupabaseClient();
  if (!sb) return;

  const tbody = document.getElementById('users-table-body');
  const empty = document.getElementById('users-empty');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-faint);">Loading users...</td></tr>';
  empty.style.display = 'none';

  try {
    const { data, error } = await sb
      .from('allowed_users')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    usersState.allUsers = data || [];
    renderUsersStats();
    renderUsersTable();
  } catch (err) {
    tbody.innerHTML = '';
    handleSupabaseError(err, 'Failed to load authorized users.');
  }
}

function renderUsersStats() {
  const all = usersState.allUsers;
  const activeCount = all.filter(u => u.is_active).length;
  const adminCount = all.filter(u => u.role === 'admin' && u.is_active).length;

  document.getElementById('kpi-users-total').textContent = all.length.toLocaleString();
  document.getElementById('kpi-users-active').textContent = activeCount.toLocaleString();
  document.getElementById('kpi-users-admins').textContent = adminCount.toLocaleString();
}

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  const empty = document.getElementById('users-empty');
  const q = usersState.searchQuery.toLowerCase();
  const roleFilter = usersState.roleFilter;
  const statusFilter = usersState.statusFilter;
  const currentEmail = getCurrentUserEmail();

  const filtered = usersState.allUsers.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;
    if (q) {
      const nameMatch = (u.full_name || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      if (!nameMatch && !emailMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = filtered.map(u => {
    const isSelf = (u.email || '').trim().toLowerCase() === currentEmail;
    const roleClass = u.role === 'admin' ? 'admin' : (u.role === 'viewer' ? 'viewer' : 'staff');
    const statusBadge = u.is_active
      ? '<span class="status-badge signed">Active</span>'
      : '<span class="status-badge returned">Inactive</span>';
    const toggleLabel = u.is_active ? 'Deactivate' : 'Activate';

    return `
      <tr>
        <td style="font-weight: 600;">
          ${escapeHtml(u.full_name || '—')}
          ${isSelf ? '<span style="font-size: 0.6875rem; font-weight: 600; color: var(--primary-700); margin-left: 0.375rem;">(You)</span>' : ''}
        </td>
        <td class="cell-code">${escapeHtml(u.email)}</td>
        <td><span class="role-pill ${roleClass}">${escapeHtml(u.role)}</span></td>
        <td>${statusBadge}</td>
        <td class="cell-date">${escapeHtml(formatReadableTimestamp(u.created_at))}</td>
        <td>
          <div class="actions-cell">
            <button type="button" class="btn btn-secondary btn-sm btn-edit-user" data-id="${escapeHtml(u.id)}">Edit</button>
            ${isSelf ? '' : `
              <button type="button" class="btn btn-secondary btn-sm btn-toggle-user" data-id="${escapeHtml(u.id)}">${toggleLabel}</button>
              <button type="button" class="btn btn-danger-ghost btn-sm btn-remove-user" data-id="${escapeHtml(u.id)}">Remove</button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = usersState.allUsers.find(u => u.id === btn.dataset.id);
      if (user) openUserModal(user);
    });
  });

  tbody.querySelectorAll('.btn-toggle-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = usersState.allUsers.find(u => u.id === btn.dataset.id);
      if (user) handleToggleUserActive(user);
    });
  });

  tbody.querySelectorAll('.btn-remove-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = usersState.allUsers.find(u => u.id === btn.dataset.id);
      if (user) handleRemoveUser(user);
    });
  });
}

async function handleUserFormSubmit(e) {
  e.preventDefault();
  const sb = getSupabaseClient();
  if (!sb || !isCurrentUserAdmin()) return;

  const email = document.getElementById('user-email-input').value.trim().toLowerCase();
  const fullName = document.getElementById('user-name-input').value.trim();
  const role = document.getElementById('user-role-select').value;
  const isActive = document.getElementById('user-active-select').value === 'true';

  if (!email) {
    showToast('Please enter a valid Google / UP email address.', 'error');
    return;
  }

  const saveBtn = document.getElementById('btn-save-user');
  if (saveBtn) saveBtn.disabled = true;

  try {
    if (usersState.editingUserId) {
      const payload = { full_name: fullName || null };
      const editingUser = usersState.allUsers.find(u => u.id === usersState.editingUserId);
      const isSelf = editingUser && editingUser.email.trim().toLowerCase() === getCurrentUserEmail();
      if (!isSelf) {
        payload.role = role;
        payload.is_active = isActive;
      }

      const { error } = await sb
        .from('allowed_users')
        .update(payload)
        .eq('id', usersState.editingUserId);

      if (error) throw error;
      showToast('User updated successfully!', 'success');
    } else {
      const { error } = await sb
        .from('allowed_users')
        .insert({
          email,
          full_name: fullName || null,
          role,
          is_active: isActive
        });

      if (error) throw error;
      showToast(`Added ${email} — they can now sign in with Google.`, 'success');
    }

    closeUserModal();
    await loadUsers();
  } catch (err) {
    handleSupabaseError(err, 'Failed to save user.');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function handleToggleUserActive(user) {
  const sb = getSupabaseClient();
  if (!sb || !isCurrentUserAdmin()) return;

  const nextActive = !user.is_active;
  try {
    const { error } = await sb
      .from('allowed_users')
      .update({ is_active: nextActive })
      .eq('id', user.id);

    if (error) throw error;
    showToast(`${user.email} is now ${nextActive ? 'active' : 'inactive'}.`, 'success');
    await loadUsers();
  } catch (err) {
    handleSupabaseError(err, 'Failed to update user status.');
  }
}

async function handleRemoveUser(user) {
  const sb = getSupabaseClient();
  if (!sb || !isCurrentUserAdmin()) return;

  if (!confirm(`Remove ${user.email} from DO-DocTrax?\n\nThey will immediately lose access to sign in.`)) {
    return;
  }

  try {
    const { error } = await sb
      .from('allowed_users')
      .delete()
      .eq('id', user.id);

    if (error) throw error;
    showToast(`Removed ${user.email}.`, 'success');
    await loadUsers();
  } catch (err) {
    handleSupabaseError(err, 'Failed to remove user.');
  }
}

function setupUserPageListeners() {
  document.getElementById('btn-add-user')?.addEventListener('click', () => openUserModal());
  document.getElementById('form-user')?.addEventListener('submit', handleUserFormSubmit);

  document.getElementById('users-filter-search')?.addEventListener('input', (e) => {
    usersState.searchQuery = e.target.value.trim();
    renderUsersTable();
  });

  document.getElementById('users-filter-role')?.addEventListener('change', (e) => {
    usersState.roleFilter = e.target.value;
    renderUsersTable();
  });

  document.getElementById('users-filter-status')?.addEventListener('change', (e) => {
    usersState.statusFilter = e.target.value;
    renderUsersTable();
  });

  document.getElementById('btn-users-reset')?.addEventListener('click', () => {
    usersState.searchQuery = '';
    usersState.roleFilter = '';
    usersState.statusFilter = '';
    document.getElementById('users-filter-search').value = '';
    document.getElementById('users-filter-role').value = '';
    document.getElementById('users-filter-status').value = '';
    renderUsersTable();
  });

  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', closeUserModal);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeUserModal();
  });
}

async function initUsersPage() {
  if (!usersState.initialized) {
    setupUserPageListeners();
    usersState.initialized = true;
  }

  const isAdmin = isCurrentUserAdmin();
  const adminPanel = document.getElementById('users-admin-panel');
  const nonAdminNotice = document.getElementById('users-nonadmin-notice');
  const btnAddUser = document.getElementById('btn-add-user');

  if (btnAddUser) btnAddUser.hidden = !isAdmin;
  if (nonAdminNotice) nonAdminNotice.hidden = isAdmin;
  if (adminPanel) adminPanel.hidden = !isAdmin;

  if (isAdmin) {
    await loadUsers();
  }
}

window.addEventListener('doctrax:authorized', initUsersPage);
if (window.docTraxAuth?.isAuthorized?.()) {
  initUsersPage();
}

