// Markdown for evidence/<date>.md — the enriched assessment, kept separate from Scout's
// original memo and score. Tables are rendered from the data by code; the narrative comes
// from the constrained assessment. No sources section entry is ever added that the
// evidence file does not contain.

import { offerPrices } from './evidence.mjs';
import { relevanceOf } from './relevance.mjs';

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
const day = (iso) => (iso ? String(iso).slice(0, 10) : 'n/a');
const money = (n) => (typeof n === 'number' ? `$${n.toFixed(n < 1 ? 5 : 2)}` : 'n/a');
// Google reports very small volumes as 0; show it as the provider's figure, not a fact of zero demand.
const vol = (n) => (typeof n === 'number' ? (n === 0 ? '0 (as reported)' : n.toLocaleString('en-US')) : 'unknown');
const cites = (basis) => (basis?.length ? ` (${basis.map((b) => (typeof b === 'string' ? b : b.id)).join(', ')})` : '');

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

const relText = (rel, id, cls) => (rel.classified ? `${cls}${rel.reason(id) ? ` — ${esc(rel.reason(id))}` : ''}` : 'not judged yet');
const itemText = (rel, id) => {
  const c = rel.competitor(id);
  return `${rel.item(id)}${c === 'direct' ? ' · direct competitor' : c === 'indirect' ? ' · indirect alternative' : ''}`;
};

/** Ambiguous or unjudged relevance cases, for a person to check. */
export function relevanceFlags(idea) {
  if (!idea.relevance) return (idea.keywords ?? []).some((k) => k.status !== 'not_collected') ? ['Evidence has not been judged for relevance yet — no idea-level reading is counted.'] : [];
  const rel = relevanceOf(idea);
  const out = (idea.readings?.demand?.flags ?? []).filter((f) => f.kind === 'uncorroborated').map((f) => f.text);
  const uncertainKw = (idea.keywords ?? []).filter((k) => k.status === 'measured' && rel.keyword(k.id) === 'uncertain');
  if (uncertainKw.length) out.push(`Keywords with data but unclear relevance (not counted): ${uncertainKw.map((k) => `"${k.keyword}" ${k.searchVolume}/mo`).join(', ')}.`);
  const items = [...(idea.serps ?? []).flatMap((s) => s.items ?? []), ...(idea.pages ?? []).filter((p) => !p.error)];
  const unverified = items.filter((i) => rel.unverified(i.id));
  if (unverified.length) out.push(`The judge said these items concern the exact target customer, but their text does not mention every defining trait (${(idea.relevance.qualifiers ?? []).join(' + ')}), so they are not counted: ${unverified.map((i) => `${i.id} "${i.title ?? ''}"`).join('; ')}.`);
  const uncertainItems = items.filter((i) => rel.item(i.id) === 'uncertain' && !rel.unverified(i.id));
  if (uncertainItems.length) out.push(`Items with unclear relevance (not counted): ${uncertainItems.map((i) => i.id).join(', ')}.`);
  return out;
}

function dimensionRows(idea) {
  const a = idea.assessment;
  const r = idea.readings ?? {};
  const rows = [
    ['Customer problem', a?.problemEvidence?.level ?? 'unknown', a ? `${a.problemEvidence.observed || 'No cited observation.'}${cites(a.problemEvidence.basis)}` : 'Not assessed yet.'],
    ['Search demand for this idea (directly relevant keywords only)', `${r.demand?.level ?? 'unknown'}${r.demand?.upTo ? ` (up to ${r.demand.upTo} — flagged)` : ''}`, r.demand?.note ?? 'Not measured.'],
    ['Category-level search demand (context, not idea demand)', r.demand?.category?.level ?? 'unknown', r.demand?.category?.top ? `Largest: "${r.demand.category.top.keyword}" ${r.demand.category.top.searchVolume}/mo` : 'No category-level keyword with data.'],
    ['Broader-market search demand (context, not idea demand)', r.demand?.broader?.level ?? 'unknown', r.demand?.broader?.top ? `Largest: "${r.demand.broader.top.keyword}" ${r.demand.broader.top.searchVolume}/mo` : 'No broader keyword with data.'],
    ['Commercial intent and payment', r.commercial?.level ?? 'unknown', r.commercial?.note ?? 'Not measured.'],
    ['Competitors', a?.competition?.level ?? 'unknown', `${a ? `${a.competition.alternatives.filter((x) => x.type === 'direct').length} direct competitor(s), ${a.competition.alternatives.filter((x) => x.type !== 'direct').length} indirect alternative(s)${cites(a.competition.basis)}. ` : 'Not assessed yet. '}${r.competitors?.note ?? ''}`],
    ['Feasibility of a small first experiment', a?.feasibility?.level ?? 'unknown', a?.feasibility?.note ? `Inference: ${a.feasibility.note}` : 'Not assessed yet.'],
  ];
  return rows.map(([d, l, b]) => `| ${d} | ${l} | ${esc(b)} |`).join('\n');
}

