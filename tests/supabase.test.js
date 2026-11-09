import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudController, SESSION_STORAGE_KEY, SYNC_META_KEY} from '../src/supabase.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
  };
}

const sampleState = {
  records: [{id: 'r-1', type: 'task', title: 'Semak kertas kajian', domain: 'Peribadi', date: '2026-11-10', time: '', repeat: '', detail: '', done: false, priority: 'high', tags: []}],
  notes: [{id: 'n-1', title: 'Catatan bab 1', note: 'Isi penting', domain: 'Peribadi', kind: 'Nota peribadi', subfolder: '', tags: []}],
  projects: [],
  domains: ['Peribadi', 'Uthmani', 'KPAZ'],
  tags: {Notes: [], Knowledge: [], Events: []},
  subfolders: [],
  groupLayoutVersion: 1,
  demoCleanupVersion: 1,
};

test('log masuk menyimpan sesi dan menolak kelayakan tidak sah dengan mesej jelas', async () => {
  const storage = memoryStorage();
  const calls = [];
  const cloud = createCloudController({
    url: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test',
    storage,
    fetchImpl: async (url, options) => {
      calls.push({url, options});
      const body = JSON.parse(options.body);
      if (body.password !== 'rahsia') {
        return new Response(JSON.stringify({code: 'invalid_credentials', msg: 'Invalid login credentials'}), {status: 400});
      }
      return new Response(JSON.stringify({
        access_token: 'tok-123',
        refresh_token: 'ref-123',
        expires_in: 3600,
        user: {id: 'u-1', email: body.email},
      }), {status: 200});
    },
  });

  await assert.rejects(() => cloud.signIn('user@example.com', 'salah'), /Emel atau kata laluan tidak tepat/);
  const session = await cloud.signIn('user@example.com', 'rahsia');
  assert.equal(session.user.id, 'u-1');
  assert.equal(session.user.email, 'user@example.com');
  assert.equal(calls[1].options.headers.apikey, 'sb_publishable_test');
  assert.ok(storage.getItem(SESSION_STORAGE_KEY));
});

test('sesi yang hampir tamat diperbaharui secara automatik sebelum menarik data awan', async () => {
  const storage = memoryStorage({
    [SESSION_STORAGE_KEY]: JSON.stringify({
      access_token: 'expired-tok',
      refresh_token: 'ref-valid',
      expires_at: Date.now() - 1000,
      user: {id: 'u-1', email: 'user@example.com'},
    }),
  });
  const endpoints = [];
  const cloud = createCloudController({
    url: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test',
    storage,
    fetchImpl: async (url, options) => {
      endpoints.push({url, auth: options.headers.Authorization});
      if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
        return new Response(JSON.stringify({
          access_token: 'fresh-tok',
          refresh_token: 'ref-2',
          expires_in: 3600,
          user: {id: 'u-1', email: 'user@example.com'},
        }), {status: 200});
      }
      return new Response(JSON.stringify([{state: sampleState, updated_at: '2026-11-09T04:00:00Z'}]), {status: 200});
    },
  });

  const result = await cloud.pullState();
  assert.equal(result.status, 'loaded');
  assert.equal(result.state.records[0].title, 'Semak kertas kajian');
  assert.equal(endpoints.length, 2);
  assert.equal(endpoints[1].auth, 'Bearer fresh-tok');
});

test('pushState menghantar upsert atomik mengikut user_id dan membersihkan status pendingSync', async () => {
  const storage = memoryStorage({
    [SESSION_STORAGE_KEY]: JSON.stringify({
      access_token: 'valid-tok',
      refresh_token: 'ref-1',
      expires_at: Date.now() + 3600_000,
      user: {id: 'u-99', email: 'abu@example.com'},
    }),
  });
  let upsertCall = null;
  const cloud = createCloudController({
    url: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test',
    storage,
    fetchImpl: async (url, options) => {
      upsertCall = {url, options, body: JSON.parse(options.body)};
      return new Response('', {status: 201});
    },
  });

  cloud.markPendingSync();
  assert.equal(cloud.getMeta().pendingSync, true);
  await cloud.pushState(sampleState);
  assert.equal(cloud.getMeta().pendingSync, false);
  assert.match(upsertCall.url, /\/rest\/v1\/khuttah_workspaces\?on_conflict=user_id$/);
  assert.equal(upsertCall.options.headers.Prefer, 'resolution=merge-duplicates,return=minimal');
  assert.equal(upsertCall.body.user_id, 'u-99');
  assert.equal(upsertCall.body.state.records.length, 1);

  await cloud.signOut();
  assert.equal(cloud.getSession(), null);
  assert.equal(storage.getItem(SESSION_STORAGE_KEY), null);
  assert.ok(storage.getItem(SYNC_META_KEY));
});
