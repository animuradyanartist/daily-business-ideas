# Evidence pilot — 10 existing Scout ideas

_Research comparison only. Scout's original memos and scores are unchanged, nothing here selects an idea for building, and the bot's manual favorites were not touched._

## Selection
- Rule: No explicit pilot queue exists, so the first 10 memos in Scout's original source order were selected: ideas/YYYY-MM-DD.md sorted by file name (the date Scout produced them), oldest first. Non-daily memos (e.g. ideas/2026-06-03-pattern-break.md) are not part of the daily source order.
- Checked for an explicit queue: pilot/queue.json: not present; PILOT_QUEUE.md: not present; evidence/pilots/queue.json: not present; outcomes/pilot-queue.md: not present; outcomes/: 0 outcome file(s) (not a queue); Telegram bot favorites (manual selection, Cloudflare KV): not read and not changed
- Stable ids: `2026-04-27`, `2026-04-28`, `2026-04-29`, `2026-04-30`, `2026-05-01`, `2026-05-02`, `2026-05-03`, `2026-05-04`, `2026-05-05`, `2026-05-06`
- Earlier 3-idea pilot (2026-09-13, 2026-09-11, 2026-08-21): overlap with this pilot — none; kept separately in `evidence/pilots/pilot-3-manual-plans`.

## Spend (kept separate)
| | USD | Source |
|---|---|---|
| Previous pilot (3 ideas, 2026-09-14) | $0.13920 | shared ledger rows produced by scout before this pilot |
| This pilot — estimated before buying | $0.07480 | dry-run preview (published prices, before cache) |
| This pilot — actual, provider-reported | $0.06604 | 22 charged request(s) |
| This pilot — outcome unknown (held at estimate) | $0.00000 | 0 request(s) |

Budget backend for this pilot: legacy-ledger (not atomic: the reservation functions are awaiting review, so spend was recorded in the existing ledger). Shared cap $2.00000, Scout reserve $1.00000, per-run limit $0.10000. Google Ads fallback: off.

## Assessments — provenance
- Written by gemini-2.5-pro → gemini-2.5-flash in GitHub Actions run 34838611190; validators re-applied offline to that run's stored model output at 2026-09-14T11:46:24.722Z.
- Every citation below carries a verbatim quote found in the cited item; that proves a claim is grounded, not that it is on-topic.

## Relevance checks — before → after

_Before: "Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)" (kept unchanged in run.json under `history`). After: the same collected evidence (no new DataForSEO request), every keyword and item judged for this idea's customer and problem (GitHub Actions run 34838611190), then re-assessed. Demand "after" counts directly relevant keywords only; "≤X?" = would reach X if a flagged keyword is confirmed. Competition "Nd/Mi" = direct competitors / indirect alternatives named._

| Idea | Market | Demand before | Idea-level demand after | Category · broader demand | Problem evidence before → after | Competition before → after | Flags |
|---|---|---|---|---|---|---|---|
| `2026-04-27` | United States/en | low | unknown | low · unknown | moderate → unknown | some → sparse · 0d/1i | 1 |
| `2026-04-28` | United States/en | some | unknown | some · unknown | weak → weak | crowded → unknown · 0d/4i | 1 |
| `2026-04-29` | United States/en | low | unknown | low · unknown | strong → weak | some → unknown · 0d/3i | 1 |
| `2026-04-30` | United States/en | some | unknown | some · unknown | weak → weak | crowded → crowded · 0d/4i | 0 |
| `2026-05-01` | India/en | unknown | unknown | unknown · unknown | moderate → weak | some → some · 1d/2i | 0 |
| `2026-05-02` | United States/en | unknown | unknown | unknown · unknown | weak → weak | crowded → crowded · 0d/4i | 0 |
| `2026-05-03` | United States/en | low | unknown | low · unknown | strong → weak | some → some · 4d/0i | 0 |
| `2026-05-04` | United States/en | unknown | unknown | unknown · unknown | moderate → weak | crowded → some · 4d/0i | 0 |
| `2026-05-05` | United States/en | some | low (≤some?) | unknown · unknown | weak → weak | some → some · 2d/0i | 1 |
| `2026-05-06` | United States/en | low | low | unknown · unknown | weak → unknown | crowded → crowded · 0d/6i | 0 |

---

## 1. Async English — Slack and PR-comment swipe file for non-native software professionals
`2026-04-27` · [ideas/2026-04-27.md](../../../ideas/2026-04-27.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): Buyer: a non-native English-speaking software professional (engineer, PM, designer) working remote/hybrid for a US, UK, or pan-EU company. Most likely Indian, Polish, Brazilian, Turkish, French, Spanish, or Ukrainian. They read and listen to English fine but freeze when typing async — they over-hedge, sound rude by accident, get talked over in standups. Real pain in their words: - Talaera's blog on virtual…
- Size claim (Scout): Napkin TAM: ~30M non-native English speakers working in tech globally (rough — H1B SWE alone is >100k just in US queues, plus EU remote talent and offshore teams). If 0.05% buy a $39 product: 15,000 × $39 = $585k ceiling. Reachable serviceable market for a solo creator is the slice that lives in the named Reddit/LinkedIn/Discord communities — call that 200,000–500,000 people one or two hops from organic…

