import {normaliseState} from './storage.js';
import {clearLegacyDemoData} from './cleanup.js';

export const SUPABASE_URL = 'https://dppepldqihxwhbrfhlku.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wcqOXIYjJ0SMGA90CzCmLg_ZndT6Ejj';
export const SESSION_STORAGE_KEY = 'khuttah-auth-session-v1';
export const SYNC_META_KEY = 'khuttah-cloud-meta-v1';

const defaultTags = {Notes: [], Knowledge: [], Events: [], Works: [], Ideas: []};

function parseError(payload, status) {
  if (!payload || typeof payload !== 'object') return `Ralat pelayan (${status}).`;
  const code = payload.code || payload.error_code || '';
  const message = payload.msg || payload.message || payload.error_description || payload.error || '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Emel atau kata laluan tidak tepat.';
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return 'Emel belum disahkan. Sila semak peti masuk emel anda atau sahkan pengguna di papan pemuka Supabase.';
  }
  if (code === 'user_already_exists' || /already registered/i.test(message)) {
    return 'Emel ini sudah didaftarkan. Sila pilih Log masuk.';
  }
  if (code === 'signup_disabled' || /signups not allowed/i.test(message)) {
    return 'Pendaftaran akaun baharu telah ditutup.';
  }
  if (code === 'weak_password' || /password should be at least/i.test(message)) {
    return 'Kata laluan mestilah sekurang-kurangnya 6 aksara.';
  }
  if (code === 'PGRST205' || code === '42P01' || /khuttah_workspaces/i.test(message)) {
    return 'Jadual khuttah_workspaces belum dicipta. Jalankan fail supabase/schema.sql di SQL Editor Supabase.';
  }
  return message || `Permintaan gagal (${status}).`;
}

