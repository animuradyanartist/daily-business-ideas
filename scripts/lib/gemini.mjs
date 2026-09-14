// Gemini calls shared by Scout's scripts: Pro first, Flash on transient failure, bounded
// retries on 429/5xx. `search` turns on Google Search grounding (the research stages);
// `json` asks for a JSON response and turns grounding off (the enrichment planner and
// assessor, which must work only from evidence they are given).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createGemini(apiKey, { fetchImpl = fetch } = {}) {
  async function rawCall(model, prompt, opts, attempt = 1) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: opts.temperature, maxOutputTokens: opts.maxTokens },
    };
    if (opts.json) body.generationConfig.responseMimeType = 'application/json';
    else if (opts.search) body.tools = [{ google_search: {} }];

    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

    const status = res.status;
    const errBody = await res.text();
    console.error(`${model} returned ${status}: ${errBody.slice(0, 250)}`);

    if ((status === 429 || status >= 500) && attempt < 3) {
      const wait = 2 ** attempt * 1000;
      console.log(`Retrying ${model} in ${wait}ms…`);
      await sleep(wait);
      return rawCall(model, prompt, opts, attempt + 1);
    }
    throw new Error(`${model} failed after ${attempt} attempts: ${status}`);
  }

  async function generate(
    label,
    prompt,
    { temperature = 0.5, maxTokens = 8192, search = true, json = false, models = ['gemini-2.5-pro', 'gemini-2.5-flash'] } = {},
  ) {
    const opts = { temperature, maxTokens, search, json };
    let data;
    for (let i = 0; i < models.length; i++) {
      console.log(`[${label}] prompt ${prompt.length} chars — calling ${models[i]}…`);
      try {
        data = await rawCall(models[i], prompt, opts);
        break;
      } catch (err) {
        if (i === models.length - 1) throw err;
        console.error(`[${label}] ${models[i]} exhausted retries — falling back to ${models[i + 1]}.`);
      }
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    if (!text || text.length < (json ? 2 : 80)) {
      throw new Error(`[${label}] empty / too-short output (${text.length} chars)`);
    }
    console.log(`[${label}] got ${text.length} chars`);
    return text;
  }

  async function generateJson(label, prompt, opts = {}) {
    const text = await generate(label, prompt, { ...opts, json: true });
    return parseJsonLoose(text);
  }

  return { generate, generateJson };
}

/** Parse JSON that may arrive wrapped in a markdown fence. */
export function parseJsonLoose(text) {
  const t = String(text ?? '').trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : t;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error('model output was not valid JSON');
  }
}
