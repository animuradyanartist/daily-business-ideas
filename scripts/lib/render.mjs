// Markdown for evidence/<date>.md — the enriched assessment, kept separate from Scout's
// original memo and score. Tables are rendered from the data by code; the narrative comes
// from the constrained assessment. No sources section entry is ever added that the
// evidence file does not contain.

import { offerPrices } from './evidence.mjs';

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
const day = (iso) => (iso ? String(iso).slice(0, 10) : 'n/a');
const money = (n) => (typeof n === 'number' ? `$${n.toFixed(n < 1 ? 4 : 2)}` : 'n/a');
// Google reports very small volumes as 0; show it as the provider's figure, not a fact of zero demand.
const vol = (n) => (typeof n === 'number' ? (n === 0 ? '0 (as reported)' : n.toLocaleString('en-US')) : 'unknown');
const cites = (ids) => (ids?.length ? ` (${ids.join(', ')})` : '');

const STATUS_TEXT = {
  enriched: 'enriched',
  partial: 'partially enriched',
  pending: 'pending — will retry',
  unavailable: 'unavailable',
  'dry-run': 'dry run — no provider data',
  planned: 'planned — not yet gathered',
};

function trendText(t) {
  if (!t || t.direction === 'unknown') return 'unknown';
  return `${t.direction} (${t.changePct > 0 ? '+' : ''}${t.changePct}%)`;
}

function dimensionRows(idea) {
  const a = idea.assessment;
  const r = idea.readings ?? {};
  const rows = [
    ['Customer problem', a?.problemEvidence?.level ?? 'unknown', a ? `${a.problemEvidence.observed || 'No cited observation.'}${cites(a.problemEvidence.basis)}` : 'Not assessed yet.'],
    ['Search demand and trend', r.demand?.level ?? 'unknown', r.demand?.note ?? 'Not measured.'],
    ['Commercial intent and payment', r.commercial?.level ?? 'unknown', r.commercial?.note ?? 'Not measured.'],
    ['Competitors', a?.competition?.level ?? 'unknown', `${a ? `${a.competition.alternatives.length} alternative(s) identified from fetched pages${cites(a.competition.basis)}. ` : 'Not assessed yet. '}${r.competitors?.note ?? ''}`],
    ['Feasibility of a small first experiment', a?.feasibility?.level ?? 'unknown', a?.feasibility?.note ? `Inference: ${a.feasibility.note}` : 'Not assessed yet.'],
  ];
  return rows.map(([d, l, b]) => `| ${d} | ${l} | ${esc(b)} |`).join('\n');
}