**New search and competitor evidence** — United States · en (planner: The target customers often work for US-based companies or in US-centric tech environments, and the problem is about professional English communication in that context.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 2 directly relevant keyword(s) returned data (unknown, not zero). Category-level: low ("business english phrases" 30/mo); broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "how to write professional english" 10/mo; "business english phrases" 30/mo; "english for software engineers" 20/mo; no data for 6 of 9
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Published offer prices seen on 1 ranking site(s): oxfordlanguageclub.com. Prices show what sellers ask, not verified sales, and a ranking site is not necessarily a direct competitor.
- Competitors: 12 vendor-like or publisher domain(s) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on oxfordlanguageclub.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 2 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **unknown**
- Alternatives: Oxford Language Club _(indirect alternative)_ — Offers online English courses covering grammar, speaking, writing, and more, leading to a certificate. (P2)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking software professionals (engineers, PMs, designers) working remotely or hybrid for US, UK, or pan-EU companies. · problem: Non-native English-speaking software professionals struggle to communicate effectively and confidently in written async English within remote tech teams, often sounding rude or over-hedging.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| how to write professional english | 10 | uncertain | This is a general query for any professional wanting to improve their English, not specific to non-native software professionals or async communication. |
| non native english communication issues | no data | direct | This search directly describes the target customer's identity and general problem area. |
| improve english for tech jobs | no data | direct | This query combines the need to improve English with the specific context of the tech industry, matching the target customer. |
| business english phrases | 30 | category | This is a general search for business English resources, not specific to the tech context or async communication challenges of the target customer. |
| professional communication templates | no data | category | This is a broad search for communication templates for any profession, not specifically for non-native software professionals. |
| english for software engineers | 20 | uncertain | This search is highly specific to the target customer's role and their need for English skills. |
| buy english communication guide | no data | category | This is a generic buying-intent search for any English communication guide, not specific to the target customer's niche. |
| best english phrases for work | no data | category | This is a general search for work-related English phrases, not specific to the tech industry or async communication. |
| english for tech professionals course | no data | uncertain | This search is highly specific to the target customer (tech professionals) and their problem (needing better English). |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| P2 oxfordlanguageclub.com — Oxford Language Club | broader | indirect | yes | This is a general English language school offering courses to a wide audience, not specifically for software professionals. |

_Flagged for a person (not counted):_
- Keywords with data but unclear relevance (not counted): "how to write professional english" 10/mo, "english for software engineers" 20/mo.

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand low ("business english phrases" 30/mo) · problem evidence moderate · competition some · changes supports. **After:** idea-level demand unknown · problem evidence unknown · competition sparse · 0d/1i · changes untested/untested.

**What changed and why**

- untested: Scout said "AI rewriters (Grammarly, Professionally) created the category" → No evidence about AI rewriters as competitors or category creators was found in the search results.
- untested: Scout said "Notion templates for language learning are a proven Gumroad/Notion-marketplace category" → No evidence was found to support or refute the demand for Notion templates specifically for language learning.

**Remaining uncertainty**

- That non-native software professionals perceive this as a significant, painful problem.
- That they are willing to pay for a static swipe file rather than using free resources, AI tools, or general language courses.
- That a swipe file is a more desirable solution than interactive tools or tutoring.
- 6 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 0 downgrade(s), 2 dropped claim(s).

**Cheapest useful validation experiment:** Create a landing page offering a free lead magnet: '10 Native-Sounding Slack Openers for Non-Native Engineers'. Drive traffic from relevant subreddits and measure email sign-ups. _(cost: ~$50 for landing page tool + 10-15 hours, 2 weeks)_

**Continue if:** The experiment generates at least 50 email sign-ups, with some qualitative replies to a follow-up email confirming the pain point.

**Stop if:** The experiment generates fewer than 10 email sign-ups, or feedback indicates the problem is not a priority or is already solved by other means (e.g., Grammarly).

---

## 2. LinkedIn-Native — Canva carousel pack plus native-sounding caption swipes for non-native solo designers
`2026-04-28` · [ideas/2026-04-28.md](../../../ideas/2026-04-28.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): Buyer: a non-native English-speaking solo designer, illustrator, or freelance creative (graphic / UX / product / brand) based in EU, LatAm, India, MENA, SEA, who wants to win remote clients or build personal brand on LinkedIn. They are visually fluent — they make beautiful work — but freeze when typing English captions. They open Canva, design a gorgeous carousel, then either don't post it, post a stilted caption…
- Size claim (Scout): Napkin TAM: ~10M non-native English-speaking creative professionals on LinkedIn globally (LinkedIn has ~1B users; ~10% creative + non-native is conservative). At 0.05% conversion to a $39 product: 5,000 × $39 = $195k ceiling. Reachable serviceable market for a solo founder is the slice one or two hops from organic distribution — call that 100k-300k creators in the named subreddits, LinkedIn groups, and design…

**New search and competitor evidence** — United States · en (planner: The product is sold on Gumroad, targets remote clients, and the US is a large market for digital products and freelance services, making it a primary search location for such solutions.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 1 directly relevant keyword(s) returned data (unknown, not zero). Category-level: some ("linkedin carousel templates" 110/mo); broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "how to write linkedin posts" 320/mo; "linkedin carousel templates" 110/mo, CPC $1.80; "linkedin content templates" 10/mo; "linkedin caption generator" 50/mo; no data for 5 of 9
- Commercial intent and payment: **moderate** — Advertisers bid on 1 commercial keyword(s) (highest CPC $1.80 on "linkedin carousel templates"). CPC is an advertiser bid, not a customer's willingness to pay. 1 keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty. No published offer prices were found on the fetched competitor pages.
- Competitors: 5 vendor-like or publisher domain(s) and 4 broad platform(s) (linkedin.com, canva.com, adobe.com, figma.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on figma.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 7 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — A LinkedIn post notes that complex language can be a barrier for non-native English speakers on the platform. (S2.2)
- Alternatives: Canva _(indirect alternative)_ — Offers a large collection of customizable LinkedIn carousel templates. (S1.1); Adobe Express _(indirect alternative)_ — Provides free, editable LinkedIn carousel post templates. (S1.2); Contentdrips.com _(indirect alternative)_ — Offers free LinkedIn carousel templates that can be populated with content using AI. (S1.9); LinkedIn Learning _(indirect alternative)_ — Offers courses on business English skills, including how to write effective business emails. (S2.11)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking solo designers, illustrators, or freelance creatives (graphic, UX, product, brand) who want to win remote clients or build a personal brand on LinkedIn. · problem: Non-native English-speaking solo designers struggle to create professional, native-sounding LinkedIn content that attracts clients.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| linkedin content for non native | no data | uncertain | This search combines the platform (LinkedIn), the task (content creation), and the user's identity (non-native speaker). |
| english writing for designers | no data | direct | This query connects the need for English writing skills with the specific profession of the target customer. |
| how to write linkedin posts | 320 | uncertain | This is a general query for any LinkedIn user, lacking the 'non-native' and 'designer' aspects. |
| linkedin carousel templates | 110 | category | This search is for a component of the solution (carousel templates) but misses the key problem of non-native English writing. |
| linkedin content templates | 10 | category | This is a general search for LinkedIn content templates, not specific to designers or non-native speakers. |
| linkedin caption generator | 50 | category | This is a search for a general tool for any LinkedIn user, not specific to the target customer's needs. |
| linkedin content pricing | no data | uncertain | It's unclear if the searcher is buying or selling, and it relates to content services rather than DIY tools. |
| best linkedin content tools | no data | category | This is a search for tools for any LinkedIn content creator, not specific to the target customer's niche. |
| hire linkedin content writer | no data | uncertain | The searcher wants to hire someone to create content, which is an alternative to using the proposed tool themselves. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.2 www.linkedin.com — Kristo Olli's Post | category | none | yes | This post discusses the problem of complex language for non-native speakers on LinkedIn, but is not an offering. |
| S1.1 www.canva.com — Customize 1239+ LinkedIn Carousel Templates Online | broader | indirect | yes | These results provide carousel design templates for any LinkedIn user, but don't address the specific copywriting problem for non-native English speakers. |
| S1.2 www.adobe.com — Free LinkedIn Carousel Post Templates \| Adobe Express | broader | indirect | yes | These results provide carousel design templates for any LinkedIn user, but don't address the specific copywriting problem for non-native English speakers. |
| S1.9 contentdrips.com — Free LinkedIn Carousel Templates — Edit with AI | broader | indirect | yes | These results provide carousel design templates for any LinkedIn user, but don't address the specific copywriting problem for non-native English speakers. |
| S2.11 www.linkedin.com — Writing Emails for Non-Native English Speakers Online Class | broader | indirect | yes | This is a course for non-native speakers on writing business emails, a different context from LinkedIn content. |

_Flagged for a person (not counted):_
- Keywords with data but unclear relevance (not counted): "how to write linkedin posts" 320/mo.

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand some ("how to write linkedin posts" 320/mo) · problem evidence weak · competition crowded · changes supports/supports. **After:** idea-level demand unknown · problem evidence weak · competition unknown · 0d/4i · changes untested/supports/untested.

**What changed and why**

- untested: Scout said "freeze when typing English captions" → There is weak evidence that non-native speakers face barriers with 'complex language' on LinkedIn (S2.2), but no specific evidence about designers or the anxiety of writing captions was found. (S2.2)
- supports: Scout said "Editable templates are eating static PDFs in 2026" → Search results for 'linkedin carousel templates' are dominated by providers of editable online templates like Canva and Adobe Express, supporting the popularity of this format. (S1.1, S1.2)
- untested: Scout said "Authenticity premium punishes generic AI captions" → One competitor offers AI to fill in carousel slides, suggesting a demand for AI assistance. No evidence was found regarding a backlash against AI-generated captions. (S1.9)

**Remaining uncertainty**

- That non-native designers perceive English caption writing as a primary blocker to their LinkedIn success.
- Whether they would pay for pre-written text snippets instead of using free templates combined with AI writing assistants.
- The specific demand from the 'designer' segment versus general non-native professionals on LinkedIn.
- 5 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 0 dropped claim(s).

**Cheapest useful validation experiment:** Create the free lead magnet '5 carousels + 10 native-English LinkedIn hooks for non-native designers'. Promote it on a landing page in relevant designer communities and measure email sign-ups. _(cost: ~$50 for landing page tool + 15-20 hours, 2 weeks)_

**Continue if:** The experiment generates over 100 email sign-ups, with at least 10 replies to a follow-up survey confirming that caption writing is a significant pain point.

**Stop if:** The experiment generates fewer than 20 sign-ups, or feedback indicates the caption help is not needed or is easily solved by AI tools.

---

## 3. The UX Research Kit for Non-Native UX Designers
`2026-04-29` · [ideas/2026-04-29.md](../../../ideas/2026-04-29.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX designer or researcher, likely from Europe, Asia, or Latin America, working for a US/UK company or serving English-speaking clients. They are skilled in design and research methodology but lack confidence in their linguistic ability to conduct nuanced user interviews and present findings persuasively to native-speaking stakeholders. Real pain in their words: *   A user…
- Size claim (Scout): Napkin TAM: The global User Experience (UX) Research Software Market is projected to reach ~$525 million in 2026 and grow at a CAGR of over 17%. While this product isn't software, it serves the practitioners driving that market. With millions of UX professionals globally, a conservative estimate of 100,000 non-native English speakers in this role is reasonable. Capturing 0.2% of this niche at $39 yields a $78k…

**New search and competitor evidence** — United States · en (planner: The target customers often work for US/UK companies or serve English-speaking clients, and the problem examples are from English-speaking forums, making the US market the most direct fit for search intent.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 1 directly relevant keyword(s) returned data (unknown, not zero). Category-level: low ("ux research templates" 50/mo); broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "ux research templates" 50/mo; no data for 8 of 9
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 6 vendor-like or publisher domain(s) and 3 broad platform(s) (notion.com, figma.com, airtable.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on notion.com, figma.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 4 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — An article directly addresses 'UX research and language barriers,' and a government user research blog provides 'Tips for communicating across a language barrier.' (S2.10)
- Alternatives: Notion Marketplace _(indirect alternative)_ — Offers general user research templates to help compile research findings, user interviews, and usability tests. (S1.4); Figma Community _(indirect alternative)_ — Provides a generic UX Research Template file that can be used as a base for research projects. (S1.5); Airtable _(indirect alternative)_ — Offers a free UX Research Plan Template to help keep research projects focused. (S1.8)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking UX designers or researchers, likely from Europe, Asia, or Latin America, working for US/UK companies or serving English-speaking clients. · problem: Non-native English-speaking UX designers lack confidence and specific linguistic tools to conduct nuanced user interviews and present findings persuasively to native-speaking stakeholders.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| user interview language barrier | no data | uncertain | This search directly identifies a key pain point (language barrier) in a core task (user interview) for the target customer. |
| ux research communication issues | no data | direct | This query describes the general problem space of the idea, though it could also apply to native speakers. |
| non native ux designer challenges | no data | uncertain | This search is a direct query about the challenges faced by the specific target customer. |
| ux research templates | 50 | category | This is a search for a general tool used by all UX researchers, not specific to the language challenges of non-native speakers. |
| user interview script english | no data | category | This is a search for a generic user interview script, not one specifically designed to help non-native speakers with nuance. |
| ux communication guide | no data | category | This is a search for a general communication guide for any UX professional, not specific to non-native speakers. |
| ux research kit pricing | no data | uncertain | This search is about the price of products in the same category, but the searcher's intent is unclear. |
| best ux interview templates | no data | category | This is a search for general UX interview templates, not specific to the challenges of non-native speakers. |
| buy ux research tools | no data | category | This is a generic, high-level search for tools in the UX research category. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.10 userresearch.blog.gov.uk — Tips for communicating across a language barrier | category | none | yes | This blog post gives tips for user researchers communicating across a language barrier, which is relevant to the problem. |
| S1.4 www.notion.com — User Research templates - Notion Marketplace | broader | indirect | yes | These results offer generic UX research templates for any UX professional, not addressing the specific language challenges of non-native speakers. |
| S1.5 www.figma.com — UX Research Template | broader | indirect | yes | These results offer generic UX research templates for any UX professional, not addressing the specific language challenges of non-native speakers. |
| S1.8 www.airtable.com — Free UX Research Plan Template | broader | indirect | yes | These results offer generic UX research templates for any UX professional, not addressing the specific language challenges of non-native speakers. |
| S2.6 www.objectiveexperience.com — UX research and language barriers - the best tips | uncertain | uncertain | **no — removed** | This article directly discusses the problem of conducting UX research when there is a language barrier, matching the idea's problem space. |
| S1.3 www.nngroup.com — NN/g's Free UX Templates and Guides | broader | none | **no — removed** | These results offer generic UX research templates for any UX professional, not addressing the specific language challenges of non-native speakers. |

_Flagged for a person (not counted):_
- The judge said these items concern the exact target customer, but their text does not mention every defining trait (Non-native English-speaking + UX designer), so they are not counted: S2.6 "UX research and language barriers - the best tips"; S2.9 "User Research Study: Breaking Language Barriers".

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand low ("ux research templates" 50/mo) · problem evidence strong · competition some · changes supports/untested. **After:** idea-level demand unknown · problem evidence weak · competition unknown · 0d/3i · changes untested/untested/untested.

**What changed and why**

- untested: Scout said "as a non-native speaker, i have little confidence in my communication ability" → Evidence confirms that 'UX research and language barriers' is a recognized problem area, with articles and guides published on the topic.
- untested: Scout said "The market for productized UX templates is validated." → Search results show that major platforms like Notion, Figma, and Airtable offer UX research templates, confirming a market exists for these artifacts. (S1.4, S1.5)
- untested: Scout said "AI Research Tools (Dovetail, Notably)" → No evidence about AI research tools was found in the search results.

**Remaining uncertainty**

- Whether non-native UX designers are willing to pay for a solution to this problem, versus using free resources or general language tools.
- The effectiveness of a static swipe file compared to more dynamic solutions like coaching or AI-powered practice tools.
- The size of the specific market segment of non-native UX designers who feel this pain acutely and are willing to buy a solution.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 5 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create the '5-Step Checklist for Your First User Interview in English' lead magnet. Promote it on a landing page in r/UXResearch and other relevant designer communities to capture email sign-ups. _(cost: ~$50 for landing page tool + 10-15 hours, 2 weeks)_

**Continue if:** The experiment generates at least 75 email sign-ups, with qualitative feedback from a follow-up survey indicating that language confidence is a top-3 professional challenge.

**Stop if:** The experiment generates fewer than 15 sign-ups, or feedback suggests the problem is minor or adequately solved by existing free templates and general language practice.

---

## 4. The Design Presentation Kit for Non-Native UX/Product Designers
`2026-04-30` · [ideas/2026-04-30.md](../../../ideas/2026-04-30.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer working in a remote or international team where English is the primary language. They are technically and visually skilled but experience high anxiety when they need to present their work, defend their decisions, or handle critical feedback from native-speaking stakeholders. Real pain in their words: *   A designer on Medium describes the…
- Size claim (Scout): Napkin TAM: There are an estimated 1 million+ UX/product designers globally. Conservatively, 15-20% are non-native English speakers in professional roles. This creates a target market of 150,000+ designers. Capturing 0.1% of this niche at $39 yields a $58.5k ceiling. Comparables with revenue or proxy revenue: *   **Katya Kovalenko's "The Grid Deck Template" on Gumroad:** A Figma presentation template with 183…

**New search and competitor evidence** — United States · en (planner: The target customer is a non-native English speaker working in an English-speaking professional environment, and the US is a major hub for tech and design jobs where English proficiency in presentations is critical.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 6 directly relevant keyword(s) returned data (unknown, not zero). Category-level: some ("design presentation templates" 320/mo); broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "design presentation templates" 320/mo, CPC $2.97; "design communication course" 20/mo, CPC $12.03; no data for 7 of 9
- Commercial intent and payment: **moderate** — Advertisers bid on 2 commercial keyword(s) (highest CPC $12.03 on "design communication course"). CPC is an advertiser bid, not a customer's willingness to pay. 2 keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty. No published offer prices were found on the fetched competitor pages.
- Competitors: 8 vendor-like or publisher domain(s) and 3 broad platform(s) (adobe.com, canva.com, figma.com) rank across 2 queries (not all are competitors — some are consultants or publishers). Judged for relevance: 0 domain(s) with a direct competitor (same problem), 8 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — Online discussions and articles indicate that designers in general experience fear and anxiety related to presenting their work. (S2.2, S2.5)
- Alternatives: Adobe Express _(indirect alternative)_ — Offers hundreds of free, customizable presentation templates that can be downloaded for PowerPoint or as a PDF. (P1); SlidesCarnival _(indirect alternative)_ — Provides a collection of professionally-designed, free PowerPoint and Google Slides templates. (P3); Canva _(indirect alternative)_ — Offers a wide variety of free, online, personalizable presentation slide templates. (S1.4); Figma Community _(indirect alternative)_ — Provides over 3,400 free, fully customizable presentation templates and slides for designers. (S1.6)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking UX, UI, or product designers working in remote or international teams where English is the primary language. · problem: Non-native English-speaking designers experience high anxiety and difficulty presenting their work, defending decisions, and handling critical feedback from native-speaking stakeholders.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| design presentation anxiety | no data | direct | This search describes the core problem of anxiety around design presentations and would be searched by the target customer, among others. |
| present ux design tips | no data | direct | Any UX designer could search for this, including the target customer, and it relates directly to the problem of presenting design work. |
| non native english presentation | no data | direct | This search is highly relevant to the 'non-native English-speaking' qualifier and the problem of giving presentations. |
| design presentation templates | 320 | category | Any designer could search for templates; templates are a category of solution, while the idea is a more comprehensive 'kit'. |
| ux presentation script | no data | direct | Any UX designer could search for this, and a script is a direct solution to the problem of presenting work. |
| design communication course | 20 | category | Any designer could search for this; a course is a broader category of solution than the proposed 'kit'. |
| design presentation kit pricing | no data | direct | This is a direct search for the proposed solution type, indicating purchase intent. |
| best ux presentation templates | no data | category | Any UX designer could search for this; templates are a category of solution, not the specific 'kit'. |
| buy design presentation script | no data | direct | Any designer could search for this, and it represents a direct search for a component of the proposed solution. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.2 www.reddit.com — How to get over fear of presenting designs/speaking ... | category | none | yes | This Reddit thread discusses presentation fear for designers, but not specifically for non-native English speakers. |
| S2.5 medium.com — An anxious designer's guide to presentation and facilitation | category | none | yes | This article is for anxious designers but does not specifically address the challenges of being a non-native English speaker. |
| S1.1 www.adobe.com — Customize & Download Free Presentation Templates | broader | indirect | yes | This offers generic presentation templates for any user, not specifically for designers or non-native English speakers. |
| S1.2 www.slidescarnival.com — SlidesCarnival: Free PowerPoint & Google Slides Templates ... | broader | indirect | yes | This offers generic presentation templates for a wide audience, not specifically for designers facing communication challenges. |
| S1.4 www.canva.com — Free and engaging presentation templates to ... | broader | indirect | yes | This offers generic presentation templates for any user, not specifically for designers or non-native English speakers. |
| S1.6 www.figma.com — 3400+ Free Presentation Templates for Impactful Slides | broader | indirect | yes | This offers presentation templates for designers on Figma, but does not address the specific challenges of non-native English speakers. |
| P1 adobe.com — Customize &#x26; Download Free Presentation Templates \| Adobe Express | broader | indirect | yes | This page offers generic presentation templates for a wide audience, not specifically for designers or non-native English speakers. |
| P3 slidescarnival.com — SlidesCarnival: Free PowerPoint & Google Slides Templates That Stand Out | broader | indirect | yes | This page offers generic presentation templates for a wide audience, not specifically for designers or non-native English speakers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand some ("design presentation templates" 320/mo) · problem evidence weak · competition crowded · changes supports/supports/untested. **After:** idea-level demand unknown · problem evidence weak · competition crowded · 0d/4i · changes untested.

**What changed and why**

- untested: Scout said "The template market is mature, but lacks linguistic support." → Search results confirm a mature market with many providers of free visual templates, such as Adobe, Canva, and Figma. The descriptions for these templates do not mention scripts or linguistic aids, focusing instead on visual customization. (S1.1, S1.6)

**Remaining uncertainty**

- Whether presentation anxiety is significantly more acute for non-native English-speaking designers compared to the general designer population.
- The willingness of this specific audience to pay for a solution when many high-quality visual templates are available for free.
- Whether a template and script kit is the right format to solve this problem effectively.
- 7 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create the lead magnet: "The 5-Slide Template & Script to Justify One Design Decision." Promote it in online communities for UX/UI designers to gauge interest and collect email addresses for a follow-up survey. _(cost: $0 cash + 10-15 hours of design and writing time., 2 weeks)_

**Continue if:** The lead magnet gets at least 50 downloads and at least 5 qualitative survey responses specifically validating the communication challenges faced as a non-native English speaker.

**Stop if:** The lead magnet gets fewer than 20 downloads, or feedback from downloaders indicates that being a non-native speaker is not their primary presentation challenge.

---

## 5. The Client Communication Kit for Non-Native Freelance Designers
`2026-05-01` · [ideas/2026-05-01.md](../../../ideas/2026-05-01.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking freelance designer (UX, UI, brand, graphic) who has secured an English-speaking client but now faces the anxiety of day-to-day communication. Their design skills are strong, but their confidence in written English is not, leading to hours wasted drafting emails, misunderstandings about deliverables, and an inability to push back on scope creep, which directly costs them…
- Size claim (Scout): Napkin TAM: There are an estimated 1.57 billion freelancers worldwide. A conservative estimate of 1 million+ non-native English-speaking freelance designers is reasonable. Capturing just 0.1% of a 200,000-person serviceable market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Etsy Template Shops:** Sellers like "LunaSoulDesign" offer a "Designer Essentials Kit" of client onboarding…

**New search and competitor evidence** — India · en (planner: India has a large population of non-native English-speaking freelancers who serve global clients and would search for solutions in English.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 5 directly relevant keyword(s) returned data (unknown, not zero). Category-level: unknown; broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 10 vendor-like or publisher domain(s) and 4 broad platform(s) (coursera.org, notion.com, linkedin.com, udemy.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on agencyhandy.com. Judged for relevance: 2 domain(s) with a direct competitor (same problem) (coursera.org, udemy.com), 6 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — Academic research suggests that using English for business communication can create a "higher cognitive load" for non-native speakers. Content from a major university also addresses the need for non-native speakers to "communicate with confidence." (S2.3)
- Alternatives: Udemy _(direct competitor)_ — Offers a course on "Business Communication for Non Native English Speakers" covering emails, conversations, and active listening. (S2.11); AgencyHandy _(indirect alternative)_ — Provides a set of general client communication templates, including for introductions and follow-ups. (S1.2); Notion _(indirect alternative)_ — Offers a "Client Communication Bundle Template" with 5 professional templates to cover critical client emails. (S1.8)

**Relevance of the evidence to this idea** — customer: A non-native English-speaking freelance designer (UX, UI, brand, graphic) who has secured an English-speaking client but lacks confidence in day-to-day communication. · problem: Non-native English-speaking freelance designers struggle with confidence and effectiveness in written client communication, leading to wasted time, misunderstandings, and lost income.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| freelance communication problems | no data | direct | Any freelancer could search this, including the target customer, and it describes the core problem area. |
| non native english speaker client communication | no data | direct | This search is highly specific to the 'non-native English-speaking' qualifier and the problem of client communication. |
| how to handle scope creep freelance | no data | direct | Any freelancer could search this, and it's a specific example of a client communication problem the idea aims to solve. |
| client communication templates | no data | category | Any professional with clients could search for this; templates are a category of solution, while the idea is a 'kit'. |
| freelance email scripts | no data | direct | Any freelancer could search for this, and email scripts are a direct solution to the problem of written communication. |
| business communication toolkit | no data | broader | This is a very broad term that any business professional could search for, covering a much wider area than freelance client communication. |
| freelance client communication kit | no data | direct | This is a direct search for the proposed solution, indicating the searcher is likely a freelancer. |
| best client onboarding templates | no data | category | Any freelancer or agency could search for this; onboarding is one part of client communication, and templates are a category of solution. |
| freelance proposal template cost | no data | category | Any freelancer could search for this; proposals are one part of client communication, and templates are a category of solution. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.3 www.researchgate.net — (PDF) Effect on Non-Native English Speakers of Utilizing ... | category | none | yes | This research paper discusses the problem for non-native English speakers in business, but is not specific to freelance designers. |
| S2.5 www.coursera.org — Business English for Non-Native Speakers Specialization | category | direct | yes | This course is for non-native English speakers in a business context, but not specifically for freelance designers. |
| S2.11 www.udemy.com — Business Communication for Non Native English Speakers | category | direct | yes | This course is for non-native English speakers in business, but not specifically tailored to freelance designers. |
| S1.2 www.agencyhandy.com — Top 10 Client Communication Templates for Better ... | broader | indirect | yes | This offers general client communication templates, not specifically for freelance designers or non-native English speakers. |
| S1.8 www.notion.com — Client Communication Bundle Template | broader | indirect | yes | This bundle of templates is for general client communication, not specifically for non-native freelance designers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand unknown · problem evidence moderate · competition some · changes untested. **After:** idea-level demand unknown · problem evidence weak · competition some · 1d/2i · changes untested.

**What changed and why**

- untested: Scout said "The "Productized Template" Market is Validated." → Search results confirm an existing market for client communication templates, with multiple providers offering bundles and individual templates for professionals. (S1.2, S1.8)

**Remaining uncertainty**

- Whether the target customer prefers a self-serve 'kit' of scripts over a more structured course on business communication.
- Willingness to pay for this solution when AI writing assistants and grammar tools are widely available.
- The specific communication scenarios (e.g., scope creep, onboarding) that are most painful for this audience.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 2 citation(s) without a matching quote, 2 downgrade(s), 2 dropped claim(s).

**Cheapest useful validation experiment:** Create a lead magnet: "3 Email Scripts to Handle Difficult Client Situations (for Non-Native Designers)". Promote it in freelance and design communities to test interest and gather feedback via a follow-up survey. _(cost: $0 cash + 8-10 hours of writing and setup time., 2 weeks)_

**Continue if:** The lead magnet achieves at least 50 downloads and survey feedback from at least 5 respondents confirms that existing templates and AI tools are insufficient for their specific challenges as non-native speakers.

**Stop if:** Fewer than 20 downloads are achieved, or feedback indicates that current tools (like Grammarly or ChatGPT) are considered a 'good enough' solution.

---

## 6. The Portfolio Case Study Kit for Non-Native Designers
`2026-05-02` · [ideas/2026-05-02.md](../../../ideas/2026-05-02.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer trying to get hired or win freelance clients. They are visually proficient but struggle to write the narrative of their case studies. This is a high-stakes problem; a portfolio with strong visuals but a weak, confusing, or grammatically awkward story fails to convince hiring managers and costs them opportunities. Real pain in their words: *   On…
- Size claim (Scout): Napkin TAM: There are millions of UX/UI designers globally. A conservative estimate of 200,000+ non-native English-speaking designers actively maintaining a portfolio is reasonable. Capturing 0.1% of this market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Etsy Template Sellers:** Shops selling Canva portfolio templates often have 1,000+ sales, indicating a large volume of buyers…

**New search and competitor evidence** — United States · en (planner: The target audience is non-native English speakers globally, and the US market represents a large segment of the design industry where English proficiency in portfolios is critical.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 6 directly relevant keyword(s) returned data (unknown, not zero). Category-level: unknown; broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 7 vendor-like or publisher domain(s) and 4 broad platform(s) (figma.com, adobe.com, canva.com, linkedin.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on figma.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 7 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — Multiple sources for a general designer audience describe writing case studies as a difficult and "dreaded" task. Online discussions show designers actively seeking strategies for the writing process. (S2.6, S2.3)
- Alternatives: Figma Community _(indirect alternative)_ — Offers numerous free case study templates focused on helping designers display projects in an organized and presentable format. (P5); Adobe Express _(indirect alternative)_ — Provides editable, free case study templates to help users create their own design online. (S1.3); UXfol.io Blog _(indirect alternative)_ — Offers a detailed guide and template on how to structure a UX case study and format the story. (P1); Canva _(indirect alternative)_ — Provides free and customizable case study templates designed to help users present methods and highlight insights effectively. (S1.7)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking UX, UI, or product designers who are visually proficient but struggle to articulate their design process and results in natural, persuasive English. · problem: Non-native English-speaking designers struggle to write compelling, clear, and persuasive narratives for their portfolio case studies, costing them job opportunities.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| how to write design case study | no data | direct | Any designer could search this, including the target customer, and it describes the core problem. |
| non native english portfolio help | no data | direct | This search is highly specific to the 'non-native English-speaking' qualifier and the problem of creating a portfolio. |
| struggle writing ux case study | no data | direct | Any UX designer could search this, and it describes the exact problem of struggling with case study writing. |
| design case study templates | no data | category | Any designer could search for this; templates are a category of solution, while the idea is a 'kit' focused on writing. |
| portfolio storytelling script | no data | direct | Any designer could search for this, and it's a direct solution to the problem of writing a compelling narrative. |
| ux case study writing guide | no data | direct | Any UX designer could search for this, and it's a direct search for a solution to the problem. |
| design portfolio template pricing | no data | broader | A portfolio template is about the overall visual layout, which is a wider topic than a kit for writing case studies. |
| best ux case study kit | no data | direct | Any UX designer could search for this, and it's a direct search for the proposed solution. |
| hire portfolio case study writer | no data | category | Any designer could search for this; hiring a writer is an alternative solution to the problem. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.6 vanschneider.medium.com — A visual guide to writing portfolio case studies | category | none | yes | This article gives general advice on writing case studies for any designer, not specific to non-native speakers. |
| S2.3 www.reddit.com — What's your strategy for making the process of writing case ... | category | none | yes | This is a general discussion on writing case studies for any designer, not specific to non-native speakers. |
| S1.1 www.figma.com — 15+ Case Study Templates \| Free Resources | broader | indirect | yes | This offers case study templates for any designer, focusing on layout rather than the specific writing challenges of non-native speakers. |
| S1.3 www.adobe.com — Free Case Study Templates \| Adobe Express | broader | indirect | yes | This offers general case study templates for any designer, not specific help for the writing process for non-native speakers. |
| S1.7 www.canva.com — Free and customizable case study templates | broader | indirect | yes | This offers general case study templates for any designer, focusing on visual presentation, not the writing problem for non-native speakers. |
| S1.2 blog.uxfol.io — The Ultimate UX Case Study Template & Structure (2026 ... | broader | indirect | yes | This is a UX case study template for any UX designer, not specifically addressing the writing challenges of non-native speakers. |
| P5 figma.com — 15+ Case Study Templates \| Free Resources \| Figma | broader | indirect | yes | This page offers case study templates for Figma users, focusing on visual presentation rather than the writing challenges of non-native speakers. |
| P1 blog.uxfol.io — The Ultimate UX Case Study Template & Structure (2026 Guide) | broader | indirect | yes | This page offers a guide and template for any UX designer, not specifically addressing the writing challenges of non-native English speakers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand unknown · problem evidence weak · competition crowded · changes untested/untested. **After:** idea-level demand unknown · problem evidence weak · competition crowded · 0d/4i · changes supports/untested.

**What changed and why**

- supports: Scout said "The Design Job Market is Highly Competitive." → The evidence shows that writing case studies is the "most dreaded part" of building a portfolio, confirming it's a significant hurdle for designers trying to stand out. (S2.6)
- untested: Scout said "The "Artifact" Market is Validated but Incomplete." → Search results confirm a large, validated market for visual case study templates from major players like Figma, Adobe, and Canva. The descriptions of these offerings focus on visual design and layout, with no mention of writing assistance, supporting the inference that they are 'incomplete' for this idea's target customer. (S1.1, S1.3)

**Remaining uncertainty**

- Whether the struggle with writing case studies is painful enough for non-native designers to pay for a solution, versus using free guides and AI tools.
- The willingness to pay the proposed $39 price point.
- If a 'kit' of phrases and templates can produce an authentic-sounding narrative that truly helps designers get hired.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 2 downgrade(s), 0 dropped claim(s).

**Cheapest useful validation experiment:** Create the lead magnet: "The 1-Page Case Study Outline & 10 Essential English Phrases for Describing Your Design Process." Promote it in UX/UI design communities to measure interest and survey downloaders about their biggest portfolio challenges. _(cost: $0 cash + 6-8 hours of writing and design time., 2 weeks)_

**Continue if:** The lead magnet receives at least 75 downloads, and survey feedback from at least 10 respondents confirms that writing the narrative in persuasive English is their primary bottleneck.

**Stop if:** Fewer than 30 downloads are achieved, or feedback suggests that other problems (e.g., finding projects, visual design) are more significant than the writing itself.

---

## 7. The Figma Handoff Kit for Non-Native Designers
`2026-05-03` · [ideas/2026-05-03.md](../../../ideas/2026-05-03.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking product, UX, or UI designer working on a software team. Their visual designs are clean, but their written specifications for developers are a major source of anxiety and inefficiency. Miscommunication leads to developers building the wrong thing, which causes delays, rework, and damages the designer's credibility. This is a direct, operational pain point that costs the…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers working with developers. This is the core market. Capturing 0.1% of this at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Untitled UI on Gumroad:** Sells a massive Figma UI kit and design system for $129, with thousands of customers, indicating a high…

**New search and competitor evidence** — United States · en (planner: The United States has a large tech industry with many non-native English-speaking designers who need to communicate effectively with developers.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 6 directly relevant keyword(s) returned data (unknown, not zero). Category-level: low ("best design handoff tools" 10/mo); broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "best design handoff tools" 10/mo; no data for 8 of 9
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 5 vendor-like or publisher domain(s) and 3 broad platform(s) (uxpin.com, miro.com, figma.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on uxpin.com, miro.com. Judged for relevance: 5 domain(s) with a direct competitor (same problem) (figma.com, uxpin.com, miro.com, brandyhq.com, figr.design), 0 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that poor design handoffs are a general problem that leads to miscommunication, delays, errors, and misinterpretation by developers. A key challenge is a lack of clarity and the need to document more than just visual elements. (S2.7, S2.8, S2.6, S2.3)
- Alternatives: Figma _(direct competitor)_ — Offers a built-in "design handoff experience that keeps designers and developers on the same page." (S1.2); Miro _(direct competitor)_ — Provides resources like a "complete handoff checklist, reusable templates, and specific techniques for documenting logic alongside pixels." (S1.4); Figr.design _(direct competitor)_ — Offers a playbook with "tools, templates, and best practices for developer handoff that actually works across cross-functional teams." (S1.9); UXPin _(direct competitor)_ — Publishes content listing popular design handoff tools and is a design platform itself. (S1.3)

**Relevance of the evidence to this idea** — customer: A non-native English-speaking product, UX, or UI designer working on a software team. · problem: Non-native English-speaking designers struggle to create clear, unambiguous handoff documentation for developers, leading to miscommunication, project delays, and rework.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| design handoff problems | no data | direct | This search is about the core problem of design handoff, which includes the target customer. |
| developer communication issues | no data | uncertain | This search is about general communication with developers, a broader problem space that includes the target customer's issue. |
| how to write design specs | no data | direct | This search is about how to create design specifications, which is the core problem for the target customer. |
| design handoff template | no data | direct | This search is for a template to solve the design handoff problem, which is what the target customer needs. |
| figma documentation kit | no data | direct | This search is for a documentation kit in Figma, which is a specific solution for the target customer's problem. |
| ux specification tool | no data | category | This search is for a tool to create UX specifications, a category of solutions that includes the idea. |
| best design handoff tools | 10 | category | This search is for tools to help with design handoff, a category of solutions that includes the idea. |
| design documentation template cost | no data | direct | This search is about the cost of a design documentation template, showing buying intent for a solution to the target problem. |
| buy design spec template | no data | direct | This search is a direct attempt to buy a design spec template, a solution for the target customer's problem. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.7 www.uxpin.com — Design Handoff vs. Manual Handoff: Key Differences | category | none | yes | This article is for any designer facing handoff issues, not specifically non-native speakers. |
| S2.8 blog.zeplin.io — Design Handoff 101: How to handoff designs to developers | category | none | yes | This article addresses the general problem of clarity in handoffs, which is relevant but not specific to non-native speakers. |
| S2.6 miro.com — Design Handoff Best Practices: Beyond Static Mockups | category | none | yes | This article provides advice for any designer, not specifically for non-native English speakers. |
| S2.3 ixdf.org — What Are Design Handoffs — updated 2026 | category | none | yes | This article is for any designer, explaining the general problem of design handoff. |
| S1.2 www.figma.com — Free Design Handoff Tool for Designers & Developers | category | direct | yes | This tool is for all designers and developers, not specifically for non-native English speakers. |
| S1.4 miro.com — Design Handoff Best Practices: Beyond Static Mockups | category | direct | yes | This article discusses handoff best practices and templates for any designer, not specifically non-native English speakers. |
| S1.9 figr.design — Developer Handoff: Tools, Templates, Playbook | category | direct | yes | This playbook is for any designer on a cross-functional team, not specifically for non-native English speakers. |
| S1.3 www.uxpin.com — Top 10 Design Handoff Tools to Try in 2024 | category | direct | yes | This is a list of handoff tools for all designers and engineers, not specifically for non-native English speakers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand low ("best design handoff tools" 10/mo) · problem evidence strong · competition some · changes supports/weakens/untested. **After:** idea-level demand unknown · problem evidence weak · competition some · 4d/0i · changes untested.

**What changed and why**

- untested: Scout said "The "Productized Handoff" Market is Validated." → The evidence shows search interest for "best design handoff tools" and the existence of multiple competitors offering tools, templates, and playbooks, confirming a market for such solutions. (K7, S1.4, S1.9)

**Remaining uncertainty**

- The core assumption that non-native English speakers experience design handoff communication problems more acutely than native speakers.
- Whether this specific audience is actively seeking a tailored solution.
- Willingness to pay for this specific type of kit.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create a landing page describing 'The Figma Handoff Kit for Non-Native Designers'. Drive traffic from design communities and measure email sign-ups for a waitlist. _(cost: ~$50 for landing page tool + 2 days of work, 2-4 weeks)_

**Continue if:** The waitlist gets at least 50 email sign-ups from people who self-identify as non-native English-speaking designers.

**Stop if:** Fewer than 10 sign-ups, or the audience consists primarily of native English speakers or is otherwise not the target customer.

---

## 8. The AI Prompt Kit for Non-Native Designers
`2026-05-04` · [ideas/2026-05-04.md](../../../ideas/2026-05-04.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer. They know AI is a critical skill for their career in 2026, but struggle to get useful outputs from generative tools. Their prompts are too simple, leading to generic results that require heavy editing, defeating the purpose of using AI. This problem is amplified by the language barrier, making it difficult to write the nuanced, context-rich…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers who are now required to integrate AI into their workflow. Capturing just 0.1% of this market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **AI Prompt Packs on Gumroad/YouTube:** Creators are successfully selling prompt packs and building entire business…

**New search and competitor evidence** — United States · en (planner: The product targets a global audience of non-native English speakers, and the United States is a primary market for digital products and tech-related services in English.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 8 directly relevant keyword(s) returned data (unknown, not zero). Category-level: unknown; broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 9 vendor-like or publisher domain(s) and 2 broad platform(s) (figma.com, adobe.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on figma.com. Judged for relevance: 5 domain(s) with a direct competitor (same problem) (aiuxplayground.com, designprompts.dev, styles.refero.design, designwithai.substack.com, morpht.com), 0 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that designers are actively looking for ways to get better results from AI design tools. Achieving better output requires using detailed briefs, specific tips, and precise keywords. (S2.2, S2.6, S2.11)
- Alternatives: AI UX Playground _(direct competitor)_ — Offers "ready-made instructions for product design, UX research, visual design, branding, content, and engineering tasks." (S1.3); Design Prompts _(direct competitor)_ — An "AI-Powered Design Style Explorer" that provides "AI-ready prompts to recreate any aesthetic in your own projects." (S1.4); Refero Design _(direct competitor)_ — Provides "design prompts for AI agents that include real style references, visual constraints, layout direction". (S1.8); Design with AI (Substack) _(direct competitor)_ — A newsletter that provides content such as "Three prompt templates to use AI to increase your design efficiency". (S1.11)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking UX, UI, or product designers. · problem: Non-native English-speaking designers struggle to get useful, high-quality outputs from generative AI tools due to simple prompts and language barriers.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| ai design generic results | no data | direct | The search is about the problem of getting generic results from AI design tools, which is the target customer's problem. |
| non native english ai prompts | no data | direct | The search is specifically from the target customer (non-native English speaker) about the solution (AI prompts). |
| improve ai design output | no data | direct | The search is about solving the problem of poor AI design output, which is the target customer's problem. |
| ai prompts for designers | no data | direct | The search is for the specific solution (AI prompts) for the target audience (designers). |
| design ai prompt templates | no data | direct | The search is for a specific format of the solution (templates) for the target audience. |
| ux ui ai workflow | no data | uncertain | The search is about the broader topic of integrating AI into the design workflow, not just about improving prompt quality. |
| best ai prompts design | no data | direct | The search is for high-quality AI prompts for design, indicating an interest in a solution. |
| ai design prompt pricing | no data | direct | The search is about the cost of AI design prompts, showing buying intent for a solution. |
| buy design ai prompts | no data | direct | The search is a direct attempt to buy AI prompts for design, a solution for the target customer's problem. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.2 www.figma.com — AI Design Prompts: How to Get Better Output | category | none | yes | This article is for any designer wanting to improve AI output, not specifically for non-native speakers. |
| S2.6 medium.com — 6 Prompting Tips That Actually Help Designers Get Better ... | category | none | yes | This article provides tips for any designer, not specifically for non-native speakers. |
| S2.11 www.nngroup.com — Prompt to Design Interfaces | category | none | yes | This article is for any designer, not specifically for non-native speakers. |
| S1.3 aiuxplayground.com — Design Prompts for Designers, PMs & AI Product Teams | category | direct | yes | This is a resource of AI prompts for a broad audience of designers and PMs, not just non-native speakers. |
| S1.4 designprompts.dev — Design Prompts - AI-Powered Design Style Explorer | category | direct | yes | This tool is for any designer wanting to use AI for design styles, not specifically for non-native speakers. |
| S1.8 styles.refero.design — Design Prompts for AI Agents | category | direct | yes | This is a resource for any designer, not specifically for non-native speakers. |
| S1.11 designwithai.substack.com — 3 AI Prompts to Level Up Your Design Process | category | direct | yes | This is for any UX/product designer, not specifically for non-native speakers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand unknown · problem evidence moderate · competition crowded · changes supports/untested/untested. **After:** idea-level demand unknown · problem evidence weak · competition some · 4d/0i · changes untested/untested.

**What changed and why**

- untested: Scout said "The 'Prompt Pack' Market is Proven and Profitable." → The evidence shows multiple direct competitors offering AI prompt libraries and templates for designers, which validates that a market for these resources exists. (S1.3, S1.4)
- untested: Scout said "This problem is amplified by the language barrier" → No evidence was found to support the claim that non-native English speakers struggle more with AI prompts. All problem evidence found was for a general designer audience. (S2.2)

**Remaining uncertainty**

- The core assumption that non-native English speakers struggle significantly more with prompt engineering than native speakers.
- Whether this specific audience is looking for a paid, tailored solution versus using the many free general resources available.
- Willingness to pay for a prompt kit.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 0 dropped claim(s).

**Cheapest useful validation experiment:** Write and publish a blog post titled '5 AI Prompt Templates for Non-Native English Speaking Designers'. Include a call-to-action to sign up for a waitlist to get a full kit of 150+ prompts. Promote in relevant communities. _(cost: 1-2 days of work, 2 weeks)_

**Continue if:** The post receives significant engagement (e.g., >1000 views) and generates at least 50 email sign-ups from the target audience.

**Stop if:** The post receives little engagement, or the sign-ups are not from non-native English-speaking designers.

---

## 9. The UX Writing Kit for Non-Native Designers
`2026-05-05` · [ideas/2026-05-05.md](../../../ideas/2026-05-05.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer who is now expected to write the copy for their own designs. They are confident in their visual skills but experience high anxiety and inefficiency when writing microcopy. This leads to vague button labels, confusing error messages, and a generic product voice, which ultimately hurts user experience and requires time-consuming revisions with…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers who are increasingly responsible for UX writing. Capturing 0.1% of this at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **UX Writing Hub Academy:** A comprehensive certification course priced at $1,440. This validates the high end of the market and proves…

**New search and competitor evidence** — United States · en (planner: The problem is specifically about writing English UI copy, and the target customer engages in English-speaking online communities like Reddit's r/uxwriting and r/UXDesign.)

- Search demand: **low** — Idea-level demand (directly relevant keywords only): low (up to "some" if a flagged keyword is confirmed). Largest confirmed directly relevant keyword: "ux writing template" at 10/month. Low measured volume is not evidence of low demand for B2B, regulated or emerging problems. Category-level: unknown; broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "ux writing template" 10/mo; "microcopy examples" 110/mo; no data for 7 of 9
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. 1 keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty. No published offer prices were found on the fetched competitor pages.
- Competitors: 11 vendor-like or publisher domain(s) and 2 broad platform(s) (grafana.com, linkedin.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on grafana.com, localazy.com. Judged for relevance: 6 domain(s) with a direct competitor (same problem) (medium.com, uxcontent.com, localazy.com, meravwrites.com, uxplanet.org, write.frontitude.com), 0 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that writing good copy is a challenge for designers, with some asking for help in public forums. The skill is described as being a "well neglected middle child of UX Design." (S2.2, S2.9)
- Alternatives: Frontitude's UX Writing Assistant _(direct competitor)_ — An AI-powered Figma plugin that "delivers copy suggestions based on your design elements, taking into consideration character limits and length." (S1.10); Free Online Resources _(direct competitor)_ — Numerous blogs and websites offer free lists of tools, articles, courses, and books for learning and improving UX writing. (S1.3, S1.9)

**Relevance of the evidence to this idea** — customer: A non-native English-speaking UX, UI, or product designer who is expected to write UI copy for their designs. · problem: Non-native English-speaking designers struggle to write clear, effective, and on-brand user interface copy, leading to anxiety and inefficiency.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| ux writing non native | no data | direct | The search is specifically from the target customer (non-native) about their problem (UX writing). |
| struggle writing ui copy | no data | direct | The search describes the core problem of struggling to write UI copy, which is what the target customer experiences. |
| how to write microcopy | no data | direct | The search is for instructions on how to write microcopy, a core part of the target customer's problem. |
| ux writing template | 10 | direct | The search is for a template to help with UX writing, a potential solution for the target customer. |
| microcopy examples | 110 | direct | The search is for examples of microcopy, which helps solve the problem of how to write it effectively. |
| ui copy guide | no data | direct | The search is for a guide on UI copy, a solution for the target customer's problem. |
| ux writing toolkit | no data | direct | The search is for a toolkit for UX writing, which is a specific solution format for the target customer's problem. |
| best ux writing tools | no data | category | The search is for tools to help with UX writing, a category of solutions that includes the idea. |
| microcopy guide price | no data | direct | The search is about the price of a microcopy guide, showing buying intent for a solution. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.2 www.reddit.com — Folks, how do you write a good copy? : r/UXDesign | category | none | yes | This is a general question from a designer about writing copy, not specific to non-native speakers. |
| S2.9 medium.muz.li — The Middle Child of UX Design | category | none | yes | This is a general article for UX designers about the importance of copy, not a solution for non-native speakers. |
| S1.10 write.frontitude.com — The AI writing assistant for design teams \| UX Writing Assistant ... | category | direct | yes | This is an AI tool for any design team, not specifically for non-native speakers. |
| S1.3 medium.com — 10 free resources to add to your UX Writing toolbox | category | direct | yes | This is a list of resources for anyone learning UX writing, not specifically for non-native speakers. |
| S1.5 localazy.com — Top 22 essential tools & platforms for UX writers | category | direct | yes | This is a list of tools for any UX writer, not specifically for non-native speakers. |
| S1.9 uxplanet.org — The UX Writer's Starter Pack. A list of free (and affordable)… | category | direct | yes | This is a list of learning resources for anyone, not specifically for non-native speakers. |

_Flagged for a person (not counted):_
- "microcopy examples" (110/mo) alone would put idea-level demand at "some"; no other directly relevant keyword is in that band, so it is not counted until a person confirms it is about this idea.

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand some ("microcopy examples" 110/mo) · problem evidence weak · competition some · changes weakens/untested/untested. **After:** idea-level demand low (≤some?) · problem evidence weak · competition some · 2d/0i · changes supports/weakens.

**What changed and why**

- supports: Scout said "designers... experience high anxiety and inefficiency when writing microcopy." → The evidence supports that writing copy is a general challenge for designers, as shown by them asking for help and by articles describing it as a "neglected" part of design. (S2.2, S2.9)
- weakens: Scout said "The specific, high-anxiety task of writing the words in the UI remains an underserved niche for productized toolkits." → The niche appears to have some service, with search results showing an AI-powered Figma plugin specifically for UX writing, as well as many lists of tools and resources. (S1.10, S1.4)

**Remaining uncertainty**

- The core assumption that non-native English speakers struggle with UX writing significantly more than native speakers and require a dedicated solution.
- Willingness to pay for a template-based kit versus using free resources or an integrated AI tool.
- The ability of a static kit to compete with an interactive AI assistant.
- 7 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 0 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create a free lead magnet: 'The 5-Minute Empty State Copy Kit,' a small Figma file and Notion doc with formulas. Promote it in designer communities and use an email gate to capture leads, with an optional question about their native language. _(cost: 1-2 days of work, 3 weeks)_

**Continue if:** The kit is downloaded over 100 times, and at least 30% of respondents to an optional survey identify as non-native English speakers who find writing copy challenging.

**Stop if:** There are few downloads, or the audience is overwhelmingly native English speakers who are just collecting free assets.

---

## 10. The Design Critique Kit for Non-Native Designers
`2026-05-06` · [ideas/2026-05-06.md](../../../ideas/2026-05-06.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking product, UX, or UI designer working in a collaborative team. Presenting unfinished work and navigating group feedback is a major source of anxiety. They fear they will misunderstand feedback or that their own feedback will sound rude, simplistic, or grammatically incorrect. This anxiety can cause them to stay silent in meetings, which hurts their career growth, and leads to…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers who participate in regular design critiques. Capturing 0.1% of this market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Nielsen Norman Group Courses:** NN/g offers a self-paced course on "Design Critiques: Getting Actionable Feedback," validating that…

**New search and competitor evidence** — United States · en (planner: The target customers are non-native English speakers working in collaborative teams, and the US has a large tech industry with many such roles, making it a plausible primary market for English-language resources.)

- Search demand: **low** — Idea-level demand (directly relevant keywords only): low. Largest directly relevant keyword: "how to give design feedback" at 10/month. Low measured volume is not evidence of low demand for B2B, regulated or emerging problems. Category-level: unknown; broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "how to give design feedback" 10/mo; no data for 8 of 9
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 11 vendor-like or publisher domain(s) and 3 broad platform(s) (miro.com, figma.com, notion.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on miro.com, figma.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 6 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **unknown**
- Alternatives: Miro _(indirect alternative)_ — Offers a design critique template to provide a structured environment for feedback. (S1.1); Figma Community _(indirect alternative)_ — Provides a free, asynchronous design critique template aimed at inclusivity. (S1.2); Smart Interface Design Patterns _(indirect alternative)_ — A publisher offering articles, strategies, and templates for running better design critiques. (S1.4); Notion _(indirect alternative)_ — Hosts a collection of ready-to-use design critique templates. (S1.6); Zoom _(indirect alternative)_ — Provides a template for streamlining the design critique process. (S1.8); Mural _(indirect alternative)_ — Offers a template to help critique a design solution. (S1.11)

**Relevance of the evidence to this idea** — customer: A non-native English-speaking product, UX, or UI designer working in a collaborative team. · problem: Non-native English-speaking designers struggle to confidently participate in and lead design critiques, fearing miscommunication or sounding unprofessional.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| non native english design critique | no data | direct | This search combines the target customer's identity ('non native english') with their specific activity ('design critique'). |
| how to give design feedback | 10 | direct | This describes the core problem of how to articulate feedback, which is central to the idea, even though it's not exclusive to non-native speakers. |
| design critique anxiety | no data | direct | This search describes a key part of the problem statement ('struggle to confidently participate'), which is relevant to any anxious designer, including the target customer. |
| design critique templates | no data | direct | This is a search for a specific solution (templates) to the problem of running design critiques, which the idea's kit would likely include. |
| design feedback scripts | no data | direct | This is a search for a specific solution (scripts) that directly addresses the problem of not knowing what to say, which is a core issue for the target customer. |
| design communication guide | no data | category | This is broader than just design critiques; it covers all forms of communication for a designer. |
| design critique kit pricing | no data | direct | This is a high-intent search for a product that exactly matches the idea's description, indicating a search for this specific solution. |
| best design critique tools | no data | category | This search is for the wider category of tools that assist with design critiques, which could include software rather than just templates or guides. |
| buy design feedback templates | no data | direct | This is a buying-intent search for a core component of the proposed solution. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S1.1 miro.com — Design Critique Templates & Examples \| Miroverse | broader | indirect | yes | This template is for any designer needing to structure a critique, not specifically for non-native English speakers. |
| S1.2 www.figma.com — Design critique template | broader | indirect | yes | This template is for any designer, focusing on general inclusivity rather than the specific challenges of non-native speakers. |
| S1.6 www.notion.com — Top 9 Design Critique Templates | broader | indirect | yes | This is a collection of general design critique templates for any designer, not tailored to the needs of non-native speakers. |
| S1.8 www.zoom.com — Design Critique - Gallery | broader | indirect | yes | This is a general design critique template for any designer, not one focused on the challenges of non-native speakers. |
| S1.11 www.mural.co — Design critique template | broader | indirect | yes | This is a general design critique template for any designer, not tailored to the communication challenges of non-native speakers. |
| S1.4 smart-interface-design-patterns.com — Designing Better Design Critiques | broader | indirect | yes | This offers general strategies and templates for any designer, not specifically for non-native English speakers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand low ("how to give design feedback" 10/mo) · problem evidence weak · competition crowded · changes untested/supports. **After:** idea-level demand low · problem evidence unknown · competition crowded · 0d/6i · changes untested/weakens.

**What changed and why**

- untested: Scout said "The "Productized Process" Market is Proven." → Searches for "design critique templates" show numerous free and platform-integrated templates from major companies like Miro (S1.1), Figma (S1.2), and Notion (S1.6), confirming that designers seek out such resources. (S1.1, S1.2)
- weakens: Scout said "The wedge is the combination of a structured critique process... + a deep linguistic scaffold" → Search demand for the proposed solution appears very low. The most relevant keyword with volume, "how to give design feedback" (K2), has only 10 searches per month. [removed: a statement about search demand that the collected evidence does not show] (K2)

**Remaining uncertainty**

- The core assumption that non-native English-speaking designers experience significantly more anxiety or difficulty in design critiques than their native-speaking peers.
- Whether this specific audience is aware of this as a distinct problem they need to solve.
- Whether this audience is willing to pay for a toolkit, especially when many general critique templates are available for free.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 2 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Conduct 5-10 qualitative interviews with non-native English-speaking designers. Ask open-ended questions about their experiences in design critiques, focusing on challenges, preparation methods, and any anxieties related to communication. _(cost: ~$200 for participant incentives + 15 hours of time., 1-2 weeks)_

**Continue if:** A strong pattern emerges where at least half of the interviewees spontaneously identify language barriers, fear of sounding unprofessional, or spending extra time scripting their words as a primary challenge in design critiques.

**Stop if:** Interviewees do not raise language as a significant issue, their challenges are identical to those of any designer (e.g., difficult stakeholders), and they express no interest in a language-focused solution.

