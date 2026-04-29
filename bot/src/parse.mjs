// Pure functions for parsing memo files.

export function parseIdeaTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

export function parseTrendTitle(md) {
  const m = md.match(/^##\s+Trend 1:\s*(.+)$/m);
  return m ? m[1].trim() : 'Untitled';
}

export function parseConviction(md) {
  const m = md.match(/conviction:\s*(high|medium|low)/i);
  return m ? m[1].toLowerCase() : null;
}

export function preview(md, max = 500) {
  const lines = md.split('\n');
  const body = [];
  let inBody = false;
  for (const line of lines) {
    if (!inBody) {
      const trimmed = line.trim();
      if (
        trimmed === '' ||
        trimmed.startsWith('#') ||
        /^_.*conviction.*_$/.test(trimmed) ||
        trimmed === '---'
      ) {
        continue;
      }
      inBody = true;
    }
    body.push(line);
  }
  const text = body.join(' ').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}
