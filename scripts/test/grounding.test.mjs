// A valid evidence id is not proof: these tests pin the checks that decide whether a
// model-written claim is actually supported by what it cites.
import test from 'node:test';
import assert from 'node:assert/strict';
import { constrainAssessment } from '../lib/enrich.mjs';
import { checkBasis, evidenceIndex, scrubDemandClaims } from '../lib/grounding.mjs';

const idea = {
  keywords: [
    { id: 'K1', keyword: 'design critique template', group: 'solution', status: 'measured', searchVolume: 170 },
    { id: 'K2', keyword: 'how to give design feedback', group: 'problem', status: 'no_data', searchVolume: null },
  ],
  serps: [
    {
      id: 'S1',
      items: [
        { id: 'S1.1', rank: 1, domain: 'www.reddit.com', class: 'discussion', url: 'https://www.reddit.com/r/UXDesign/x', title: 'I freeze when giving design feedback in English', description: 'Non-native speaker here, every critique session I struggle to phrase criticism politely.' },
        { id: 'S1.2', rank: 2, domain: 'critiquekit.io', class: 'site', url: 'https://critiquekit.io/', title: 'CritiqueKit — structured design feedback templates', description: 'Templates for async design reviews.' },
        { id: 'S1.3', rank: 3, domain: 'uxwriting.guide', class: 'site', url: 'https://uxwriting.guide/feedback', title: 'Feedback phrases for designers', description: 'A phrasebook for critique.' },
        { id: 'S1.4', rank: 4, domain: 'forum.designers.test', class: 'discussion', url: 'https://forum.designers.test/t/1', title: 'Giving critique as an ESL designer', description: 'My manager says my feedback sounds rude.' },
      ],
    },
  ],
  pages: [{ id: 'P1', domain: 'critiquekit.io', url: 'https://critiquekit.io/pricing', title: 'Pricing — CritiqueKit', description: 'Team plan for design reviews', priceMentions: [{ text: '$12/mo', context: 'Team $12/mo per editor' }], error: null }],
  readings: { demand: { level: 'some' }, competitors: { vendorLikeDomains: ['critiquekit.io', 'uxwriting.guide', 'figma.com'] } },
};
const original = 'The Design Critique Kit for Non-Native Designers. Buyers are non-native designers who dread critique sessions. There is no dedicated product for this today.';

test('a valid id without a verbatim quote supports nothing', () => {
  const idx = evidenceIndex(idea);
  const r = checkBasis(['S1.1', { id: 'S1.1', quote: 'people hate critique' }, { id: 'S1.1', quote: 'freeze' }, { id: 'S9.9', quote: 'anything at all here' }, { id: 'S1.1', quote: 'I freeze when giving design feedback' }], idx);
  assert.deepEqual(r.supported.map((s) => s.id), ['S1.1']);
  assert.deepEqual(r.rejected.map((x) => x.reason), ['no quote', 'quote not found in the cited item', 'quote too short to check', 'unknown evidence id']);
});

test('levels are capped by what the quotes can carry', () => {
  const out = constrainAssessment(
    {
      problemEvidence: { level: 'strong', basis: [{ id: 'S1.1', quote: 'I freeze when giving design feedback in English' }], observed: 'A designer describes freezing.' },
      competition: { level: 'crowded', basis: [{ id: 'P1', quote: 'Team $12/mo per editor' }] },
    },
    idea,
    { original },
  );
  assert.equal(out.problemEvidence.level, 'moderate'); // one domain cannot be "strong"
  assert.equal(out.competition.level, 'some'); // one vendor domain cannot be "crowded"
  assert.ok(out.validation.downgraded.some((d) => /strong → moderate/.test(d)));

  const keywordOnly = constrainAssessment({ problemEvidence: { level: 'moderate', basis: [{ id: 'K1', quote: 'design critique template' }], observed: 'People search for templates.' } }, idea, { original });
  assert.equal(keywordOnly.problemEvidence.level, 'unknown'); // search demand is not problem evidence
  assert.equal(keywordOnly.problemEvidence.observed, '');

  const twoDomains = constrainAssessment({ problemEvidence: { level: 'strong', basis: [{ id: 'S1.1', quote: 'I freeze when giving design feedback' }, { id: 'S1.4', quote: 'my feedback sounds rude' }] } }, idea, { original });
  assert.equal(twoDomains.problemEvidence.level, 'strong');
});

