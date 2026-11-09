import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {githubAccount, githubEmail, githubRemote} from './auto-push.mjs';

const git = args => execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const existingConfig = name => {
  try { return git(['config', '--get', name]); } catch { return ''; }
};

try {
  if (git(['remote', 'get-url', '--push', '--all', 'origin']) !== githubRemote) {
    throw new Error('Remote origin mesti https://github.com/abusulaim94/Khuttah.git. Tiada tetapan diubah.');
  }
  const hooksPath = existingConfig('core.hooksPath');
  if (hooksPath && hooksPath !== '.githooks') throw new Error('Hook Git lain sedang digunakan. Tiada tetapan diubah.');
  if (!existsSync('.githooks/post-commit')) throw new Error('Jalankan arahan ini dalam folder utama KHUTTAH.');
  if (!hooksPath && existsSync(git(['rev-parse', '--git-path', 'hooks/post-commit']))) {
    throw new Error('Hook post-commit sedia ada perlu disemak sebelum memasang auto-push. Tiada tetapan diubah.');
  }

  const settings = {
    'user.name': 'Abu Sulaim',
    'user.email': githubEmail,
    'credential.https://github.com.username': githubAccount,
    'core.hooksPath': '.githooks',
    'khuttah.autoPush': 'true',
    'branch.main.remote': 'origin',
    'branch.main.merge': 'refs/heads/main',
  };
  for (const [name, value] of Object.entries(settings)) git(['config', '--local', name, value]);
  console.log('Identiti projek: Abu Sulaim <' + githubEmail + '>.');
  console.log('Auto-push aktif selepas setiap commit pada main ke abusulaim94/Khuttah.');
  console.log('Jika belum log masuk: git credential-manager github login --username abusulaim94 --device');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