function renderIdea(idea, n, run, rootRel) {
  const out = [];
  const a = idea.assessment;
  out.push(`## ${n}. ${idea.title}`);
  const orig = idea.original ?? null;
  const pick = orig
    ? `Scout's memo [${esc(orig.memo)}](${rootRel}/${orig.memo}): conviction ${orig.conviction ?? 'n/a'}${orig.score != null ? `, score ${orig.score}/100` : ', not scored'} (unchanged)`
    : idea.matchesOriginalPick === true
      ? `Scout's original pick${run.original?.score != null ? ` (original score ${run.original.score}/100, unchanged)` : ''}`
      : idea.matchesOriginalPick === false
        ? 'shortlisted, not Scout\'s final pick'
        : null;
  out.push(`_id \`${idea.id}\` · ${STATUS_TEXT[idea.status] ?? idea.status}${pick ? ` · ${pick}` : ''}_`);
  const im = idea.market ?? run.market;
  const sup = run.marketSupport?.[`${im.locationName.toLowerCase()}|${im.languageCode.toLowerCase()}`] ?? (im === run.market ? run.market.support : null);
  out.push(`\nMarket: **${esc(im.locationName)} · \`${esc(im.languageCode)}\`**${im.source === 'planner' ? ` — chosen by the planner${im.reason ? `: ${esc(im.reason)}` : ''}` : im.source === 'default' ? ` — default market (${esc(im.reason)})` : ''}. DataForSEO Labs support: ${sup?.supported === true ? 'yes' : sup?.supported === false ? `no — ${esc(sup.reason)}` : 'not checked'}.`);
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
  const rel = relevanceOf(idea);
  if (kws.some((k) => k.status !== 'not_collected')) {
    const k0 = kws.find((k) => k.retrievedAt);
    out.push(`\n**Search observations** — DataForSEO, ${esc(k0?.location ?? im.locationName)} · ${esc(k0?.language ?? im.languageCode)}, retrieved ${day(k0?.retrievedAt)}. Each row is a separate keyword; rows overlap and are not added up.`);
    out.push('| ID | Keyword | Intent group | Relevance to this idea | Avg monthly searches | Trend | CPC (USD) | Google Ads competition | Source |\n|---|---|---|---|---|---|---|---|---|');
    for (const k of kws) {
      if (k.status === 'not_collected') {
        out.push(`| ${k.id} | ${esc(k.keyword)} | ${k.group} | — | not collected | — | — | — | — |`);
        continue;
      }
      const source = String(k.provider ?? '').includes('Google Ads') ? 'Google Ads' : k.adsChecked ? 'Labs (Ads checked)' : 'Labs';
      out.push(
        `| ${k.id} | ${esc(k.keyword)} | ${k.group} | ${relText(rel, k.id, rel.keyword(k.id))} | ${k.status === 'no_data' ? 'no data (unknown)' : vol(k.searchVolume)} | ${trendText(k.trend)} | ${typeof k.cpcUsd === 'number' ? k.cpcUsd.toFixed(2) : 'unknown'} | ${k.adCompetitionLevel ?? 'unknown'} | ${source} |`,
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
    for (const alt of a.competition.alternatives) out.push(`- **${esc(alt.name)}** _(${alt.type === 'direct' ? 'direct competitor — same problem' : 'indirect alternative'})_ — ${esc(alt.what)}${cites(alt.basis)}`);
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
      for (const i of s.items.slice(0, 10)) out.push(`- ${i.id} · #${i.rank} ${esc(i.domain)} _(${i.class})_ — [${esc(i.title) || i.url}](${i.url}) — relevance: ${relText(rel, i.id, itemText(rel, i.id))}`);
    }
  }
  const okPages = (idea.pages ?? []).filter((p) => !p.error);
  if (okPages.length) {
    out.push('\nFetched competitor pages:');
    for (const p of okPages) {
      const offers = offerPrices(p).map((m) => m.text).slice(0, 4).join(', ');
      out.push(`- ${p.id} · [${esc(p.title) || p.url}](${p.finalUrl ?? p.url}) — relevance: ${relText(rel, p.id, itemText(rel, p.id))} — retrieved ${day(p.retrievedAt)}; offer prices: ${offers || 'none found'}${p.mentionsFreeTrial ? '; mentions a free trial' : ''}${p.mentionsContactSales ? '; contact-sales / demo' : ''}`);
    }
  }
  const failedPages = (idea.pages ?? []).filter((p) => p.error);
  if (failedPages.length) out.push(`\nNot read: ${failedPages.map((p) => `${p.url} (${p.error})`).join('; ')}.`);
  if (!a?.competition && !idea.serps?.length) out.push('Unknown — no search results collected yet.');

  if (a?.changes?.length) {
    out.push('\n### What changed versus Scout\'s original memo?');
    for (const c of a.changes) out.push(`- **${c.effect}** — original: "${esc(c.original)}" → ${esc(c.finding)}${cites(c.basis)}`);
  }

  const flags = relevanceFlags(idea);
  if (flags.length) {
    out.push('\n### Relevance judgements that need a person');
    out.push('_Relevance is judged automatically and can be wrong. These cases were not counted as idea evidence:_');
    for (const f of flags) out.push(`- ${esc(f)}`);
  }

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
  const v = a?.validation;
  if (v) {
    const notes = [];
    if (v.rejectedCitations?.length) notes.push(`${v.rejectedCitations.length} citation(s) rejected (no verbatim quote from the cited item)`);
    if (v.irrelevantCitations?.length) notes.push(`${v.irrelevantCitations.length} quoted citation(s) removed as not about this customer and problem: ${v.irrelevantCitations.map((x) => `${x.id} (${x.relevance}: ${esc(x.reason)})`).join('; ')}`);
    if (v.downgraded?.length) notes.push(`downgraded: ${v.downgraded.map(esc).join('; ')}`);
    if (v.dropped?.length) notes.push(`dropped: ${v.dropped.map(esc).join('; ')}`);
    if (v.scrubbedSentences) notes.push(`${v.scrubbedSentences} sentence(s) about unmeasured search demand removed`);
    if (v.removedLinks) notes.push(`${v.removedLinks} link(s) not in the evidence removed`);
    if (notes.length) out.push(`\n_Evidence checks on the assessment: ${notes.join(' · ')}._`);
  } else if (a?.removedLinks) {
    out.push(`\n_${a.removedLinks} link(s) not present in the evidence were removed from the assessment._`);
  }
  return out.join('\n');
}

export function renderEvidenceMarkdown(run, { rootRel = '..' } = {}) {
  const out = [];
  out.push(`# Evidence enrichment — ${run.date}`);
  out.push('');
  out.push(
    '_Separate from Scout\'s original memo and conviction score, which are unchanged. This is research, not a build decision: choosing an idea stays manual (favorites in the bot, results in `outcomes/`)._',
  );
  out.push('');
  const support = run.market?.support;
  out.push(`- Default market: ${run.market.locationName} · language \`${run.market.languageCode}\` — DataForSEO Labs support: ${support?.supported === true ? `yes (checked ${day(support.checkedAt)})` : support?.supported === false ? `no — ${support.reason}` : 'not checked'}${run.projection?.markets?.length > 1 ? ` · markets used: ${run.projection.markets.map((m) => `${m.location}/${m.language} (${m.ideas})`).join(', ')}` : ''}`);
  out.push(`- Provider status: ${run.provider?.status ?? 'not run'}${run.provider?.reason ? ` — ${run.provider.reason}` : ''}`);
  if (run.source?.planner === 'manual') out.push('- Keyword plan: written by hand for this run (not generated by Scout\'s planner)');
  if (run.original) out.push(`- Scout's original memo: [${esc(run.original.title)}](${rootRel}/${run.original.memo}) — ${run.original.score ?? 'n/a'}/100 ${run.original.conviction ?? ''} (unchanged)`);
  const b = run.budget ?? {};
  if (b.capUsd !== undefined) {
    const lines = run.spend ?? [];
    const charged = lines.filter((x) => (x.status ?? 'charged') === 'charged').reduce((s, x) => s + (x.costUsd ?? 0), 0);
    const uncertain = lines.filter((x) => x.status === 'uncertain');
    out.push(
      `- Spend: ${money(b.spentThisRunUsd)} at the last paid attempt · ${money(charged)} charged across ${lines.filter((x) => (x.status ?? 'charged') === 'charged').length} request(s) for this file${uncertain.length ? ` · ${uncertain.length} request(s) with unknown outcome held at ${money(uncertain.reduce((s, x) => s + x.estimateUsd, 0))}` : ''} · shared DataForSEO budget before that attempt: ${money(b.monthToDateUsdBefore)} this month of a ${money(b.capUsd)} cap (Scout reserve ${money(b.reserveUsd)}, per-run limit ${money(b.maxRunUsd)}${b.backend ? `, backend ${b.backend}${b.atomic === false ? ' — not atomic' : ''}` : ''})`,
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
    out.push(renderIdea(idea, i + 1, run, rootRel));
  });
  return out.join('\n') + '\n';
}