test('"sparse" competition is refused when the collected results show several vendors', () => {
  const out = constrainAssessment({ competition: { level: 'sparse', basis: [] } }, idea, { original });
  assert.equal(out.competition.level, 'unknown');
});

test('absence claims are inference; alternatives must be named in their quoted evidence', () => {
  const out = constrainAssessment(
    {
      competition: {
        level: 'some',
        basis: [{ id: 'S1.2', quote: 'structured design feedback templates' }],
        alternatives: [
          { name: 'CritiqueKit', what: 'feedback templates', basis: [{ id: 'P1', quote: 'Team $12/mo per editor' }] },
          { name: 'FeedbackPro', what: 'invented', basis: [{ id: 'S1.3', quote: 'A phrasebook for critique' }] },
        ],
        gaps: [{ text: 'CritiqueKit has no guidance for non-native speakers', basis: [{ id: 'S1.2', quote: 'Templates for async design reviews' }], kind: 'observed' }],
        strengths: [{ text: 'Sells a team plan at $12 per editor', basis: [{ id: 'P1', quote: 'Team $12/mo per editor' }], kind: 'observed' }],
      },
    },
    idea,
    { original },
  );
  assert.deepEqual(out.competition.alternatives.map((x) => x.name), ['CritiqueKit']);
  assert.equal(out.competition.gaps[0].kind, 'inference');
  assert.equal(out.competition.strengths[0].kind, 'observed');
  assert.ok(out.validation.dropped.some((d) => /FeedbackPro/.test(d)));
});

test('missing data stays unknown: invented or misquoted volumes are removed', () => {
  const r = scrubDemandClaims(
    'Demand is real. "how to give design feedback" gets 900 searches a month. Nobody searches for how to give design feedback. "design critique template" has 5,000 monthly searches. "design critique template" has 170 searches per month.',
    idea,
  );
  assert.equal(r.removed, 3);
  assert.match(r.text, /Demand is real\./);
  assert.match(r.text, /170 searches per month/);

  const unmeasured = { ...idea, readings: { ...idea.readings, demand: { level: 'unknown' } } };
  assert.equal(scrubDemandClaims('There is low demand for this.', unmeasured).removed, 1);
  assert.equal(scrubDemandClaims('Measured demand was modest.', idea).removed, 0);
});

test('"what changed" must quote Scout\'s memo, and needs quoted evidence to claim an effect', () => {
  const out = constrainAssessment(
    {
      changes: [
        { original: 'There is no dedicated product for this today', finding: 'CritiqueKit sells structured feedback templates.', basis: [{ id: 'S1.2', quote: 'structured design feedback templates' }], effect: 'contradicts' },
        { original: 'Buyers are non-native designers', finding: 'Unclear.', basis: [{ id: 'S1.1' }], effect: 'supports' },
        { original: 'This market is worth $4 billion', finding: 'Invented original.', basis: [], effect: 'weakens' },
      ],
    },
    idea,
    { original },
  );
  assert.deepEqual(out.changes.map((c) => c.effect), ['contradicts', 'untested']);
  assert.ok(out.validation.dropped.some((d) => /not in Scout's memo/.test(d)));
});

test('invented links are removed from every text field', () => {
  const out = constrainAssessment({ opportunity: 'See https://invented.example/report and https://critiquekit.io/pricing' }, idea, { original });
  assert.equal(out.validation.removedLinks, 1);
  assert.match(out.opportunity, /critiquekit\.io\/pricing/);
});
