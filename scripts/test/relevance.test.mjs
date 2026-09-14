// Focused regressions for relevance, built from the 10-idea pilot's REAL measurements and search
// results (evidence/pilots/pilot-10-planner-v3 and pilot-10-source-order). They pin two failures:
//   1. broad head terms inflating idea-level demand (4 ideas), including when the relevance judge
//      itself gets a keyword wrong — the deterministic corroboration guard must hold;
//   2. "strong" problem evidence from items about a different audience (the language-barrier case).
// The judgements here are fixtures, not model output: they test the rules, not the model.
import test from 'node:test';
import assert from 'node:assert/strict';
import { keywordClass, itemClass, competitorType, relevanceDemand, normalizeRelevance, effectiveCustomer, relevanceOf } from '../lib/relevance.mjs';
import { constrainAssessment, relevanceReadings } from '../lib/enrich.mjs';
import { scrubDemandClaims } from '../lib/grounding.mjs';

const kw = (rows) => rows.map(([id, keyword, group, searchVolume]) => ({ id, keyword, group, status: searchVolume === null ? 'no_data' : 'measured', searchVolume }));
const judge = (topics) => ({ keywords: Object.fromEntries(Object.entries(topics).map(([id, topic]) => [id, { searcher: 'includes', topic, reason: 'fixture' }])), items: {} });
const demandFor = (keywords, topics) => relevanceDemand(keywords, { keywords, relevance: judge(topics) });

// ---------- 1. Broad keywords must not set idea-level demand ----------

const IDEAS = {
  '2026-04-27': {
    keywords: kw([['K1', 'non native english communication', 'problem', null], ['K6', 'business communication phrases', 'solution', 10], ['K8', 'professional english course', 'buying', 110]]),
    correct: { K1: 'same', K6: 'category', K8: 'wider' },
    broad: 'K8',
    expect: { idea: 'unknown', broader: 'some', misjudged: 'unknown', upTo: 'some' },
  },
  '2026-04-30': {
    keywords: kw([['K1', 'how to present design', 'problem', 10], ['K2', 'design presentation tips', 'problem', 40], ['K4', 'design template', 'solution', 1900], ['K8', 'best presentation tools', 'buying', 720]]),
    correct: { K1: 'same', K2: 'same', K4: 'wider', K8: 'wider' },
    broad: 'K4',
    expect: { idea: 'low', broader: 'substantial', misjudged: 'low', upTo: 'substantial' },
  },
  '2026-05-02': {
    keywords: kw([['K1', 'how to write ux case study', 'problem', 10], ['K4', 'case study template', 'solution', 1600]]),
    correct: { K1: 'same', K4: 'wider' },
    broad: 'K4',
    expect: { idea: 'low', broader: 'substantial', misjudged: 'low', upTo: 'substantial' },
  },
  '2026-05-04': {
    keywords: kw([['K1', 'how to write ai prompts', 'problem', 320], ['K4', 'ai prompts', 'solution', 12100], ['K9', 'prompt engineering course cost', 'buying', 10]]),
    correct: { K1: 'wider', K4: 'wider', K9: 'wider' },
    broad: 'K4',
    expect: { idea: 'unknown', broader: 'substantial', misjudged: 'unknown', upTo: 'substantial' },
  },
};

for (const [id, c] of Object.entries(IDEAS)) {
  test(`${id}: idea-level demand comes from direct keywords only; broader demand is shown separately`, () => {
    const d = demandFor(c.keywords, c.correct);
    assert.equal(d.level, c.expect.idea);
    assert.equal(d.broader.level, c.expect.broader);
    assert.equal(d.upTo, null);
    // A sentence claiming strong search demand for the idea is removed.
    assert.equal(scrubDemandClaims('There is strong search demand for this product.', { keywords: c.keywords, readings: { demand: d } }).removed, 1);
  });

  test(`${id}: if the judge wrongly calls the broad keyword direct, the corroboration guard still keeps it out and flags it`, () => {
    const d = demandFor(c.keywords, { ...c.correct, [c.broad]: 'same' });
    assert.equal(d.level, c.expect.misjudged);
    assert.equal(d.upTo, c.expect.upTo);
    assert.ok(d.flags.some((f) => f.id === c.broad && f.kind === 'uncorroborated'));
  });
}