function renderIdea(idea, n, run) {
  const out = [];
  const a = idea.assessment;
  out.push(`## ${n}. ${idea.title}`);
  const pick =
    idea.matchesOriginalPick === true
      ? `Scout's original pick${run.original?.score != null ? ` (original score ${run.original.score}/100, unchanged)` : ''}`
      : idea.matchesOriginalPick === false
        ? 'shortlisted, not Scout\'s final pick'
        : null;
  out.push(`_id \`${idea.id}\` · ${STATUS_TEXT[idea.status] ?? idea.status}${pick ? ` · ${pick}` : ''}_`);
  if (idea.reason) out.push(`\n> ${esc(idea.reason)}`);

  out.push('\n### What is the opportunity?');
  out.push(a?.opportunity || `${idea.plan.problem || idea.title} _(Scout planner description — not yet assessed against evidence.)_`);

  out.push('\n### Who pays and why?');
  out.push(`- Has the problem: ${idea.plan.targetCustomer || 'unknown'} _(inference)_`);
  out.push(`- Pays: ${idea.plan.payer || 'unknown'} _(inference)_`);
  if (a?.whoPays) out.push(`- Assessment: ${a.whoPays}`);
  else if (idea.plan.whyPayerPays) out.push(`- Why: ${idea.plan.whyPayerPays} _(inference)_`);

  out.push('\n### What evidence supports it?');
  out.push('| Dimension | Reading | Basis |\n|---|---|---|');
  out.push(dimensionRows(idea));
  if (a?.problemEvidence?.inference) out.push(`\nInference on the problem: ${a.problemEvidence.inference}`);

  const kws = idea.keywords ?? [];
  if (kws.some((k) => k.status !== 'not_collected')) {
    const k0 = kws.find((k) => k.retrievedAt);
    out.push(`\n**Search observations** — DataForSEO, ${esc(run.market.locationName)} · ${esc(run.market.languageCode)}, retrieved ${day(k0?.retrievedAt)}. Each row is a separate keyword; rows overlap and are not added up.`);
    out.push('| ID | Keyword | Intent group | Avg monthly searches | Trend | CPC (USD) | Google Ads competition | Source |\n|---|---|---|---|---|---|---|---|');
    for (const k of kws) {
      if (k.status === 'not_collected') {
        out.push(`| ${k.id} | ${esc(k.keyword)} | ${k.group} | not collected | — | — | — | — |`);
        continue;
      }
      const source = String(k.provider ?? '').includes('Google Ads') ? 'Google Ads' : k.adsChecked ? 'Labs (Ads checked)' : 'Labs';
      out.push(
        `| ${k.id} | ${esc(k.keyword)} | ${k.group} | ${k.status === 'no_data' ? 'no data (unknown)' : vol(k.searchVolume)} | ${trendText(k.trend)} | ${typeof k.cpcUsd === 'number' ? k.cpcUsd.toFixed(2) : 'unknown'} | ${k.adCompetitionLevel ?? 'unknown'} | ${source} |`,
      );
    }
  } else if (kws.length) {
    out.push(`\nPlanned keywords (not measured): ${kws.map((k) => `"${esc(k.keyword)}"`).join(', ')}.`);
  } else {
    const planned = ['problem', 'solution', 'buying'].flatMap((g) => idea.plan.keywords?.[g] ?? []);
    if (planned.length) out.push(`\nPlanned keywords (not measured): ${planned.map((k) => `"${esc(k)}"`).join(', ')}.`);
  }

  out.push('\n### What alternatives already exist?');
  if (a?.competition?.alternatives?.length) {
    for (const alt of a.competition.alternatives) out.push(`- **${esc(alt.name)}** — ${esc(alt.what)}${cites(alt.basis)}`);
  }
  if (a?.competition?.strengths?.length) {
    out.push('\nStrengths:');
    for (const s of a.competition.strengths) out.push(`- ${s.kind === 'observed' ? 'Observed' : 'Inference'}: ${esc(s.text)}${cites(s.basis)}`);
  }
  if (a?.competition?.gaps?.length) {
    out.push('\nGaps:');
    for (const g of a.competition.gaps) out.push(`- ${g.kind === 'observed' ? 'Observed' : 'Inference'}: ${esc(g.text)}${cites(g.basis)}`);
  }
  if (idea.serps?.length) {
    for (const s of idea.serps) {
      out.push(`\nTop results for "${esc(s.query)}" (DataForSEO SERP, ${esc(s.location)}, retrieved ${day(s.retrievedAt)}):`);
      for (const i of s.items.slice(0, 10)) out.push(`- ${i.id} · #${i.rank} ${esc(i.domain)} _(${i.class})_ — [${esc(i.title) || i.url}](${i.url})`);
    }
  }
  const okPages = (idea.pages ?? []).filter((p) => !p.error);
  if (okPages.length) {
    out.push('\nFetched competitor pages:');
    for (const p of okPages) {
      const offers = offerPrices(p).map((m) => m.text).slice(0, 4).join(', ');
      out.push(`- ${p.id} · [${esc(p.title) || p.url}](${p.finalUrl ?? p.url}) — retrieved ${day(p.retrievedAt)}; offer prices: ${offers || 'none found'}${p.mentionsFreeTrial ? '; mentions a free trial' : ''}${p.mentionsContactSales ? '; contact-sales / demo' : ''}`);
    }
  }
  const failedPages = (idea.pages ?? []).filter((p) => p.error);
  if (failedPages.length) out.push(`\nNot read: ${failedPages.map((p) => `${p.url} (${p.error})`).join('; ')}.`);
  if (!a?.competition && !idea.serps?.length) out.push('Unknown — no search results collected yet.');

  out.push('\n### What remains unproven?');
  const unproven = [...(a?.unproven ?? [])];
  if (idea.readings?.demand?.level === 'unknown') unproven.push('Search demand: not measured.');
  if (a?.downgraded?.length) unproven.push(`Claims without cited evidence were downgraded to unknown: ${a.downgraded.join(', ')}.`);
  out.push(unproven.length ? unproven.map((u) => `- ${u}`).join('\n') : '- Not assessed yet.');

  out.push('\n### Cheapest useful next experiment');
  if (a?.nextExperiment?.what) {
    out.push(`${a.nextExperiment.what}`);
    if (a.nextExperiment.cost || a.nextExperiment.duration) out.push(`\nRough cost: ${a.nextExperiment.cost || 'n/a'} · duration: ${a.nextExperiment.duration || 'n/a'}`);
  } else {
    out.push('Not assessed yet.');
  }
  out.push('\n### What result would justify continuing or stopping?');
  out.push(`- Continue if: ${a?.continueIf || 'not assessed yet'}`);
  out.push(`- Stop if: ${a?.stopIf || 'not assessed yet'}`);
  if (a?.removedLinks) out.push(`\n_${a.removedLinks} link(s) not present in the evidence were removed from the assessment._`);
  return out.join('\n');
}

