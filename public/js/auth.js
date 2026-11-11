/**
 * DO-DocTrax Authentication & Access Gate Controller
 * Uses Supabase Auth (Google OAuth) + database-enforced allowed_users whitelist.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const authState = {
  session: null,
  profile: null,
  isAuthorized: false,
};

// Expose read-only helpers for app.js (classic script)
window.docTraxAuth = {
  supabase,
  getSession: () => authState.session,
  getProfile: () => authState.profile,
  isAuthorized: () => authState.isAuthorized,
  signOut,
};

const els = {
  loading: document.getElementById('auth-loading'),
  gate: document.getElementById('auth-gate'),
  signinCard: document.getElementById('auth-signin-view'),
  restrictedCard: document.getElementById('auth-restricted-view'),
  appShell: document.getElementById('app-shell'),
  btnGoogleSignIn: document.getElementById('btn-google-signin'),
  btnRestrictedSignOut: document.getElementById('btn-restricted-signout'),
  btnHeaderSignOut: document.getElementById('btn-header-signout'),
  authError: document.getElementById('auth-error-banner'),
  restrictedEmail: document.getElementById('restricted-user-email'),
  headerUserMenu: document.getElementById('header-user-menu'),
  headerUserAvatar: document.getElementById('header-user-avatar'),
  headerUserName: document.getElementById('header-user-name'),
  headerUserRole: document.getElementById('header-user-role'),
};

function escapeIlike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function showError(message) {
  if (!els.authError) return;
  if (!message) {
    els.authError.textContent = '';
    els.authError.hidden = true;
    return;
  }
  els.authError.textContent = message;
  els.authError.hidden = false;
}

function setSigningIn(busy) {
  if (!els.btnGoogleSignIn) return;
  els.btnGoogleSignIn.disabled = busy;
  const label = els.btnGoogleSignIn.querySelector('.btn-google-label');
  if (label) {
    label.textContent = busy ? 'Redirecting to Google...' : 'Sign in with Google';
  }
}

function renderView(mode) {
  // mode: 'loading' | 'signin' | 'restricted' | 'app'
  if (els.loading) els.loading.hidden = mode !== 'loading';
  if (els.gate) els.gate.hidden = mode !== 'signin' && mode !== 'restricted';
  if (els.signinCard) els.signinCard.hidden = mode !== 'signin';
  if (els.restrictedCard) els.restrictedCard.hidden = mode !== 'restricted';
  if (els.appShell) els.appShell.hidden = mode !== 'app';
}

function getInitials(nameOrEmail) {
  const clean = (nameOrEmail || 'DO').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function renderHeaderUser(user, profile) {
  if (!els.headerUserMenu) return;
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Staff';
  const avatarUrl = user?.user_metadata?.avatar_url || '';
  const role = (profile?.role || 'staff').toUpperCase();

  if (els.headerUserName) {
    els.headerUserName.textContent = displayName;
    els.headerUserName.title = user?.email || displayName;
  }
  if (els.headerUserRole) {
    els.headerUserRole.textContent = role;
  }
  if (els.headerUserAvatar) {
    if (avatarUrl) {
      els.headerUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="" referrerpolicy="no-referrer">`;
    } else {
      els.headerUserAvatar.textContent = getInitials(displayName);
    }
  }
  els.headerUserMenu.hidden = false;
}

async function fetchAuthorizedProfile(session) {
  const rawEmail = session?.user?.email || session?.user?.user_metadata?.email || '';
  const normalizedEmail = rawEmail.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data, error } = await supabase
    .from('allowed_users')
    .select('email, full_name, role, is_active')
    .ilike('email', escapeIlike(normalizedEmail))
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Whitelist check failed:', error);
    return null;
  }
  if (!data || data.email.trim().toLowerCase() !== normalizedEmail) {
    return null;
  }
  return data;
}

function readOAuthErrorFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const desc = searchParams.get('error_description') || hashParams.get('error_description');
  const err = searchParams.get('error') || hashParams.get('error');

  if (desc || err) {
    // Clean URL params so refreshing doesn't replay the stale error
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    return desc ? desc.replace(/\+/g, ' ') : `Sign-in failed (${err}).`;
  }
  return null;
}

export async function signInWithGoogle() {
  showError('');
  setSigningIn(true);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  } catch (err) {
    console.error('Google OAuth error:', err);
    showError(err?.message || 'Unable to start Google Sign-In. Please try again.');
    setSigningIn(false);
  }
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Sign-out error:', err);
  } finally {
    authState.session = null;
    authState.profile = null;
    authState.isAuthorized = false;
    if (els.headerUserMenu) els.headerUserMenu.hidden = true;
    showError('');
    setSigningIn(false);
    renderView('signin');
  }
}

let activeCheckId = 0;

async function applySession(session, { silentRefresh = false } = {}) {
  const checkId = ++activeCheckId;
  authState.session = session || null;

  if (!session?.user) {
    authState.profile = null;
    authState.isAuthorized = false;
    if (els.headerUserMenu) els.headerUserMenu.hidden = true;
    renderView('signin');
    return;
  }

  if (!silentRefresh || !authState.isAuthorized) {
    renderView('loading');
  }
  const profile = await fetchAuthorizedProfile(session);
  if (checkId !== activeCheckId) return;

  if (!profile) {
    authState.profile = null;
    authState.isAuthorized = false;
    if (els.restrictedEmail) {
      els.restrictedEmail.textContent = session.user.email || 'Unknown account';
    }
    renderView('restricted');
    return;
  }

  const wasAuthorized = authState.isAuthorized;
  authState.profile = profile;
  authState.isAuthorized = true;
  renderHeaderUser(session.user, profile);
  renderView('app');
  if (!wasAuthorized) {
    window.dispatchEvent(new CustomEvent('doctrax:authorized', { detail: { session, profile } }));
  }
}

function bindAuthEvents() {
  els.btnGoogleSignIn?.addEventListener('click', signInWithGoogle);
  els.btnRestrictedSignOut?.addEventListener('click', signOut);
  els.btnHeaderSignOut?.addEventListener('click', signOut);
}

async function bootstrapAuth() {
  bindAuthEvents();
  renderView('loading');

  const urlError = readOAuthErrorFromUrl();
  if (urlError) {
    showError(urlError);
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await applySession(data?.session || null);
  } catch (err) {
    console.error('Auth initialization error:', err);
    showError(err?.message || 'Failed to verify authentication session.');
    renderView('signin');
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      applySession(null);
    } else if (event === 'SIGNED_IN') {
      applySession(session, { silentRefresh: authState.isAuthorized });
    } else if (event === 'TOKEN_REFRESHED') {
      applySession(session, { silentRefresh: true });
    }
  });
}

bootstrapAuth();