test('the guard has a limit, stated here: two broad keywords both misjudged direct still lift the level one band', () => {
  const c = IDEAS['2026-05-04'];
  const d = demandFor(c.keywords, { K1: 'same', K4: 'same', K9: 'wider' });
  assert.equal(d.level, 'some'); // truth is unknown; "some" is flagged with upTo substantial for a person
  assert.equal(d.upTo, 'substantial');
});

test('missing or unclear judgements never count as relevant', () => {
  const c = IDEAS['2026-04-30'];
  assert.equal(relevanceDemand(c.keywords, { keywords: c.keywords }).level, 'unknown'); // not judged at all
  const d = relevanceDemand(c.keywords, { keywords: c.keywords, relevance: { keywords: { K1: { searcher: 'includes', topic: 'unclear', reason: 'x' }, K2: { searcher: 'includes', topic: 'same' } }, items: {} } });
  assert.equal(d.level, 'unknown'); // K1 unclear, K2 has no reason → both uncertain
  assert.equal(d.uncertainCount, 4);
  assert.equal(keywordClass({ searcher: 'excludes', topic: 'same', reason: 'mostly students' }), 'broader');
});

// ---------- 2. Problem and competitor evidence must concern the same customer and problem ----------

const langIdea = () => ({
  id: '2026-04-29',
  plan: {
    targetCustomer: 'Non-native English-speaking UX designers or researchers working for US/UK companies.',
    problem: 'Non-native English-speaking UX designers lack confidence and linguistic tools to conduct user interviews and present findings to native-speaking stakeholders.',
  },
  keywords: kw([['K4', 'ux research templates', 'solution', 50]]),
  serps: [
    {
      id: 'S2',
      query: 'ux research language barrier',
      items: [
        { id: 'S2.2', rank: 2, domain: 'www.reddit.com', class: 'discussion', url: 'https://www.reddit.com/r/Journalism/comments/1ako5r8/help_interviewing_someone_with_a_language_barrier/', title: 'Help! Interviewing someone with a language barrier', description: 'My question is: what is the best way to communicate with him?' },
        { id: 'S2.6', rank: 6, domain: 'www.objectiveexperience.com', class: 'site', url: 'https://www.objectiveexperience.com/ux-research-and-language-barriers/', title: 'UX research and language barriers - the best tips', description: "Ux research and language barriers discusses how you run your research projects when you don't speak the same language as your target group." },
        { id: 'S2.9', rank: 9, domain: 'medium.com', class: 'reference_media', url: 'https://medium.com/@tffnysun/user-research-study-breaking-language-barriers-75061803ca74', title: 'User Research Study: Breaking Language Barriers', description: 'Construct a survey to find users who may be facing the same language barrier problems.' },
        { id: 'S2.10', rank: 10, domain: 'userresearch.blog.gov.uk', class: 'government', url: 'https://userresearch.blog.gov.uk/2023/01/16/tips-for-communicating-across-a-language-barrier/', title: 'Tips for communicating across a language barrier', description: 'In not sharing a common language with participants or the subject matter, observation became the purest form of usability testing.' },
      ],
    },
  ],
  pages: [],
  readings: { demand: { level: 'unknown' }, competitors: { vendorLikeDomains: [] } },
});
// The live model's own claim (run 34822795160): "strong", citing all four with verbatim quotes.
const liveClaim = {
  problemEvidence: {
    level: 'strong',
    basis: [
      { id: 'S2.6', quote: 'UX research and language barriers - the best tips' },
      { id: 'S2.2', quote: 'Help! Interviewing someone with a language barrier' },
      { id: 'S2.9', quote: 'User Research Study: Breaking Language Barriers' },
      { id: 'S2.10', quote: 'Tips for communicating across a language barrier' },
    ],
    observed: 'Multiple articles address UX research and language barriers.',
  },
  changes: [{ original: 'non-native speaker, i have little confidence in my communication ability', finding: 'Search results are filled with articles about this problem.', basis: [{ id: 'S2.6', quote: 'UX research and language barriers' }, { id: 'S2.2', quote: 'Interviewing someone with a language barrier' }], effect: 'supports' }],
};
const memo = 'Real quote: "non-native speaker, i have little confidence in my communication ability".';
const withJudgements = (items) => ({ ...langIdea(), relevance: { keywords: {}, items } });