export function renderEvidenceMarkdown(run) {
  const out = [];
  out.push(`# Evidence enrichment — ${run.date}`);
  out.push('');
  out.push(
    '_Separate from Scout\'s original memo and conviction score, which are unchanged. This is research, not a build decision: choosing an idea stays manual (favorites in the bot, results in `outcomes/`)._',
  );
  out.push('');
  const support = run.market?.support;
  out.push(`- Market: ${run.market.locationName} · language \`${run.market.languageCode}\` — DataForSEO Labs support: ${support?.supported === true ? `yes (checked ${day(support.checkedAt)})` : support?.supported === false ? `no — ${support.reason}` : 'not checked'}`);
  out.push(`- Provider status: ${run.provider?.status ?? 'not run'}${run.provider?.reason ? ` — ${run.provider.reason}` : ''}`);
  if (run.source?.planner === 'manual') out.push('- Keyword plan: written by hand for this run (not generated by Scout\'s planner)');
  if (run.original) out.push(`- Scout's original memo: [${esc(run.original.title)}](../${run.original.memo}) — ${run.original.score ?? 'n/a'}/100 ${run.original.conviction ?? ''} (unchanged)`);
  const b = run.budget ?? {};
  if (b.capUsd !== undefined) {
    const total = (run.spend ?? []).reduce((s, x) => s + x.costUsd, 0);
    out.push(
      `- Spend: ${money(b.spentThisRunUsd)} at the last paid attempt · ${money(total)} across ${run.spend?.length ?? 0} charge(s) for this file · shared DataForSEO ledger before that attempt: ${money(b.monthToDateUsdBefore)} this month of a ${money(b.capUsd)} cap (Scout reserve ${money(b.reserveUsd)}, per-run limit ${money(b.maxRunUsd)})`,
    );
  }
  if (run.lastGather?.note) out.push(`- Last check ${day(run.lastGather.at)}: ${run.lastGather.note}`);
  if (run.projection) out.push(`- Requests needed at last attempt (after cache): ${run.projection.labsKeywords} keyword(s), ${run.projection.serpQueries} search result page(s)${run.projection.adsKeywords ? `, ${run.projection.adsKeywords} keyword(s) via the Google Ads fallback` : ''} — projected ${money(run.projection.totalUsd)}`);
  const warn = (run.provider?.warnings ?? []).filter((w) => w !== run.provider?.reason);
  if (warn.length) out.push(`- Notes: ${warn.map(esc).join(' · ')}`);
  if (run.assessmentError) out.push(`- ${esc(run.assessmentError)}`);
  out.push('');
  out.push('How to read this: search volume is searches, not customers; CPC is what advertisers bid, not what customers will pay; Google Ads competition is not SEO difficulty; missing data is unknown, not zero; low volume alone does not rule out a B2B or emerging opportunity. Readings are qualitative on purpose.');

  run.ideas.forEach((idea, i) => {
    out.push('\n---\n');
    out.push(renderIdea(idea, i + 1, run));
  });
  return out.join('\n') + '\n';
}
