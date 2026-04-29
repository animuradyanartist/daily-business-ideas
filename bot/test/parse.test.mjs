import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIdeaTitle,
  parseTrendTitle,
  parseConviction,
  preview,
} from '../src/parse.mjs';

test('parseIdeaTitle extracts first H1', () => {
  const md = `# UX Research Kit for Non-Native Designers\n\n_2026-04-29 · conviction: high_\n\nMore content.`;
  assert.equal(parseIdeaTitle(md), 'UX Research Kit for Non-Native Designers');
});

test('parseIdeaTitle returns fallback for missing H1', () => {
  assert.equal(parseIdeaTitle('no headings here'), 'Untitled');
});

test('parseTrendTitle extracts first "## Trend 1:" name', () => {
  const md = `# Daily trend forecast — 2026-04-29\n\n## Trend 1: Short-Form Video Workflows\n\nbody...`;
  assert.equal(parseTrendTitle(md), 'Short-Form Video Workflows');
});

test('parseTrendTitle returns fallback when no Trend 1 heading', () => {
  assert.equal(parseTrendTitle('# Daily trend forecast\n\nno trend headings'), 'Untitled');
});

test('parseConviction returns high/medium/low', () => {
  assert.equal(parseConviction('_2026-04-29 · conviction: high_'), 'high');
  assert.equal(parseConviction('_2026-04-29 · conviction: medium_'), 'medium');
  assert.equal(parseConviction('_2026-04-29 · conviction: low_'), 'low');
});

test('parseConviction returns null when missing', () => {
  assert.equal(parseConviction('no conviction line'), null);
});

test('preview returns first N chars without leading markdown noise', () => {
  const md = `# Title\n\n_2026-04-29 · conviction: high_\n\n## The idea\nA swipe file of plug-and-play questions.`;
  const out = preview(md, 100);
  assert.match(out, /A swipe file/);
  assert.ok(out.length <= 100);
});

test('preview ends mid-sentence with ellipsis if truncated', () => {
  const longBody = '## The idea\n' + 'word '.repeat(200);
  const out = preview(longBody, 50);
  assert.ok(out.endsWith('…') || out.endsWith('...'));
});