test('2026-04-29: quoted items about researchers interviewing PARTICIPANTS with a language barrier cannot make problem evidence strong', () => {
  const different = { customer: 'different', problem: 'broader', offering: 'no', reason: 'about researchers or journalists interviewing people who speak another language, not non-native researchers' };
  const idea = withJudgements({ 'S2.2': { ...different, reason: 'a journalist interviewing someone with limited English' }, 'S2.6': different, 'S2.9': different, 'S2.10': different });
  const out = constrainAssessment(liveClaim, idea, { original: memo });
  assert.equal(out.problemEvidence.level, 'unknown');
  assert.deepEqual(out.problemEvidence.basis, []);
  assert.equal(out.problemEvidence.observed, '');
  assert.equal(out.validation.irrelevantCitations.filter((x) => x.claim === 'problem evidence').length, 4);
  assert.equal(out.changes[0].effect, 'untested');
  assert.ok(out.validation.downgraded.some((d) => /different customer or problem/.test(d)));
});

test('2026-04-29: unjudged items do not count; a broader-audience item carries at most "weak"', () => {
  assert.equal(constrainAssessment(liveClaim, langIdea(), { original: memo }).problemEvidence.level, 'unknown');
  const broader = { customer: 'broader', problem: 'same', offering: 'no', reason: 'language barriers in research for any researcher' };
  const out = constrainAssessment(liveClaim, withJudgements({ 'S2.6': broader, 'S2.10': broader }), { original: memo });
  assert.equal(out.problemEvidence.level, 'weak');
  assert.ok(out.validation.downgraded.some((d) => /broader audience/.test(d)));
});

