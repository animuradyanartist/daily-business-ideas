// Test fixture: a bare "GitHub" remote with Scout's ledger branch, plus independent clones
// (each clone stands for a separate runner with its own checkout).
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

export function ledgerRemote({ branch = 'scout-spend-ledger', seed = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'scout-ledger-remote-'));
  const origin = join(root, 'origin.git');
  git(root, 'init', '-q', '--bare', '-b', 'main', origin);
  const init = join(root, 'init');
  git(root, 'clone', '-q', origin, init);
  git(init, 'config', 'user.email', 't@example.com');
  git(init, 'config', 'user.name', 't');
  git(init, 'checkout', '-q', '--orphan', branch);
  writeFileSync(join(init, 'README.md'), 'ledger\n');
  for (const [path, body] of Object.entries(seed)) {
    mkdirSync(join(init, path, '..'), { recursive: true });
    writeFileSync(join(init, path), body);
  }
  git(init, 'add', '-A');
  git(init, 'commit', '-qm', 'init ledger');
  git(init, 'push', '-q', 'origin', branch);
  let n = 0;
  return {
    root,
    origin,
    branch,
    /** A separate checkout of main (like a runner), sharing nothing with other clones but the remote. */
    clone() {
      const d = join(root, `runner-${n++}`);
      git(root, 'clone', '-q', origin, d);
      return d;
    },
    /** The ledger as GitHub has it: path → parsed JSON. */
    files() {
      const out = {};
      const names = git(origin, 'ls-tree', '-r', '--name-only', branch).split('\n').filter((p) => p.startsWith('holds/'));
      for (const p of names) out[p] = JSON.parse(git(origin, 'show', `${branch}:${p}`));
      return out;
    },
  };
}
