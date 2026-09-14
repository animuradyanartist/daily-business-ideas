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
- Written by gemini-2.5-pro → gemini-2.5-flash in GitHub Actions run 34837061249; validators re-applied offline to that run's stored model output at 2026-09-14T11:29:20.086Z.
- Every citation below carries a verbatim quote found in the cited item; that proves a claim is grounded, not that it is on-topic.

## Relevance checks — before → after

_Before: "Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)" (kept unchanged in run.json under `history`). After: the same collected evidence (no new DataForSEO request), every keyword and item judged for this idea's customer and problem (GitHub Actions run 34837061249), then re-assessed. Demand "after" counts directly relevant keywords only; "≤X?" = would reach X if a flagged keyword is confirmed. Competition "Nd/Mi" = direct competitors / indirect alternatives named._

| Idea | Market | Demand before | Idea-level demand after | Category · broader demand | Problem evidence before → after | Competition before → after | Flags |
|---|---|---|---|---|---|---|---|
| `2026-04-27` | United States/en | low | low | low · low | moderate → unknown | some → sparse · 0d/1i | 0 |
| `2026-04-28` | United States/en | some | unknown | some · some | weak → weak | crowded → unknown · 0d/5i | 0 |
| `2026-04-29` | United States/en | low | unknown | low · unknown | strong → weak | some → unknown · 0d/4i | 2 |
| `2026-04-30` | United States/en | some | unknown | some · low | weak → weak | crowded → crowded · 0d/4i | 0 |
| `2026-05-01` | India/en | unknown | unknown | unknown · unknown | moderate → weak | some → some · 0d/4i | 0 |
| `2026-05-02` | United States/en | unknown | unknown | unknown · unknown | weak → weak | crowded → crowded · 1d/3i | 0 |
| `2026-05-03` | United States/en | low | unknown | low · unknown | strong → unknown | some → some · 0d/4i | 0 |
| `2026-05-04` | United States/en | unknown | unknown | unknown · unknown | moderate → unknown | crowded → some · 0d/4i | 0 |
| `2026-05-05` | United States/en | some | unknown | some · unknown | weak → unknown | some → some · 0d/3i | 0 |
| `2026-05-06` | United States/en | low | unknown | low · unknown | weak → unknown | crowded → unknown · 0d/3i | 0 |

---

## 1. Async English — Slack and PR-comment swipe file for non-native software professionals
`2026-04-27` · [ideas/2026-04-27.md](../../../ideas/2026-04-27.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): Buyer: a non-native English-speaking software professional (engineer, PM, designer) working remote/hybrid for a US, UK, or pan-EU company. Most likely Indian, Polish, Brazilian, Turkish, French, Spanish, or Ukrainian. They read and listen to English fine but freeze when typing async — they over-hedge, sound rude by accident, get talked over in standups. Real pain in their words: - Talaera's blog on virtual…
- Size claim (Scout): Napkin TAM: ~30M non-native English speakers working in tech globally (rough — H1B SWE alone is >100k just in US queues, plus EU remote talent and offshore teams). If 0.05% buy a $39 product: 15,000 × $39 = $585k ceiling. Reachable serviceable market for a solo creator is the slice that lives in the named Reddit/LinkedIn/Discord communities — call that 200,000–500,000 people one or two hops from organic…

**New search and competitor evidence** — United States · en (planner: The target customers often work for US-based companies or in US-centric tech environments, and the problem is about professional English communication in that context.)

- Search demand: **low** — Idea-level demand (directly relevant keywords only): low. Largest directly relevant keyword: "english for software engineers" at 20/month. Low measured volume is not evidence of low demand for B2B, regulated or emerging problems. Category-level: low ("business english phrases" 30/mo); broader market: low ("how to write professional english" 10/mo) — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "how to write professional english" 10/mo; "business english phrases" 30/mo; "english for software engineers" 20/mo; no data for 6 of 9
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Published offer prices seen on 1 ranking site(s): oxfordlanguageclub.com. Prices show what sellers ask, not verified sales, and a ranking site is not necessarily a direct competitor.
- Competitors: 12 vendor-like or publisher domain(s) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on oxfordlanguageclub.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 2 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **unknown**
- Alternatives: Oxford Language Club _(indirect alternative)_ — Offers online English courses covering grammar, speaking, and writing. (P2)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking software professionals (engineers, PMs, designers) working remotely or hybrid for US, UK, or pan-EU companies. · problem: Non-native English-speaking software professionals struggle to communicate effectively and confidently in written async English within remote tech teams, often sounding rude or over-hedging.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| how to write professional english | 10 | broader | This is a general search for any professional, not specific to non-native software professionals or their async communication challenges. |
| non native english communication issues | no data | direct | This keyword directly addresses the target customer group and their general problem area. |
| improve english for tech jobs | no data | direct | This keyword combines the need to improve English with the specific context of tech jobs, matching the idea's customer. |
| business english phrases | 30 | category | The idea offers a specific type of this (for async tech comms), so this keyword represents the broader product category. |
| professional communication templates | no data | category | The idea's swipe file is a type of communication template, making this a search for the general product category. |
| english for software engineers | 20 | direct | This keyword is highly specific to the target customer (software engineers) and their need, matching the idea's focus. |
| buy english communication guide | no data | category | This is a generic search for a solution in the same product category as the idea. |
| best english phrases for work | no data | category | This is a search for a solution in the broader category of business English aids. |
| english for tech professionals course | no data | direct | This keyword is very specific to the target customer (tech professionals) and a potential solution format (course). |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| P2 oxfordlanguageclub.com — Oxford Language Club | broader | indirect | yes | This is a general English language school, not a specialized tool for non-native software professionals' async communication. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand low ("business english phrases" 30/mo) · problem evidence moderate · competition some · changes supports. **After:** idea-level demand low · problem evidence unknown · competition sparse · 0d/1i · changes untested/untested.

**What changed and why**

- untested: Scout said "AI rewriters (Grammarly, Professionally) created the category" → No evidence of AI rewriters as competitors appeared in the provided search results.
- untested: Scout said "Notion templates for language learning are a proven Gumroad/Notion-marketplace category" → No evidence supporting the existence or success of this product category was found in the search results.

**Remaining uncertainty**

- The existence of the specific problem for the target customer (non-native software professionals struggling with *async written* English).
- Willingness to pay for a swipe file solution over using free resources, AI tools, or general language courses.
- The addressable market size for such a niche product.
- 6 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 1 citation(s) without a matching quote, 0 downgrade(s), 2 dropped claim(s).

**Cheapest useful validation experiment:** Create a landing page for a free lead magnet: '10 Native-Sounding Slack Phrases for Non-Native Engineers'. Promote it in relevant online communities (e.g., subreddits for international developers) to validate interest. _(cost: ~$20 for a landing page tool + 10-15 hours, 2 weeks)_

**Continue if:** The landing page achieves a 5%+ email conversion rate from targeted traffic, and at least 5 people reply to a welcome email describing their specific struggles with async English.

**Stop if:** Fewer than 20 email sign-ups after promotion to an estimated 1000 people in target communities, or zero qualitative replies confirming the problem.

---