test('competitors: direct (same problem) vs indirect (adjacent) is derived from the evidence, not the model\'s label', () => {
  const idea = {
    ...withJudgements({
      'S2.6': { customer: 'broader', problem: 'broader', offering: 'yes', reason: 'a research agency for any team' },
      'S2.9': { customer: 'broader', problem: 'same', offering: 'yes', reason: 'a course on interviewing across languages' },
    }),
  };
  const out = constrainAssessment(
    {
      competition: {
        level: 'crowded',
        basis: [{ id: 'S2.6', quote: 'UX research and language barriers' }, { id: 'S2.9', quote: 'Breaking Language Barriers' }, { id: 'S2.2', quote: 'Interviewing someone with a language barrier' }],
        alternatives: [
          { name: 'Objective Experience', type: 'direct', what: 'research agency', basis: [{ id: 'S2.6', quote: 'UX research and language barriers' }] },
          { name: 'Breaking Language Barriers study', type: 'direct', what: 'study', basis: [{ id: 'S2.9', quote: 'Breaking Language Barriers' }] },
        ],
      },
    },
    idea,
    { original: memo },
  );
  assert.equal(out.competition.level, 'some'); // S2.2 was not judged → removed; two domains cannot be crowded
  assert.deepEqual(out.competition.alternatives.map((x) => [x.name, x.type]), [['Objective Experience', 'indirect'], ['Breaking Language Barriers study', 'direct']]);
  assert.ok(out.validation.downgraded.some((d) => /Objective Experience" direct → indirect/.test(d)));
  assert.deepEqual(out.competition.directCompetitors, ['medium.com']);
});

test('item and competitor classes follow the stated rules', () => {
  const r = 'fixture';
  assert.equal(itemClass({ customer: 'same', problem: 'same', reason: r }), 'direct');
  assert.equal(itemClass({ customer: 'broader', problem: 'same', reason: r }), 'category');
  assert.equal(itemClass({ customer: 'broader', problem: 'broader', reason: r }), 'broader');
  assert.equal(itemClass({ customer: 'different', problem: 'same', reason: r }), 'unrelated');
  assert.equal(itemClass({ customer: 'same', problem: 'same' }), 'uncertain'); // no reason
  assert.equal(competitorType({ customer: 'broader', problem: 'same', offering: 'yes', reason: r }), 'direct');
  assert.equal(competitorType({ customer: 'same', problem: 'broader', offering: 'yes', reason: r }), 'indirect');
  assert.equal(competitorType({ customer: 'same', problem: 'same', offering: 'no', reason: r }), 'none');
  assert.equal(competitorType({ customer: 'same', problem: 'same', offering: 'unclear', reason: r }), 'uncertain');
});

test('judgements for unknown ids are ignored and missing ids are listed; readings recompute from them', () => {
  const c = IDEAS['2026-05-02'];
  const idea = { id: 'x', status: 'enriched', keywords: c.keywords, serps: [], pages: [], evidenceUpdatedAt: 't1' };
  idea.relevance = normalizeRelevance({ keywords: [{ id: 'K1', searcher: 'includes', topic: 'same', reason: 'the idea\'s job' }, { id: 'K99', searcher: 'includes', topic: 'same', reason: 'invented id' }] }, idea);
  assert.deepEqual(Object.keys(idea.relevance.keywords), ['K1']);
  assert.deepEqual(idea.relevance.missing, ['K4']);
  const readings = relevanceReadings(idea);
  assert.equal(readings.demand.level, 'low');
  assert.equal(readings.demand.broader.level, 'unknown'); // K4 unjudged → uncertain, not broader
  assert.equal(readings.demand.uncertainCount, 1);
});

// ---------- 3. "Same customer" must match every defining trait (live run 34835604116 misjudgements) ----------

test('2026-05-01: items about all non-native business communicators are not the freelance-designer customer', () => {
  // The judge said customer "same" for both, which lifted problem evidence to "strong". Its own trait list shows why that is wrong.
  const qualifiers = ['non-native English speaker', 'freelance designer'];
  const researchgate = { customer: 'same', customerMatches: ['non-native English speaker'], problem: 'same', offering: 'no', reason: 'cognitive load of non-native speakers in business communication' };
  const coursera = { customer: 'same', customerMatches: ['non-native English speaker'], problem: 'same', offering: 'yes', reason: 'business English course for non-native speakers' };
  assert.equal(effectiveCustomer(researchgate, qualifiers), 'broader');
  const idea = {
    id: '2026-05-01',
    keywords: [],
    serps: [{ id: 'S2', items: [
      { id: 'S2.3', domain: 'www.researchgate.net', url: 'https://www.researchgate.net/x', title: '(PDF) Effect on Non-Native English Speakers of Utilizing ...', description: 'Non-native English speakers who use English for business communication may have a higher cognitive load' },
      { id: 'S2.5', domain: 'www.coursera.org', url: 'https://www.coursera.org/specializations/business-english', title: 'Business English for Non-Native Speakers Specialization', description: 'This Specialization will introduce non-native speakers of English to methods for developing English language and communication skills.' },
    ] }],
    pages: [],
    readings: { demand: { level: 'unknown' }, competitors: {} },
    relevance: { qualifiers, keywords: {}, items: { 'S2.3': researchgate, 'S2.5': coursera } },
  };
  const out = constrainAssessment(
    { problemEvidence: { level: 'strong', basis: [{ id: 'S2.3', quote: 'higher cognitive load' }, { id: 'S2.5', quote: 'Business English for Non-Native Speakers' }], observed: 'x' } },
    idea,
    { original: '' },
  );
  assert.equal(out.problemEvidence.level, 'weak'); // broader audience only
  assert.equal(relevanceOf(idea).narrowed('S2.3'), true);
  assert.equal(relevanceOf(idea).competitor('S2.5'), 'direct'); // still a competitor for the same problem, to a broader group
});

test('2026-04-30: presentation anxiety of all designers is not the non-native designer customer; a full match stays "same"', () => {
  const qualifiers = ['non-native English speaker', 'UX/product designer'];
  const reddit = { customer: 'same', customerMatches: ['UX/product designer'], problem: 'same', offering: 'no', reason: 'designers afraid of presenting' };
  assert.equal(itemClass({ ...reddit, customer: effectiveCustomer(reddit, qualifiers) }), 'category');
  assert.equal(effectiveCustomer({ ...reddit, customerMatches: ['UX/product designer', 'Non-native English speaker '] }, qualifiers), 'same'); // case/space-insensitive
  assert.equal(effectiveCustomer(reddit, []), 'broader'); // no trait list → cannot verify → not "same"
  assert.equal(effectiveCustomer({ customer: 'different' }, qualifiers), 'different');
});
