// Scout's DataForSEO spend ledger (the `scout-spend-ledger` branch on GitHub) — read it, and resolve
// uncertain requests.
//
//   node scripts/budget.mjs status [--month 2026-09]
//   node scripts/budget.mjs resolve <holdId> charged <usd> "seen in the DataForSEO dashboard"
//   node scripts/budget.mjs resolve <holdId> released "not in the DataForSEO dashboard"
//
// `resolve` is the owner's decision after checking the DataForSEO dashboard; it is pushed to the
// ledger branch immediately, so the next run sees it. Only Scout's own requests are listed:
// other users of the same DataForSEO account never appear here.

import { createGitLedger, readBudgetConfig } from './lib/spend-ledger.mjs';

const args = process.argv.slice(2);
const cmd = args[0];
const config = readBudgetConfig(process.env);
const ledger = createGitLedger({ remote: config.ledgerRemote, branch: config.ledgerBranch, capUsd: config.capUsd, maxRequestUsd: config.maxRequestUsd });
const money = (n) => (n === null || n === undefined ? 'n/a' : `$${Number(n).toFixed(5)}`);

if (cmd === 'status') {
  const i = args.indexOf('--month');
  const month = i >= 0 ? args[i + 1] : new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    console.error('Usage: node scripts/budget.mjs status [--month YYYY-MM]');
    process.exit(1);
  }
  const holds = await ledger.list(month);
  const sum = (s) => holds.filter((h) => h.effectiveStatus === s).reduce((t, h) => t + (s === 'charged' ? h.actualUsd ?? h.estimatedUsd : h.estimatedUsd), 0);
  const charged = sum('charged');
  const held = sum('reserved') + sum('uncertain');
  console.log(`Scout DataForSEO spend — ${month} (${config.ledgerRemote}/${config.ledgerBranch})`);
  console.log(`  monthly allowance (SCOUT_DFS_MONTHLY_USD_CAP): ${config.capUsd === null ? `not set — ${config.capError}; nothing can be bought` : money(config.capUsd)}`);
  console.log(`  per-request limit ${money(config.maxRequestUsd)} · per-run limit ${money(config.maxRunUsd)}`);
  console.log(`  charged ${money(charged)} (${holds.filter((h) => h.effectiveStatus === 'charged').length}) · held ${money(held)} · remaining ${config.capUsd === null ? 'n/a' : money(Math.max(0, config.capUsd - charged - held))}`);
  for (const h of holds.filter((x) => x.effectiveStatus === 'uncertain' || x.effectiveStatus === 'reserved')) {
    console.log(`  ${h.effectiveStatus.toUpperCase()} ${h.id} ${h.endpoint} est ${money(h.estimatedUsd)} ${h.createdAt}${h.note ? ` — ${h.note}` : ''}`);
  }
  console.log('  (Scout only: other users of the same DataForSEO account are not counted.)');
} else if (cmd === 'resolve') {
  const [, holdId, outcome, a3, a4] = args;
  const usd = outcome === 'charged' ? Number(a3) : null;
  const note = outcome === 'charged' ? a4 : a3;
  if (!holdId || !['charged', 'released'].includes(outcome) || (outcome === 'charged' && !(usd >= 0))) {
    console.error('Usage: node scripts/budget.mjs resolve <holdId> charged <usd> "<note>"  |  resolve <holdId> released "<note>"');
    process.exit(1);
  }
  const r = await ledger.resolve({ holdId, outcome, actualUsd: usd, note });
  if (!r.ok) {
    console.error(`✗ not resolved: ${r.reason}${r.status ? ` (${r.status})` : ''}`);
    process.exit(1);
  }
  console.log(`✓ ${holdId} → ${outcome}${usd !== null ? ` ${money(usd)}` : ''} — pushed to ${config.ledgerRemote}/${config.ledgerBranch}.`);
} else {
  console.error('Usage: node scripts/budget.mjs status [--month YYYY-MM] | resolve <holdId> charged <usd> "<note>" | resolve <holdId> released "<note>"');
  process.exit(1);
}
