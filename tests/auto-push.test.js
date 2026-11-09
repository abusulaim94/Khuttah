import test from 'node:test';
import assert from 'node:assert/strict';
import {autoPush, githubEmail, githubRemote} from '../scripts/auto-push.mjs';

function fixture({enabled = 'true', branch = 'main', remote = githubRemote, username = 'abusulaim94', identity = `${githubEmail}\n${githubEmail}`, editing = false, pushOK = true, env = {}} = {}) {
  const calls = [];
  const warnings = [];
  const result = autoPush({
    runGit(args, options) {
      calls.push({args, options});
      if (args[0] === 'config' && args.includes('khuttah.autoPush')) return enabled;
      if (args[0] === 'config') return username;
      if (args[0] === 'symbolic-ref') return branch;
      if (args[0] === 'rev-parse') return `.git/${args.at(-1)}`;
      if (args[0] === 'remote') return remote;
      if (args[0] === 'log') return identity;
      if (options?.push) return pushOK;
      throw new Error(`Unexpected Git call: ${args.join(' ')}`);
    },
    exists: () => editing,
    env,
    log() {},
    warn: text => warnings.push(text),
  });
  return {result, pushes: calls.filter(call => call.options?.push), warnings, calls};
}

test('auto-push hanya menghantar main ke repositori yang ditetapkan tanpa tag atau force', () => {
  const {result, pushes} = fixture();
  assert.equal(result, 'pushed');
  assert.deepEqual(pushes, [{args: ['-c', 'push.followTags=false', 'push', '--porcelain', 'origin', 'HEAD:refs/heads/main'], options: {push: true}}]);
});

test('auto-push boleh dimatikan untuk repositori atau satu commit', () => {
  for (const options of [{enabled: 'false'}, {enabled: null}, {env: {KHUTTAH_AUTO_PUSH: '0'}}]) {
    const {result, pushes} = fixture(options);
    assert.equal(result, 'disabled');
    assert.equal(pushes.length, 0);
  }
});

test('branch lain, detached HEAD dan proses menulis semula sejarah tidak dipush', () => {
  for (const options of [{branch: 'feature/notes'}, {branch: null}, {editing: true}]) {
    assert.equal(fixture(options).pushes.length, 0);
  }
});

test('perubahan destinasi, push URL tambahan atau akaun lama menghentikan auto-push', () => {
  for (const options of [{remote: 'https://github.com/abusulaimmadani/Khuttah.git'}, {remote: githubRemote + '\nhttps://github.com/other/repo.git'}, {username: 'abusulaimmadani'}]) {
    const {result, pushes, warnings} = fixture(options);
    assert.equal(result, 'wrong-target');
    assert.equal(pushes.length, 0);
    assert.equal(warnings.length, 1);
  }
});

test('author atau committer lama tidak dihantar secara automatik', () => {
  for (const identity of [`old@example.com\n${githubEmail}`, `${githubEmail}\nold@example.com`, null]) {
    const {result, pushes} = fixture({identity});
    assert.equal(result, 'wrong-identity');
    assert.equal(pushes.length, 0);
  }
});

test('push gagal diberitahu tanpa cubaan force-push atau mengubah commit', () => {
  const {result, pushes, calls, warnings} = fixture({pushOK: false});
  assert.equal(result, 'push-failed');
  assert.equal(pushes.length, 1);
  assert.match(warnings[0], /Commit tersimpan setempat/);
  assert.equal(calls.some(({args}) => ['reset', 'pull', 'merge', 'commit'].includes(args[0])), false);
});
