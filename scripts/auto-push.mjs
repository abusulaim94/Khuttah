import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const githubAccount = 'abusulaim94';
export const githubEmail = '341015427+abusulaim94@users.noreply.github.com';
export const githubRemote = 'https://github.com/abusulaim94/Khuttah.git';

function git(args, {push = false} = {}) {
  try {
    const output = execFileSync('git', args, {
      encoding: 'utf8',
      stdio: push ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
      env: {...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never'},
    });
    return push ? true : output.trim();
  } catch {
    return push ? false : null;
  }
}

export function autoPush({runGit = git, exists = existsSync, env = process.env, log = console.log, warn = console.warn} = {}) {
  if (env.KHUTTAH_AUTO_PUSH === '0' || runGit(['config', '--bool', '--get', 'khuttah.autoPush']) !== 'true') return 'disabled';
  if (runGit(['symbolic-ref', '--quiet', '--short', 'HEAD']) !== 'main') return 'other-branch';

  for (const state of ['rebase-merge', 'rebase-apply', 'sequencer']) {
    const path = runGit(['rev-parse', '--git-path', state]);
    if (path && exists(path)) return 'history-edit';
  }

  const remote = runGit(['remote', 'get-url', '--push', '--all', 'origin']);
  const username = runGit(['config', '--get', 'credential.https://github.com.username']);
  if (remote !== githubRemote || username !== githubAccount) {
    warn('[KHUTTAH] Auto-push dihentikan: remote atau akaun berubah. Jalankan npm run github:setup.');
    return 'wrong-target';
  }

  const identity = runGit(['log', '-1', '--format=%ae%n%ce']);
  if (identity !== `${githubEmail}\n${githubEmail}`) {
    warn('[KHUTTAH] Commit tersimpan setempat. Auto-push dihentikan kerana identiti commit bukan abusulaim94.');
    return 'wrong-identity';
  }

  log('[KHUTTAH] Push main ke abusulaim94/Khuttah…');
  const pushed = runGit(['-c', 'push.followTags=false', 'push', '--porcelain', 'origin', 'HEAD:refs/heads/main'], {push: true});
  if (pushed) return 'pushed';
  warn('[KHUTTAH] Commit tersimpan setempat; push belum berjaya. Semak sambungan/log masuk dan cuba git push origin main.');
  return 'push-failed';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) autoPush();