export function createCloudController({
  url = SUPABASE_URL,
  publishableKey = SUPABASE_PUBLISHABLE_KEY,
  fetchImpl = globalThis.fetch,
  storage = globalThis.localStorage,
} = {}) {
  let session = readSession();
  let meta = readMeta();
  let pendingVersion = 0;

  function readSession() {
    try {
      const parsed = JSON.parse(storage?.getItem(SESSION_STORAGE_KEY) ?? 'null');
      if (parsed?.access_token && parsed?.user?.id) return parsed;
    } catch {}
    return null;
  }

  function writeSession(next) {
    session = next;
    try {
      if (next) storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
      else storage?.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  }

  function readMeta() {
    try {
      const parsed = JSON.parse(storage?.getItem(SYNC_META_KEY) ?? 'null');
      if (parsed && typeof parsed === 'object') {
        return {
          pendingSync: Boolean(parsed.pendingSync),
          lastSyncedAt: typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
        };
      }
    } catch {}
    return {pendingSync: false, lastSyncedAt: null};
  }

  function writeMeta(patch) {
    meta = {...meta, ...patch};
    try { storage?.setItem(SYNC_META_KEY, JSON.stringify(meta)); } catch {}
    return meta;
  }

  function formatSession(data) {
    const expiresAt = data.expires_at
      ? data.expires_at * 1000
      : Date.now() + Number(data.expires_in || 3600) * 1000;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_at: expiresAt,
      user: {
        id: data.user.id,
        email: data.user.email || '',
      },
    };
  }

  async function request(path, {method = 'GET', token = '', headers = {}, body} = {}) {
    const reqHeaders = {apikey: publishableKey, ...headers};
    if (token) reqHeaders.Authorization = `Bearer ${token}`;
    if (body !== undefined) reqHeaders['Content-Type'] = 'application/json';
    const response = await fetchImpl(`${url}${path}`, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = null; }
    }
    if (!response.ok) {
      const error = new Error(parseError(payload, response.status));
      error.status = response.status;
      error.code = payload?.code || payload?.error_code || '';
      throw error;
    }
    return payload;
  }

  async function ensureValidSession() {
    if (!session) return null;
    if (session.expires_at && Date.now() < session.expires_at - 60_000) return session;
    if (!session.refresh_token) {
      writeSession(null);
      return null;
    }
    try {
      const refreshed = await request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: {refresh_token: session.refresh_token},
      });
      if (!refreshed?.access_token || !refreshed?.user?.id) {
        writeSession(null);
        return null;
      }
      writeSession(formatSession(refreshed));
      return session;
    } catch (error) {
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        writeSession(null);
        return null;
      }
      return session;
    }
  }

  async function signIn(email, password) {
    const cleanEmail = String(email ?? '').trim();
    const cleanPassword = String(password ?? '');
    if (!cleanEmail || !cleanPassword) throw new Error('Masukkan emel dan kata laluan.');
    const data = await request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: {email: cleanEmail, password: cleanPassword},
    });
    if (!data?.access_token || !data?.user?.id) {
      throw new Error('Log masuk tidak berjaya.');
    }
    writeSession(formatSession(data));
    return session;
  }

  async function signUp(email, password) {
    const cleanEmail = String(email ?? '').trim();
    const cleanPassword = String(password ?? '');
    if (!cleanEmail || !cleanPassword) throw new Error('Masukkan emel dan kata laluan.');
    if (cleanPassword.length < 6) throw new Error('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
    const data = await request('/auth/v1/signup', {
      method: 'POST',
      body: {email: cleanEmail, password: cleanPassword},
    });
    if (data?.access_token && data?.user?.id) {
      writeSession(formatSession(data));
      return {session, confirmationRequired: false};
    }
    return {session: null, confirmationRequired: true};
  }

  async function signOut() {
    const token = session?.access_token;
    writeSession(null);
    writeMeta({pendingSync: false});
    if (token) {
      try { await request('/auth/v1/logout', {method: 'POST', token}); } catch {}
    }
  }

  async function pullState({draftKeys = []} = {}) {
    const active = await ensureValidSession();
    if (!active) throw new Error('Sesi tamat. Sila log masuk semula.');
    const userId = encodeURIComponent(active.user.id);
    const pullingVersion = pendingVersion;
    const rows = await request(
      `/rest/v1/khuttah_workspaces?select=state,updated_at&user_id=eq.${userId}`,
      {token: active.access_token, headers: {Accept: 'application/json'}},
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return {status: 'empty', state: null, updatedAt: null};
    }
    const rawState = rows[0].state;
    const validated = clearLegacyDemoData(
      normaliseState({...rawState, tags: {...defaultTags, ...(rawState?.tags || {})}}),
      {draftKeys},
    );
    writeMeta({pendingSync: meta.pendingSync || pendingVersion !== pullingVersion, lastSyncedAt: rows[0].updated_at || new Date().toISOString()});
    return {status: 'loaded', state: validated, updatedAt: rows[0].updated_at || null};
  }

  async function pushState(state) {
    const active = await ensureValidSession();
    if (!active) throw new Error('Sesi tamat. Sila log masuk semula.');
    const sentVersion = pendingVersion;
    const validated = normaliseState(state);
    const updatedAt = new Date().toISOString();
    await request('/rest/v1/khuttah_workspaces?on_conflict=user_id', {
      method: 'POST',
      token: active.access_token,
      headers: {Prefer: 'resolution=merge-duplicates,return=minimal'},
      body: {
        user_id: active.user.id,
        state: validated,
        updated_at: updatedAt,
      },
    });
    writeMeta({pendingSync: pendingVersion !== sentVersion, lastSyncedAt: updatedAt});
    return {updatedAt};
  }

  return {
    getSession: () => session,
    getMeta: () => meta,
    markPendingSync: () => { pendingVersion++; return writeMeta({pendingSync: true}); },
    ensureValidSession,
    signIn,
    signUp,
    signOut,
    pullState,
    pushState,
  };
}