## 2. LinkedIn-Native — Canva carousel pack plus native-sounding caption swipes for non-native solo designers
`2026-04-28` · [ideas/2026-04-28.md](../../../ideas/2026-04-28.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): Buyer: a non-native English-speaking solo designer, illustrator, or freelance creative (graphic / UX / product / brand) based in EU, LatAm, India, MENA, SEA, who wants to win remote clients or build personal brand on LinkedIn. They are visually fluent — they make beautiful work — but freeze when typing English captions. They open Canva, design a gorgeous carousel, then either don't post it, post a stilted caption…
- Size claim (Scout): Napkin TAM: ~10M non-native English-speaking creative professionals on LinkedIn globally (LinkedIn has ~1B users; ~10% creative + non-native is conservative). At 0.05% conversion to a $39 product: 5,000 × $39 = $195k ceiling. Reachable serviceable market for a solo founder is the slice one or two hops from organic distribution — call that 100k-300k creators in the named subreddits, LinkedIn groups, and design…

**New search and competitor evidence** — United States · en (planner: The product is sold on Gumroad, targets remote clients, and the US is a large market for digital products and freelance services, making it a primary search location for such solutions.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 2 directly relevant keyword(s) returned data (unknown, not zero). Category-level: some ("linkedin carousel templates" 110/mo); broader market: some ("how to write linkedin posts" 320/mo) — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "how to write linkedin posts" 320/mo; "linkedin carousel templates" 110/mo, CPC $1.80; "linkedin content templates" 10/mo; "linkedin caption generator" 50/mo; no data for 5 of 9
- Commercial intent and payment: **moderate** — Advertisers bid on 1 commercial keyword(s) (highest CPC $1.80 on "linkedin carousel templates"). CPC is an advertiser bid, not a customer's willingness to pay. 1 keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty. No published offer prices were found on the fetched competitor pages.
- Competitors: 5 vendor-like or publisher domain(s) and 4 broad platform(s) (linkedin.com, canva.com, adobe.com, figma.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on figma.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 6 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — There is evidence of learning materials that teach non-native speakers how to use tools to 'clarify your content'. (S2.4)
- Alternatives: Canva _(indirect alternative)_ — A large collection of free and paid LinkedIn carousel templates for general use. (S1.1); Adobe Express _(indirect alternative)_ — Offers editable free LinkedIn carousel post templates for general users. (S1.2); Figma Community _(indirect alternative)_ — Community-provided templates for creating LinkedIn carousels within Figma. (S1.3); ContentDrips _(indirect alternative)_ — Provides free carousel templates and uses AI to fill slides from a topic or blog post. (S1.9); LinkedIn Learning _(indirect alternative)_ — Offers general courses on business English skills for non-native speakers, including writing business emails. (S2.11)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking solo designers, illustrators, or freelance creatives (graphic, UX, product, brand) who want to win remote clients or build a personal brand on LinkedIn. · problem: Non-native English-speaking solo designers struggle to create professional, native-sounding LinkedIn content that attracts clients.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| linkedin content for non native | no data | direct | This keyword directly addresses the platform, the task, and the specific attribute of the target customer. |
| english writing for designers | no data | direct | This keyword combines the skill (English writing) with the profession (designers), which is a core part of the idea's customer. |
| how to write linkedin posts | 320 | broader | This is a general search for anyone on LinkedIn, missing the specific 'non-native' and 'designer' angles of the idea. |
| linkedin carousel templates | 110 | category | The idea includes templates as part of its solution, so this keyword represents the broader product category. |
| linkedin content templates | 10 | category | The idea is a specific type of content template, making this a search for the general product category. |
| linkedin caption generator | 50 | category | A caption generator is a tool that solves part of the customer's problem, placing it in the same solution category as the idea. |
| linkedin content pricing | no data | uncertain | This search is likely from someone looking to hire a content writer or a writer setting their rates, not someone looking to buy templates. |
| best linkedin content tools | no data | category | The idea is a type of LinkedIn content tool, so this search is for competing solutions in the same category. |
| hire linkedin content writer | no data | uncertain | This searcher wants to hire a person to perform a service, not buy a product or tool to do it themselves. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.4 www.linkedin.com — Tools to clarify your content - Public Speaking for Non-Native ... | category | none | yes | This article recommends AI writing tools for non-native speakers to clarify content, addressing the core problem but not specifically for designers on LinkedIn. |
| S1.1 www.canva.com — Customize 1239+ LinkedIn Carousel Templates Online | broader | indirect | yes | These are general-purpose LinkedIn carousel templates for any user, not specifically for non-native designers needing help with English captions. |
| S1.2 www.adobe.com — Free LinkedIn Carousel Post Templates \| Adobe Express | broader | indirect | yes | These are general-purpose LinkedIn carousel templates for any user, not specifically for non-native designers needing help with English captions. |
| S1.3 www.figma.com — LinkedIn Carousel templates | broader | indirect | yes | These are general-purpose LinkedIn carousel templates for any user, not specifically for non-native designers needing help with English captions. |
| S1.9 contentdrips.com — Free LinkedIn Carousel Templates — Edit with AI | broader | indirect | yes | These are general-purpose LinkedIn carousel templates for any user, not specifically for non-native designers needing help with English captions. |
| S2.11 www.linkedin.com — Writing Emails for Non-Native English Speakers Online Class | broader | indirect | yes | This is a course for non-native speakers on writing business emails, not LinkedIn content for designers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand some ("how to write linkedin posts" 320/mo) · problem evidence weak · competition crowded · changes supports/supports. **After:** idea-level demand unknown · problem evidence weak · competition unknown · 0d/5i · changes weakens/supports/contradicts.

**What changed and why**

- weakens: Scout said "non-natives... freeze when typing English captions" → The evidence points to a general need for non-native speakers to 'clarify content' but does not specifically show designers struggling with or 'freezing' when writing LinkedIn captions. (S2.4)
- supports: Scout said "Editable templates are eating static PDFs in 2026" → The search results for carousel templates are dominated by platforms offering customizable and editable templates, such as Canva and Adobe Express. (S1.1, S1.2)
- contradicts: Scout said "Authenticity premium punishes generic AI captions" → At least one competitor offers to 'let AI fill the slides,' suggesting market adoption of AI for content generation, which may contradict the idea that it's being punished. (S1.9)

**Remaining uncertainty**

- The specific problem that non-native *designers* struggle with writing *LinkedIn captions* enough to pay for a solution.
- Whether customers prefer a bundled template and swipe file over using free design templates and a separate writing tool (like Grammarly or ChatGPT).
- Willingness to pay for caption swipes instead of using free or low-cost AI generators.
- 5 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 0 dropped claim(s).

**Cheapest useful validation experiment:** Create a free lead magnet: '5 Canva Carousel Templates + 10 Native-English LinkedIn Hooks for Non-Native Designers'. Promote it on LinkedIn and in designer communities to gauge interest and collect emails for a waitlist. _(cost: $0 (using free tools) + 15-20 hours, 3 weeks)_

**Continue if:** Over 100 downloads of the lead magnet from targeted promotion, and at least 10 people respond to a follow-up survey confirming that writing English captions is a significant pain point.

**Stop if:** Fewer than 25 downloads, or survey responses indicate that designers are happy using existing template sites and free AI tools for their captions.

---

## 3. The UX Research Kit for Non-Native UX Designers
`2026-04-29` · [ideas/2026-04-29.md](../../../ideas/2026-04-29.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX designer or researcher, likely from Europe, Asia, or Latin America, working for a US/UK company or serving English-speaking clients. They are skilled in design and research methodology but lack confidence in their linguistic ability to conduct nuanced user interviews and present findings persuasively to native-speaking stakeholders. Real pain in their words: *   A user…
- Size claim (Scout): Napkin TAM: The global User Experience (UX) Research Software Market is projected to reach ~$525 million in 2026 and grow at a CAGR of over 17%. While this product isn't software, it serves the practitioners driving that market. With millions of UX professionals globally, a conservative estimate of 100,000 non-native English speakers in this role is reasonable. Capturing 0.2% of this niche at $39 yields a $78k…

**New search and competitor evidence** — United States · en (planner: The target customers often work for US/UK companies or serve English-speaking clients, and the problem examples are from English-speaking forums, making the US market the most direct fit for search intent.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 2 directly relevant keyword(s) returned data (unknown, not zero). Category-level: low ("ux research templates" 50/mo); broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "ux research templates" 50/mo; no data for 8 of 9
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 6 vendor-like or publisher domain(s) and 3 broad platform(s) (notion.com, figma.com, airtable.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on notion.com, figma.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 4 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — Multiple sources directly discuss the problem of 'language barriers' in the context of 'Ux research' and the need for 'Tips for communicating' with participants. (S2.6, S2.10)
- Alternatives: NN/g (Nielsen Norman Group) _(indirect alternative)_ — Provides a curated set of free templates and guides for general UX activities. (S1.3); Notion Marketplace _(indirect alternative)_ — A marketplace offering general user research templates for compiling findings, interviews, and tests. (S1.4); Figma Community _(indirect alternative)_ — A platform for community-provided templates for UX research within Figma. (S1.5); Airtable _(indirect alternative)_ — Offers a free template for creating and tracking a UX research plan. (S1.8)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking UX designers or researchers, likely from Europe, Asia, or Latin America, working for US/UK companies or serving English-speaking clients. · problem: Non-native English-speaking UX designers lack confidence and specific linguistic tools to conduct nuanced user interviews and present findings persuasively to native-speaking stakeholders.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| user interview language barrier | no data | direct | This keyword describes a core part of the specific problem the idea aims to solve. |
| ux research communication issues | no data | broader | This is a broader search about communication in UX, which could include many issues beyond the non-native speaker challenge. |
| non native ux designer challenges | no data | direct | This keyword directly names the target customer and their context of facing challenges, matching the idea's focus. |
| ux research templates | 50 | category | The idea is a specific type of research kit/template, so this keyword represents the general product category. |
| user interview script english | no data | category | An interview script is a component of the proposed solution, making this a search for an item in the same category. |
| ux communication guide | no data | category | The idea is a specific type of communication guide (for non-natives in UX), so this is a search for the broader category. |
| ux research kit pricing | no data | category | This is a buying-intent keyword for products in the same category as the idea. |
| best ux interview templates | no data | category | This is a search for a competing solution in the same product category. |
| buy ux research tools | no data | broader | This is a very broad search for any kind of UX research tool, far wider than the idea's specific communication focus. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.6 www.objectiveexperience.com — UX research and language barriers - the best tips | category | none | yes | This article gives tips for any UX researcher dealing with a language barrier, which is the exact problem space. |
| S2.10 userresearch.blog.gov.uk — Tips for communicating across a language barrier | category | none | yes | This article from a UK government blog gives tips for researchers communicating across a language barrier, matching the problem. |
| S1.3 www.nngroup.com — NN/g's Free UX Templates and Guides | broader | indirect | yes | These are general UX research templates for any practitioner, not specifically designed to help non-native English speakers with language nuances. |
| S1.4 www.notion.com — User Research templates - Notion Marketplace | broader | indirect | yes | These are general UX research templates for any practitioner, not specifically designed to help non-native English speakers with language nuances. |
| S1.5 www.figma.com — UX Research Template | broader | indirect | yes | These are general UX research templates for any practitioner, not specifically designed to help non-native English speakers with language nuances. |
| S1.8 www.airtable.com — Free UX Research Plan Template | broader | indirect | yes | This is a general UX research template for any practitioner, not specifically designed to help non-native English speakers with language nuances. |
| S2.9 medium.com — User Research Study: Breaking Language Barriers | uncertain | uncertain | **no — removed** | This is a case study about the problem of language barriers in user research, directly matching the idea's problem space. |

_Flagged for a person (not counted):_
- The judge said these items concern the exact target customer, but their text does not mention every defining trait (Non-native English-speaking + UX designer or researcher), so they are not counted: S2.9 "User Research Study: Breaking Language Barriers".
- Items with unclear relevance (not counted): S2.2.

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand low ("ux research templates" 50/mo) · problem evidence strong · competition some · changes supports/untested. **After:** idea-level demand unknown · problem evidence weak · competition unknown · 0d/4i · changes supports/untested/untested.

**What changed and why**

- supports: Scout said "non-native speaker, i have little confidence in my communication ability" → The evidence strongly confirms that 'language barriers' are a recognized problem in the context of UX research. (S2.6)
- untested: Scout said "The market for productized UX templates is validated." → Search results for 'ux research templates' return numerous providers, including NN/g, Notion, Figma, and Airtable, confirming a market for these artifacts. (S1.3, S1.4)
- untested: Scout said "AI tools are augmenting, not replacing, the researcher." → No AI research tools appeared in the provided search results for the given queries.

**Remaining uncertainty**

- Willingness to pay for a solution focused on language, given the abundance of free structural templates (e.g., research plans, script outlines).
- Whether a swipe file is the preferred solution format over coaching, courses, or AI-powered practice tools.
- The size of the specific market segment (non-native UX researchers who feel this pain acutely enough to pay).
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 3 downgrade(s), 0 dropped claim(s).

**Cheapest useful validation experiment:** Write a detailed blog post titled 'How to Moderate a User Interview in English (When You're a Non-Native Speaker)' that includes a free downloadable '5-Step Checklist for Your First User Interview in English'. Promote it in UX communities to measure engagement and problem resonance. _(cost: $0 + 10-15 hours, 2 weeks)_

**Continue if:** The blog post receives significant engagement (e.g., 500+ views, 10+ comments/shares) and the checklist is downloaded over 50 times, with some downloaders confirming the problem via email.

**Stop if:** The content gets little traction, or feedback suggests that non-native UX researchers do not see this as a significant problem or are already using other effective solutions.

---

## 4. The Design Presentation Kit for Non-Native UX/Product Designers
`2026-04-30` · [ideas/2026-04-30.md](../../../ideas/2026-04-30.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer working in a remote or international team where English is the primary language. They are technically and visually skilled but experience high anxiety when they need to present their work, defend their decisions, or handle critical feedback from native-speaking stakeholders. Real pain in their words: *   A designer on Medium describes the…
- Size claim (Scout): Napkin TAM: There are an estimated 1 million+ UX/product designers globally. Conservatively, 15-20% are non-native English speakers in professional roles. This creates a target market of 150,000+ designers. Capturing 0.1% of this niche at $39 yields a $58.5k ceiling. Comparables with revenue or proxy revenue: *   **Katya Kovalenko's "The Grid Deck Template" on Gumroad:** A Figma presentation template with 183…

**New search and competitor evidence** — United States · en (planner: The target customer is a non-native English speaker working in an English-speaking professional environment, and the US is a major hub for tech and design jobs where English proficiency in presentations is critical.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 3 directly relevant keyword(s) returned data (unknown, not zero). Category-level: some ("design presentation templates" 320/mo); broader market: low ("design communication course" 20/mo) — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "design presentation templates" 320/mo, CPC $2.97; "design communication course" 20/mo, CPC $12.03; no data for 7 of 9
- Commercial intent and payment: **moderate** — Advertisers bid on 1 commercial keyword(s) (highest CPC $2.97 on "design presentation templates"). CPC is an advertiser bid, not a customer's willingness to pay. 1 keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty. No published offer prices were found on the fetched competitor pages.
- Competitors: 8 vendor-like or publisher domain(s) and 3 broad platform(s) (adobe.com, canva.com, figma.com) rank across 2 queries (not all are competitors — some are consultants or publishers). Judged for relevance: 0 domain(s) with a direct competitor (same problem), 8 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that designers in general experience fear and anxiety when presenting their work. (S2.2, S2.5)
- Alternatives: Adobe Express _(indirect alternative)_ — Offers hundreds of free, customizable presentation templates that can be downloaded as PowerPoint or PDF files. (S1.1); SlidesCarnival _(indirect alternative)_ — Provides a selection of free presentation templates for Google Slides and PowerPoint. (S1.2); Canva _(indirect alternative)_ — An online platform with a large library of free, personalizable slide templates. (S1.4); Figma Community _(indirect alternative)_ — Offers thousands of free, fully customizable presentation templates and slides for designers to use and collaborate on. (S1.6)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking UX, UI, or product designers working in remote or international teams where English is the primary language. · problem: Non-native English-speaking designers experience high anxiety and difficulty presenting their work, defending decisions, and handling critical feedback from native-speaking stakeholders.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| design presentation anxiety | no data | direct | This keyword describes the core problem of anxiety when presenting designs, which is relevant to both native and non-native designers. |
| present ux design tips | no data | category | This is a general search for tips on presenting UX design, relevant to any UX designer, not specifically non-native speakers with anxiety. |
| non native english presentation | no data | direct | This keyword directly targets the challenge of giving a presentation as a non-native English speaker, a core part of the customer profile. |
| design presentation templates | 320 | category | This is a search for a general solution (templates) for design presentations, not specific to the challenges faced by non-native speakers. |
| ux presentation script | no data | category | This is a search for a specific tool (a script) for UX presentations, which could be used by any designer, not just non-native speakers. |
| design communication course | 20 | broader | This is a search for a broader solution (a course on all design communication) rather than a specific kit for presentations. |
| design presentation kit pricing | no data | direct | This search uses the exact product category of the idea ('design presentation kit') and indicates buying intent. |
| best ux presentation templates | no data | category | This is a search for a general solution (templates) with buying intent, not specific to the challenges of non-native speakers. |
| buy design presentation script | no data | category | This is a search for a specific tool (a script) for design presentations with buying intent, not specific to non-native speakers. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.2 www.reddit.com — How to get over fear of presenting designs/speaking ... | category | none | yes | This Reddit thread discusses the problem of presentation anxiety for designers, but doesn't specify the non-native English speaker aspect. |
| S2.5 medium.com — An anxious designer's guide to presentation and facilitation | category | none | yes | This article is for any designer with presentation anxiety, but doesn't address the specific challenges of being a non-native English speaker. |
| S1.1 www.adobe.com — Customize & Download Free Presentation Templates | broader | indirect | yes | This offers general presentation templates for anyone, not specifically for designers or non-native speakers with presentation anxiety. |
| S1.2 www.slidescarnival.com — SlidesCarnival: Free PowerPoint & Google Slides Templates ... | broader | indirect | yes | This offers general presentation templates for anyone, not specifically for designers or non-native speakers with presentation anxiety. |
| S1.4 www.canva.com — Free and engaging presentation templates to ... | broader | indirect | yes | This offers general presentation templates for anyone, not specifically for designers or non-native speakers with presentation anxiety. |
| S1.6 www.figma.com — 3400+ Free Presentation Templates for Impactful Slides | broader | indirect | yes | This offers general presentation templates for designers, but does not address the specific problem of anxiety for non-native speakers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand some ("design presentation templates" 320/mo) · problem evidence weak · competition crowded · changes supports/supports/untested. **After:** idea-level demand unknown · problem evidence weak · competition crowded · 0d/4i · changes untested.

**What changed and why**

- untested: Scout said "The template market is mature, but lacks linguistic support." → Search results confirm a mature and crowded market for visual presentation templates, with many free offerings from major platforms like Adobe, Canva, and Figma. The lack of linguistic support is an inference, as none of the competitors mention offering it. (S1.1, S1.4, S1.6)

**Remaining uncertainty**

- Whether non-native designers perceive presentation anxiety as a distinct problem requiring a specialized solution, separate from general presentation anxiety.
- Willingness to pay for a toolkit versus using abundant free visual templates combined with free AI writing tools.
- The existence of any search demand for this specific problem, as all directly relevant keywords showed no volume data.
- 7 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create the lead magnet, "The 5-Slide Template & Script to Justify One Design Decision," and promote it in relevant online communities (e.g., r/UXDesign, ADPList) to gauge interest from the target audience. _(cost: $0 cash, 2-3 days of work., 2 weeks)_

**Continue if:** The lead magnet receives at least 100 downloads and 5+ pieces of unsolicited positive feedback from self-identified non-native designers within two weeks.

**Stop if:** Fewer than 25 downloads are achieved, or feedback indicates the linguistic script is not a compelling differentiator from free templates.

---

## 5. The Client Communication Kit for Non-Native Freelance Designers
`2026-05-01` · [ideas/2026-05-01.md](../../../ideas/2026-05-01.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking freelance designer (UX, UI, brand, graphic) who has secured an English-speaking client but now faces the anxiety of day-to-day communication. Their design skills are strong, but their confidence in written English is not, leading to hours wasted drafting emails, misunderstandings about deliverables, and an inability to push back on scope creep, which directly costs them…
- Size claim (Scout): Napkin TAM: There are an estimated 1.57 billion freelancers worldwide. A conservative estimate of 1 million+ non-native English-speaking freelance designers is reasonable. Capturing just 0.1% of a 200,000-person serviceable market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Etsy Template Shops:** Sellers like "LunaSoulDesign" offer a "Designer Essentials Kit" of client onboarding…

**New search and competitor evidence** — India · en (planner: India has a large population of non-native English-speaking freelancers who serve global clients and would search for solutions in English.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 2 directly relevant keyword(s) returned data (unknown, not zero). Category-level: unknown; broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Published offer prices seen on 1 ranking site(s): agencyhandy.com. Prices show what sellers ask, not verified sales, and a ranking site is not necessarily a direct competitor.
- Competitors: 10 vendor-like or publisher domain(s) and 4 broad platform(s) (coursera.org, notion.com, linkedin.com, udemy.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on agencyhandy.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 9 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — An academic paper suggests that non-native English speakers might experience a higher cognitive load when using English for business communication. (S2.3)
- Alternatives: AgencyHandy _(indirect alternative)_ — Offers client communication templates as part of a broader client portal and agency management tool. (S1.2); Notion _(indirect alternative)_ — Hosts a 'Client Communication Bundle Template' for managing client emails. (S1.8); InvoiceMonk _(indirect alternative)_ — Provides an article with client communication templates for freelancers to save time and ensure consistency. (S1.9); Coursera _(indirect alternative)_ — Offers a 'Business English for Non-Native Speakers Specialization' course, a broader educational alternative. (S2.5)

**Relevance of the evidence to this idea** — customer: A non-native English-speaking freelance designer (UX, UI, brand, graphic) who has secured an English-speaking client but lacks confidence in day-to-day communication. · problem: Non-native English-speaking freelance designers struggle with confidence and effectiveness in written client communication, leading to wasted time, misunderstandings, and lost income.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| freelance communication problems | no data | category | This keyword addresses communication problems for any freelancer, not specifically the challenges faced by non-native English speakers. |
| non native english speaker client communication | no data | direct | This keyword directly addresses the core problem of client communication for non-native English speakers. |
| how to handle scope creep freelance | no data | category | This is a common problem for all freelancers, not one that is specific to being a non-native English speaker. |
| client communication templates | no data | category | This is a search for a general solution (templates) that any freelancer or business could use for client communication. |
| freelance email scripts | no data | category | This is a search for a solution (email scripts) relevant to all freelancers, not just non-native speakers. |
| business communication toolkit | no data | broader | This is a very broad search for a solution that applies to any business, not just freelance designers. |
| freelance client communication kit | no data | direct | This search uses the exact product category of the idea ('client communication kit') and specifies the 'freelance' context. |
| best client onboarding templates | no data | category | This is a search for a specific type of template for any business or freelancer, not just non-native speakers. |
| freelance proposal template cost | no data | category | This is a search for a specific template related to acquiring clients, relevant to all freelancers, with buying intent. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.3 www.researchgate.net — (PDF) Effect on Non-Native English Speakers of Utilizing ... | category | none | yes | This research paper discusses the core problem of communication difficulties for the general group of non-native English speakers in business. |
| S1.8 www.notion.com — Client Communication Bundle Template | broader | indirect | yes | This is a bundle of communication templates for any professional dealing with clients, not specific to non-native designers. |
| S1.9 invoicemonk.com — Client Communication Templates for Freelancers | broader | indirect | yes | This item offers communication templates for freelancers in general, but doesn't address the non-native speaker aspect. |
| S2.5 www.coursera.org — Business English for Non-Native Speakers Specialization | broader | indirect | yes | This is a course for a broader audience of non-native English speakers in any business role, covering a wider set of skills. |
| S1.2 www.agencyhandy.com — Top 10 Client Communication Templates for Better ... | broader | indirect | yes | This item offers general client communication templates for a broad audience, not specifically for non-native freelance designers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand unknown · problem evidence moderate · competition some · changes untested. **After:** idea-level demand unknown · problem evidence weak · competition some · 0d/4i · changes untested.

**What changed and why**

- untested: Scout said "The "Productized Template" Market is Validated." → Search results show multiple vendors offering 'client communication templates' for freelancers and agencies, confirming that a market exists for this type of productized solution. (S1.2, S1.8, S1.9)

**Remaining uncertainty**

- Whether non-native freelance designers perceive their communication challenges as a problem significant enough to buy a dedicated toolkit.
- Willingness to pay for templates and scripts instead of using free alternatives or AI writing assistants.
- The existence of any search demand for this problem, as all direct and category keywords had no volume data.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create a lead magnet, "3 Email Scripts for Non-Native Freelancers to Confidently Handle Scope Creep," and share it in freelance designer communities to measure interest. _(cost: $0 cash, 1-2 days of work., 2 weeks)_

**Continue if:** The lead magnet is downloaded over 100 times and receives at least 5 unsolicited comments or messages confirming the 'non-native' angle was the primary reason for their interest.

**Stop if:** Fewer than 25 downloads, or if feedback suggests the templates are not significantly more valuable than what they could write themselves or generate with AI.

---

## 6. The Portfolio Case Study Kit for Non-Native Designers
`2026-05-02` · [ideas/2026-05-02.md](../../../ideas/2026-05-02.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer trying to get hired or win freelance clients. They are visually proficient but struggle to write the narrative of their case studies. This is a high-stakes problem; a portfolio with strong visuals but a weak, confusing, or grammatically awkward story fails to convince hiring managers and costs them opportunities. Real pain in their words: *   On…
- Size claim (Scout): Napkin TAM: There are millions of UX/UI designers globally. A conservative estimate of 200,000+ non-native English-speaking designers actively maintaining a portfolio is reasonable. Capturing 0.1% of this market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Etsy Template Sellers:** Shops selling Canva portfolio templates often have 1,000+ sales, indicating a large volume of buyers…

**New search and competitor evidence** — United States · en (planner: The target audience is non-native English speakers globally, and the US market represents a large segment of the design industry where English proficiency in portfolios is critical.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 3 directly relevant keyword(s) returned data (unknown, not zero). Category-level: unknown; broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 7 vendor-like or publisher domain(s) and 4 broad platform(s) (figma.com, adobe.com, canva.com, linkedin.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on figma.com. Judged for relevance: 1 domain(s) with a direct competitor (same problem) (blog.uxfol.io), 6 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that writing portfolio case studies is a difficult and 'dreaded' part of the process for designers in general. (S2.3, S2.6)
- Alternatives: UXfol.io Blog _(direct competitor)_ — Offers a comprehensive guide and template on how to structure and write a UX case study. (S1.2); Figma Community _(indirect alternative)_ — Provides numerous free case study templates that help with the visual layout and presentation of a project. (S1.1); Adobe Express _(indirect alternative)_ — Offers editable and free case study templates to help users create their own designs online. (S1.3); Canva _(indirect alternative)_ — Provides free and customizable case study templates to help present methods and insights effectively. (S1.7)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking UX, UI, or product designers who are visually proficient but struggle to articulate their design process and results in natural, persuasive English. · problem: Non-native English-speaking designers struggle to write compelling, clear, and persuasive narratives for their portfolio case studies, costing them job opportunities.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| how to write design case study | no data | category | This is a general search by any designer wanting to learn how to write a case study. |
| non native english portfolio help | no data | direct | This keyword directly addresses the need for portfolio assistance for non-native English speakers. |
| struggle writing ux case study | no data | direct | This keyword describes the core problem of struggling to write a UX case study, which is relevant to both native and non-native designers. |
| design case study templates | no data | category | This is a search for a general solution (templates) that any designer could use for their case study. |
| portfolio storytelling script | no data | category | This is a search for a solution (a script) to improve portfolio storytelling, relevant to any designer. |
| ux case study writing guide | no data | category | This is a search for a general guide on writing UX case studies, applicable to any UX designer. |
| design portfolio template pricing | no data | broader | This search is for pricing on full portfolio templates, which is a broader solution than a case study writing kit. |
| best ux case study kit | no data | direct | This search uses the idea's product framing ('kit') for the specific task of creating a UX case study. |
| hire portfolio case study writer | no data | category | This is a search for an alternative solution (hiring a writer) to the problem of writing a case study. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S2.3 www.reddit.com — What's your strategy for making the process of writing case ... | category | none | yes | This is a general discussion on writing case studies for all designers, addressing the writing problem without the non-native speaker focus. |
| S2.6 vanschneider.medium.com — A visual guide to writing portfolio case studies | category | none | yes | This is a general guide on writing case studies for all designers, addressing the writing problem without the non-native speaker focus. |
| S1.1 www.figma.com — 15+ Case Study Templates \| Free Resources | broader | indirect | yes | This offers general case study templates for any designer, not specifically addressing the writing challenges of non-native speakers. |
| S1.2 blog.uxfol.io — The Ultimate UX Case Study Template & Structure (2026 ... | category | direct | yes | This offers a UX case study template for any UX designer, addressing the general problem but not the non-native speaker aspect. |
| S1.3 www.adobe.com — Free Case Study Templates \| Adobe Express | broader | indirect | yes | This offers general case study templates for any designer, not specifically addressing the writing challenges of non-native speakers. |
| S1.7 www.canva.com — Free and customizable case study templates | broader | indirect | yes | This offers general case study templates for any designer, not specifically addressing the writing challenges of non-native speakers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand unknown · problem evidence weak · competition crowded · changes untested/untested. **After:** idea-level demand unknown · problem evidence weak · competition crowded · 1d/3i · changes untested.

**What changed and why**

- untested: Scout said "The "Artifact" Market is Validated but Incomplete." → Search results confirm a large, validated market for visual case study templates from major players like Figma and Adobe. The existence of popular guides on writing structure also validates the need for content help, supporting the idea that the market is incomplete. (S1.1, S1.2)

**Remaining uncertainty**

- Whether non-native designers perceive their writing challenges as a primary blocker in their job search, significant enough to warrant a paid solution.
- Willingness to pay for a writing kit when free visual templates, free writing guides, and AI writing assistants are widely available.
- The existence of any search demand for this specific problem, as all directly relevant keywords had no volume data.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create the lead magnet, "The 1-Page Case Study Outline & 10 Essential English Phrases," and promote it in communities where designers are actively seeking jobs and portfolio feedback. _(cost: $0 cash, 1-2 days of work., 2 weeks)_

**Continue if:** The lead magnet is downloaded over 150 times and receives specific, unsolicited feedback from non-native speakers that the 'essential English phrases' were the most valuable part.

**Stop if:** Fewer than 50 downloads, or if feedback indicates the phrases are not a significant improvement over using an AI tool like ChatGPT.

---

## 7. The Figma Handoff Kit for Non-Native Designers
`2026-05-03` · [ideas/2026-05-03.md](../../../ideas/2026-05-03.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking product, UX, or UI designer working on a software team. Their visual designs are clean, but their written specifications for developers are a major source of anxiety and inefficiency. Miscommunication leads to developers building the wrong thing, which causes delays, rework, and damages the designer's credibility. This is a direct, operational pain point that costs the…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers working with developers. This is the core market. Capturing 0.1% of this at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Untitled UI on Gumroad:** Sells a massive Figma UI kit and design system for $129, with thousands of customers, indicating a high…

**New search and competitor evidence** — United States · en (planner: The United States has a large tech industry with many non-native English-speaking designers who need to communicate effectively with developers.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. No keyword was judged directly relevant to the idea, so idea-level demand is unknown. Category-level: low ("best design handoff tools" 10/mo); broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "best design handoff tools" 10/mo; no data for 8 of 9
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 5 vendor-like or publisher domain(s) and 3 broad platform(s) (uxpin.com, miro.com, figma.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on uxpin.com, miro.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 5 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **unknown**
- Alternatives: Figma _(indirect alternative)_ — Figma offers a design handoff experience intended to keep designers and developers on the same page. (S1.2); Miro _(indirect alternative)_ — Miro provides resources for design handoff including a checklist, reusable templates, and techniques for documenting logic. (S1.4); Figr.design _(indirect alternative)_ — Figr.design offers a playbook with tools, templates, and best practices for developer handoff. (S1.9); General Handoff Tools (listed by UXPin) _(indirect alternative)_ — Tool roundups list various solutions like Zeplin that aim to make it easier for team members to communicate and collaborate. (S1.3)

**Relevance of the evidence to this idea** — customer: A non-native English-speaking product, UX, or UI designer working on a software team. · problem: Non-native English-speaking designers struggle to create clear, unambiguous handoff documentation for developers, leading to miscommunication, project delays, and rework.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| design handoff problems | no data | category | This is about the general problem of design handoff, not specifically the language barrier issue for non-native designers. |
| developer communication issues | no data | broader | This is a very broad term covering all communication issues between designers and developers, not just the specific documentation problem for non-native speakers. |
| how to write design specs | no data | category | This is a general query for any designer wanting to learn how to write design specs, not specific to the challenges faced by non-native speakers. |
| design handoff template | no data | category | This is a generic solution for design handoff, not one specifically addressing the language challenges of non-native designers. |
| figma documentation kit | no data | category | This is a generic solution for Figma documentation, not one specifically for non-native English speakers. |
| ux specification tool | no data | category | This is a search for a general tool for UX specifications, not one tailored to non-native speakers. |
| best design handoff tools | 10 | category | This is a search for general design handoff tools, not specifically for tools that help non-native English speakers. |
| design documentation template cost | no data | category | This is a commercial query for a general design documentation template, not one for non-native speakers. |
| buy design spec template | no data | category | This is a commercial query for a general design spec template, not one specifically for non-native speakers. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S1.2 www.figma.com — Free Design Handoff Tool for Designers & Developers | broader | indirect | yes | This is for any designer using Figma for handoff, not specifically for non-native English speakers. |
| S1.3 www.uxpin.com — Top 10 Design Handoff Tools to Try in 2024 | broader | indirect | yes | This is a list of general design handoff tools for any designer, not addressing the non-native speaker issue. |
| S1.4 miro.com — Design Handoff Best Practices: Beyond Static Mockups | broader | indirect | yes | This article discusses best practices for any designer, not specifically for non-native English speakers. |
| S1.9 figr.design — Developer Handoff: Tools, Templates, Playbook | broader | indirect | yes | This offers general tools and templates for any designer, not specifically for non-native speakers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand low ("best design handoff tools" 10/mo) · problem evidence strong · competition some · changes supports/weakens/untested. **After:** idea-level demand unknown · problem evidence unknown · competition some · 0d/4i · changes untested.

**What changed and why**

- untested: Scout said "The "Productized Handoff" Market is Validated" → Evidence shows search demand for "best design handoff tools" and multiple articles listing such tools, which indicates a market for handoff solutions. (K7, S1.3)

**Remaining uncertainty**

- The core problem: whether non-native English-speaking designers perceive the language barrier in handoff documentation as a significant, unsolved problem.
- Willingness to pay for a solution to this specific problem, given existing general-purpose tools.
- The ability to effectively reach this niche target audience.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create a landing page for 'The Figma Handoff Kit for Non-Native Designers.' Clearly describe the problem of miscommunication due to language barriers and offer the kit as the solution. Collect email sign-ups for a waitlist. _(cost: ~$20 for a landing page tool + 10-15 hours, 1-2 weeks)_

**Continue if:** The landing page gets 50+ email sign-ups, indicating that the problem resonates with the target audience.

**Stop if:** The landing page gets fewer than 10 email sign-ups, suggesting the specific problem is not a strong enough hook.

---

## 8. The AI Prompt Kit for Non-Native Designers
`2026-05-04` · [ideas/2026-05-04.md](../../../ideas/2026-05-04.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer. They know AI is a critical skill for their career in 2026, but struggle to get useful outputs from generative tools. Their prompts are too simple, leading to generic results that require heavy editing, defeating the purpose of using AI. This problem is amplified by the language barrier, making it difficult to write the nuanced, context-rich…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers who are now required to integrate AI into their workflow. Capturing just 0.1% of this market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **AI Prompt Packs on Gumroad/YouTube:** Creators are successfully selling prompt packs and building entire business…

**New search and competitor evidence** — United States · en (planner: The product targets a global audience of non-native English speakers, and the United States is a primary market for digital products and tech-related services in English.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 1 directly relevant keyword(s) returned data (unknown, not zero). Category-level: unknown; broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 9 vendor-like or publisher domain(s) and 2 broad platform(s) (figma.com, adobe.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on figma.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 5 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **unknown**
- Alternatives: AI UX Playground _(indirect alternative)_ — Offers ready-made AI design prompts for various tasks including product design, UX research, and visual design. (S1.3); Design Prompts (.dev) _(indirect alternative)_ — An AI-powered tool to explore design styles and get prompts to recreate aesthetics. (S1.4); Refero Design _(indirect alternative)_ — Provides design prompts for AI agents that incorporate style references, constraints, and layout direction. (S1.8); Design with AI (Substack) _(indirect alternative)_ — A newsletter that provides prompt templates to help designers increase their efficiency with AI. (S1.11)

**Relevance of the evidence to this idea** — customer: Non-native English-speaking UX, UI, or product designers. · problem: Non-native English-speaking designers struggle to get useful, high-quality outputs from generative AI tools due to simple prompts and language barriers.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| ai design generic results | no data | category | This describes a general problem any designer might face with AI, not specifically due to being a non-native speaker. |
| non native english ai prompts | no data | direct | This keyword explicitly combines the non-native English speaker aspect with the problem of AI prompts. |
| improve ai design output | no data | category | This is a general query for any designer wanting better results from AI tools. |
| ai prompts for designers | no data | category | This is a search for a general solution for any designer, not one tailored to non-native speakers. |
| design ai prompt templates | no data | category | This is a search for a general solution for any designer, not one tailored to non-native speakers. |
| ux ui ai workflow | no data | broader | This is a broader topic about the entire process of using AI in design, not just the specific problem of writing prompts. |
| best ai prompts design | no data | category | This is a search for the best general prompts for design, not specific to non-native speakers. |
| ai design prompt pricing | no data | category | This is a commercial query for general AI design prompts. |
| buy design ai prompts | no data | category | This is a commercial query for general AI design prompts. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S1.3 aiuxplayground.com — Design Prompts for Designers, PMs & AI Product Teams | broader | indirect | yes | This offers ready-made prompts for any designer, not specifically addressing the challenges of non-native speakers. |
| S1.4 designprompts.dev — Design Prompts - AI-Powered Design Style Explorer | broader | indirect | yes | This is a tool for any designer to explore design styles with AI, not focused on non-native speakers. |
| S1.8 styles.refero.design — Design Prompts for AI Agents | broader | indirect | yes | This offers advanced prompting techniques for any designer, not tailored to non-native speakers. |
| S1.11 designwithai.substack.com — 3 AI Prompts to Level Up Your Design Process | broader | indirect | yes | This offers prompt templates for any designer to improve efficiency, not specific to language issues. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand unknown · problem evidence moderate · competition crowded · changes supports/untested/untested. **After:** idea-level demand unknown · problem evidence unknown · competition some · 0d/4i · changes untested.

**What changed and why**

- untested: Scout said "The "Prompt Pack" Market is Proven and Profitable" → The evidence shows multiple websites offering libraries of design prompts, validating that there is a market for this type of resource for designers. (S1.3, S1.4)

**Remaining uncertainty**

- The core problem: whether non-native English speakers perceive their language skills as a significant barrier to getting good results from AI.
- Willingness to pay for a prompt kit when many free, general-purpose prompt resources for designers already exist.
- Whether the 'for non-native speakers' angle is a compelling enough differentiator to build a business on.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create a landing page for 'The AI Prompt Kit for Non-Native Designers.' Frame the problem as 'Stop getting generic results from AI. Write better prompts, even if English isn't your first language.' Collect email sign-ups for a waitlist. _(cost: ~$20 for a landing page tool + 10-15 hours, 1-2 weeks)_

**Continue if:** The landing page gets 50+ email sign-ups, indicating the specific positioning resonates with the target audience.

**Stop if:** The landing page gets fewer than 10 email sign-ups, suggesting the niche problem is not a strong enough hook.

---

## 9. The UX Writing Kit for Non-Native Designers
`2026-05-05` · [ideas/2026-05-05.md](../../../ideas/2026-05-05.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer who is now expected to write the copy for their own designs. They are confident in their visual skills but experience high anxiety and inefficiency when writing microcopy. This leads to vague button labels, confusing error messages, and a generic product voice, which ultimately hurts user experience and requires time-consuming revisions with…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers who are increasingly responsible for UX writing. Capturing 0.1% of this at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **UX Writing Hub Academy:** A comprehensive certification course priced at $1,440. This validates the high end of the market and proves…

**New search and competitor evidence** — United States · en (planner: The problem is specifically about writing English UI copy, and the target customer engages in English-speaking online communities like Reddit's r/uxwriting and r/UXDesign.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 1 directly relevant keyword(s) returned data (unknown, not zero). Category-level: some ("microcopy examples" 110/mo); broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "ux writing template" 10/mo; "microcopy examples" 110/mo; no data for 7 of 9
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. 1 keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty. No published offer prices were found on the fetched competitor pages.
- Competitors: 11 vendor-like or publisher domain(s) and 2 broad platform(s) (grafana.com, linkedin.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on grafana.com, localazy.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 6 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **unknown**
- Alternatives: Free Resource Lists _(indirect alternative)_ — Multiple articles and blogs list free resources, tools, and platforms for any UX writer to use. (S1.3, S1.9); Frontitude AI Writing Assistant _(indirect alternative)_ — A Figma plugin that acts as an AI writing assistant, delivering copy suggestions based on design elements. (S1.10); General Writing Tools (e.g., Hemingway) _(indirect alternative)_ — Tools that help writers simplify their writing by marking complex sentences and providing recommendations. (S1.3)

**Relevance of the evidence to this idea** — customer: A non-native English-speaking UX, UI, or product designer who is expected to write UI copy for their designs. · problem: Non-native English-speaking designers struggle to write clear, effective, and on-brand user interface copy, leading to anxiety and inefficiency.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| ux writing non native | no data | direct | This keyword explicitly combines the non-native speaker aspect with the task of UX writing. |
| struggle writing ui copy | no data | category | This describes the general problem of writing UI copy, which is not exclusive to non-native speakers. |
| how to write microcopy | no data | category | This is a general 'how-to' query for anyone learning to write microcopy. |
| ux writing template | 10 | category | This is a search for a general solution for any designer or writer, not one tailored to non-native speakers. |
| microcopy examples | 110 | category | This is a search for general examples, not specifically to help with the challenges of non-native speakers. |
| ui copy guide | no data | category | This is a search for a general guide for anyone writing UI copy. |
| ux writing toolkit | no data | category | This is a search for a general toolkit for any UX writer or designer. |
| best ux writing tools | no data | category | This is a search for the best general tools for UX writing. |
| microcopy guide price | no data | category | This is a commercial query for a general microcopy guide. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S1.3 medium.com — 10 free resources to add to your UX Writing toolbox | broader | indirect | yes | This is a list of free, general-purpose writing tools for any UX writer, not specific to non-native speakers. |
| S1.5 localazy.com — Top 22 essential tools & platforms for UX writers | broader | indirect | yes | This is a list of general tools for any UX writer, not specific to non-native speakers. |
| S1.10 write.frontitude.com — The AI writing assistant for design teams \| UX Writing Assistant ... | broader | indirect | yes | This is an AI assistant for any design team, which could help non-native speakers but is not specifically designed for them. |
| S1.9 uxplanet.org — The UX Writer's Starter Pack. A list of free (and affordable)… | broader | indirect | yes | This is a list of general learning resources for anyone wanting to become a UX writer. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand some ("microcopy examples" 110/mo) · problem evidence weak · competition some · changes weakens/untested/untested. **After:** idea-level demand unknown · problem evidence unknown · competition some · 0d/3i · changes untested.

**What changed and why**

- untested: Scout said "The Market for Design "Process" Kits is Validated" → Evidence shows search demand for terms like "microcopy examples" and "ux writing template", indicating that designers are actively looking for resources to help with this process. (K5, K4)

**Remaining uncertainty**

- The core problem: whether non-native English speakers see their language skills as a significant, unsolved pain point when writing UI copy.
- Willingness to pay for a kit when many free guides and AI writing assistants are available.
- Whether a template-based kit can effectively address the nuanced needs of writing good, on-brand microcopy.
- 7 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create a landing page for 'The UX Writing Kit for Non-Native Designers.' Frame the problem as 'Write clear, natural-sounding UI copy with confidence, even if English isn't your first language.' Collect email sign-ups for a waitlist. _(cost: ~$20 for a landing page tool + 10-15 hours, 1-2 weeks)_

**Continue if:** The landing page gets 50+ email sign-ups, indicating that the specific problem and solution resonates with the target audience.

**Stop if:** The landing page gets fewer than 10 email sign-ups, suggesting the problem is not a strong enough hook compared to existing free and AI-powered solutions.

---

## 10. The Design Critique Kit for Non-Native Designers
`2026-05-06` · [ideas/2026-05-06.md](../../../ideas/2026-05-06.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking product, UX, or UI designer working in a collaborative team. Presenting unfinished work and navigating group feedback is a major source of anxiety. They fear they will misunderstand feedback or that their own feedback will sound rude, simplistic, or grammatically incorrect. This anxiety can cause them to stay silent in meetings, which hurts their career growth, and leads to…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers who participate in regular design critiques. Capturing 0.1% of this market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Nielsen Norman Group Courses:** NN/g offers a self-paced course on "Design Critiques: Getting Actionable Feedback," validating that…

**New search and competitor evidence** — United States · en (planner: The target customers are non-native English speakers working in collaborative teams, and the US has a large tech industry with many such roles, making it a plausible primary market for English-language resources.)

- Search demand: **unknown** — Idea-level demand (directly relevant keywords only): unknown. None of the 2 directly relevant keyword(s) returned data (unknown, not zero). Category-level: low ("how to give design feedback" 10/mo); broader market: unknown — shown separately, not idea demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "how to give design feedback" 10/mo; no data for 8 of 9
- Commercial intent and payment: **weak** — No advertiser CPC was returned for the commercial keywords. No published offer prices were found on the fetched competitor pages.
- Competitors: 11 vendor-like or publisher domain(s) and 3 broad platform(s) (miro.com, figma.com, notion.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on miro.com, figma.com. Judged for relevance: 0 domain(s) with a direct competitor (same problem), 6 with an indirect alternative.
- Problem evidence (assessed, quote-checked): **unknown**
- Alternatives: Miro _(indirect alternative)_ — Offers a design critique template to create a structured environment for analyzing work. (S1.1); Figma _(indirect alternative)_ — Provides a community template for asynchronous design critiques. (S1.2); Notion _(indirect alternative)_ — Features a collection of design critique templates. (S1.6)

**Relevance of the evidence to this idea** — customer: A non-native English-speaking product, UX, or UI designer working in a collaborative team. · problem: Non-native English-speaking designers struggle to confidently participate in and lead design critiques, fearing miscommunication or sounding unprofessional.

| Keyword | Monthly searches | Relevance | Reason |
|---|---|---|---|
| non native english design critique | no data | direct | The keyword directly combines the customer's key trait (non-native English) with the specific problem area (design critique). |
| how to give design feedback | 10 | category | This is a general query for any designer giving feedback, not specific to the challenges faced by non-native speakers. |
| design critique anxiety | no data | category | This query is for any designer who feels anxious about critiques, a broader group than just non-native speakers. |
| design critique templates | no data | category | This is a search for a general solution (templates) for any designer, not one specifically for non-native speakers. |
| design feedback scripts | no data | category | This is a search for a general solution (scripts) for any designer, not one specifically for non-native speakers. |
| design communication guide | no data | category | This is a general query for any designer wanting to improve communication, not specific to the non-native speaker context. |
| design critique kit pricing | no data | direct | This keyword uses the specific name of the proposed solution ('design critique kit'), indicating a search for this exact product. |
| best design critique tools | no data | category | This is a search for general tools for design critiques, a broader category than the specific kit for non-native speakers. |
| buy design feedback templates | no data | category | This is a search for a general solution (templates) with purchase intent, but does not specify the non-native speaker context. |

| Cited item | Problem relevance | Competitor | Counted? | Reason |
|---|---|---|---|---|
| S1.1 miro.com — Design Critique Templates & Examples \| Miroverse | broader | indirect | yes | This is a general design critique template for any designer, not specifically for non-native English speakers. |
| S1.2 www.figma.com — Design critique template | broader | indirect | yes | This is a general design critique template for any designer, with a focus on async communication, not the non-native speaker's problem. |
| S1.6 www.notion.com — Top 9 Design Critique Templates | broader | indirect | yes | This is a collection of general design critique templates for any designer, not specific to non-native speakers. |
| S2.5 www.facebook.com — Design Critique Language: Using Specific Terms Instead of ... | broader | none | **no — removed** | This post addresses the general problem of using precise language in critiques, which is relevant but not exclusive to non-native speakers. |

**Before relevance checks** (_Before relevance checks — assessment run 34822795160 with validators f705529 (re-applied offline)_): search demand low ("how to give design feedback" 10/mo) · problem evidence weak · competition crowded · changes untested/supports. **After:** idea-level demand unknown · problem evidence unknown · competition unknown · 0d/3i · changes untested/supports.

**What changed and why**

- untested: Scout said "The "Productized Process" Market is Proven." → Search results show that major platforms like Miro, Figma, and Notion offer numerous templates for design critiques, validating the demand for this format. (S1.1, S1.2, S1.6)
- supports: Scout said "The wedge is the combination of a structured critique process (Figma templates) + a deep linguistic scaffold (Notion Phrase Bank)" → The evidence shows many indirect competitors offer structured templates, but none appear to offer the linguistic scaffold component for non-native speakers. (S1.1, S1.2)

**Remaining uncertainty**

- Whether non-native English-speaking designers perceive communication in critiques as a significant, painful problem.
- Whether this audience is willing to pay for a toolkit of templates and scripts to solve this problem.
- The actual demand for this specific solution, as direct keyword search volume is unknown.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 3 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Post a question on subreddits like r/UXDesign and r/product_design asking non-native English-speaking designers about their biggest challenges during design critiques. The goal is to gather qualitative evidence of the problem's existence and severity. _(cost: $0 + 2-3 hours, 3-5 days)_

**Continue if:** The post receives at least 10 detailed comments from self-identified non-native English-speaking designers confirming they struggle with anxiety, finding the right words, or fear of sounding unprofessional during critiques.

**Stop if:** The post receives few or no comments describing the specific problem, or comments indicate that existing resources (general English practice, team support) are sufficient.

