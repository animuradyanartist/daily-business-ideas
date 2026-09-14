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
- Written by gemini-2.5-pro → gemini-2.5-flash in GitHub Actions run 34822795160; validators re-applied offline to that run's stored model output at 2026-09-14T10:13:24.729Z.
- Every citation below carries a verbatim quote found in the cited item; that proves a claim is grounded, not that it is on-topic.

## Human review of live assessment run 34822795160

_Reviewed 2026-09-14. Every rejected, downgraded, dropped and removed item of the live run was compared with the cited evidence items and with Scout's memo; every surviving change statement, level and gap was then read for over-claims the validators do not catch. The live run used the validators at `d8745ee`; the fixes below were re-applied offline to that run's stored raw model output (no new model call)._

**Validator false positives in the live run (fixed):** 3
- `2026-04-28` removed sentence: "While the keyword \"linkedin content for non native\" has no search volume data, search results confirm …" → "no search volume data" now counts as describing the measurement ("has no search volume" is still a zero claim and still removed)
- `2026-04-29` removed sentence: "The keyword \"user interview language barrier\" has no search volume data." → same as above
- `2026-04-28` strength "Specialized tools exist that not only provide templates but also use AI …" downgraded observed → inference → "not only … but also" is no longer read as an absence claim

**Over-claims the live run's validators missed (rules added):** 2 pattern(s)
- a change marked "supports" for a validated / proven / profitable market, resting only on offerings existing (mostly free) (`2026-04-29`, `2026-05-01`, `2026-05-02`, `2026-05-04`, `2026-05-06`) → supporting a payment or validated-market claim now needs at least one cited published price; otherwise the effect becomes untested
- a change marked "supports" where Scout's claim is that something is absent ("lacks linguistic support", "but not the persuasive words", "does not communicate logic") (`2026-04-30`, `2026-05-02`, `2026-05-03`) → such a claim cannot be supported by quoted items; the effect becomes untested. A first, broader version of this rule also caught "the design is not clear" (a problem description) — narrowed before committing, and pinned by a test

**Not caught by any validator (read these assessments as noted):**
- `2026-04-29`: Problem evidence "strong" is grounded but likely off-topic: the cited items ("Interviewing someone with a language barrier", "Tips for communicating across a language barrier") are about researchers interviewing participants who speak another language, not about non-native researchers moderating in English. The change statement repeats this ("strongly validating its existence").
- `2026-05-03`: Problem evidence "strong" is general design-handoff pain; nothing cited is about the idea's non-native-speaker angle.
- `2026-04-27`: Change "a swipe file is a learning artifact you keep" → supports: the finding (competitors are free blog posts or subscriptions) does not bear on that claim; the "gap for a one-time purchase" is inference. Problem evidence also cites an academic-publishing item (S2.2) that is not about async workplace communication.
- `2026-05-06`: Change about the wedge → supports rests on no search result showing a linguistic scaffold (absence in the finding); read it as inference.
- All ideas: Gaps are correctly labelled inference, but most say competitors "do not appear to" offer the non-native angle — a statement about what was not seen in 2 queries, not market research.

---

## 1. Async English — Slack and PR-comment swipe file for non-native software professionals
`2026-04-27` · [ideas/2026-04-27.md](../../../ideas/2026-04-27.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): Buyer: a non-native English-speaking software professional (engineer, PM, designer) working remote/hybrid for a US, UK, or pan-EU company. Most likely Indian, Polish, Brazilian, Turkish, French, Spanish, or Ukrainian. They read and listen to English fine but freeze when typing async — they over-hedge, sound rude by accident, get talked over in standups. Real pain in their words: - Talaera's blog on virtual…
- Size claim (Scout): Napkin TAM: ~30M non-native English speakers working in tech globally (rough — H1B SWE alone is >100k just in US queues, plus EU remote talent and offshore teams). If 0.05% buy a $39 product: 15,000 × $39 = $585k ceiling. Reachable serviceable market for a solo creator is the slice that lives in the named Reddit/LinkedIn/Discord communities — call that 200,000–500,000 people one or two hops from organic…

**New search and competitor evidence** — United States · en (planner: The target customers often work for US-based companies or in US-centric tech environments, and the problem is about professional English communication in that context.)

- Search demand: **low** — Largest single keyword: "business english phrases" at 30/month. 6 keyword(s) returned no data (unknown, not zero). Low measured volume is not evidence of low demand for B2B, regulated or emerging problems, where buyers often do not search. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "how to write professional english" 10/mo; "business english phrases" 30/mo; "english for software engineers" 20/mo; no data for 6 of 9
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Published offer prices seen on 1 ranking site(s): oxfordlanguageclub.com. Prices show what sellers ask, not verified sales, and a ranking site is not necessarily a direct competitor.
- Competitors: 12 vendor-like or publisher domain(s) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on oxfordlanguageclub.com.
- Problem evidence (assessed, quote-checked): **moderate** — The evidence shows that non-native English speakers can face challenges in professional communication, including higher cognitive load (S2.9), difficulty communicating without a script (S2.11), and rejection of written work in academic settings (S2.2). People in forums discuss struggling with fluency and panicking during meetings (S2.6). (S2.9, S2.11, S2.6, S2.2)
- Alternatives: Oxford Language Club — Offers lists of business English phrases and paid online courses with monthly or yearly subscriptions. (S1.2, P2)

**What changed and why**

- supports: Scout said "a swipe file is a learning artifact you keep" → Competitors in search results for "business english phrases" are primarily free blog posts or subscription courses. This suggests a potential gap for a one-time purchase, structured resource. (S1.3, P2)

**Remaining uncertainty**

- Whether software professionals will pay for a curated swipe file when many free, generic lists of business phrases exist.
- Whether the communication pain is specifically acute in asynchronous contexts like Slack and PR reviews, as opposed to general meetings and emails.
- The ability of a solo founder to effectively reach and build trust with this audience in their online communities.
- 6 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 0 downgrade(s), 2 dropped claim(s).
- Reviewer note: Change "a swipe file is a learning artifact you keep" → supports: the finding (competitors are free blog posts or subscriptions) does not bear on that claim; the "gap for a one-time purchase" is inference. Problem evidence also cites an academic-publishing item (S2.2) that is not about async workplace communication.

**Cheapest useful validation experiment:** Create a free PDF lead magnet, "10 Native-Sounding Phrases for Better Code Reviews," and promote it in relevant subreddits (e.g., r/ExperiencedDevs) and on LinkedIn. Measure downloads and email opt-ins. _(cost: ~$0 cash, 10-15 hours time, 2 weeks)_

**Continue if:** The lead magnet achieves over 100 downloads and an email opt-in rate of 20% or higher from the target audience.

**Stop if:** The lead magnet receives fewer than 20 downloads or the opt-in rate is below 5%, indicating low interest or an inability to reach the target audience.

---

## 2. LinkedIn-Native — Canva carousel pack plus native-sounding caption swipes for non-native solo designers
`2026-04-28` · [ideas/2026-04-28.md](../../../ideas/2026-04-28.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): Buyer: a non-native English-speaking solo designer, illustrator, or freelance creative (graphic / UX / product / brand) based in EU, LatAm, India, MENA, SEA, who wants to win remote clients or build personal brand on LinkedIn. They are visually fluent — they make beautiful work — but freeze when typing English captions. They open Canva, design a gorgeous carousel, then either don't post it, post a stilted caption…
- Size claim (Scout): Napkin TAM: ~10M non-native English-speaking creative professionals on LinkedIn globally (LinkedIn has ~1B users; ~10% creative + non-native is conservative). At 0.05% conversion to a $39 product: 5,000 × $39 = $195k ceiling. Reachable serviceable market for a solo founder is the slice one or two hops from organic distribution — call that 100k-300k creators in the named subreddits, LinkedIn groups, and design…

**New search and competitor evidence** — United States · en (planner: The product is sold on Gumroad, targets remote clients, and the US is a large market for digital products and freelance services, making it a primary search location for such solutions.)

- Search demand: **some** — Largest single keyword: "how to write linkedin posts" at 320/month. 5 keyword(s) returned no data (unknown, not zero). Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "how to write linkedin posts" 320/mo; "linkedin carousel templates" 110/mo, CPC $1.80; "linkedin content templates" 10/mo; "linkedin caption generator" 50/mo; no data for 5 of 9
- Commercial intent and payment: **moderate** — Advertisers bid on 1 commercial keyword(s) (highest CPC $1.80 on "linkedin carousel templates"). CPC is an advertiser bid, not a customer's willingness to pay. 1 keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty. Broad platforms with their own pricing also rank (figma.com); that is not evidence buyers pay for this idea.
- Competitors: 5 vendor-like or publisher domain(s) and 4 broad platform(s) (linkedin.com, canva.com, adobe.com, figma.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on figma.com.
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that non-native speakers on LinkedIn actively consider which language to post their content in (S2.7). It also shows that complex language can be a barrier for them (S2.2), and that there is demand for learning resources like online classes on writing business emails for this audience (S2.11). (S2.7, S2.2, S2.11)
- Alternatives: Canva — A major design platform offering over 1,200 free and paid LinkedIn carousel templates. (S1.1); Adobe Express — A design tool from Adobe offering a collection of free, editable LinkedIn carousel post templates. (S1.2); Contentdrips.com — A specialized tool offering over 500 free LinkedIn carousel templates with an AI feature to fill in content. (S1.9)

**What changed and why**

- supports: Scout said "non-natives carry that anxiety twice over because tone calibration is harder" → While the keyword "linkedin content for non native" has no search volume data, search results confirm that non-native speakers on LinkedIn think about their language choices and that language can be a barrier. (K1, S2.7, S2.2)
- supports: Scout said "Editable templates are eating static PDFs in 2026" → The keyword "linkedin carousel templates" has a search volume of 110/month and high ad competition. Search results are dominated by platforms like Canva, Adobe, and Figma that offer editable templates. (K4, S1.1, S1.2)

**Remaining uncertainty**

- Whether designers will pay for templates when thousands of high-quality free options are available from platforms they already use.
- Whether the 'native-sounding caption' component is a strong enough differentiator to overcome the free competition for the visual templates.
- Whether the pain of writing captions is acute enough to motivate a purchase, versus using free AI tools or simply writing shorter captions.
- 5 of 9 planned keywords returned no search data (unknown, not zero).

**Cheapest useful validation experiment:** Create a free 'mini-kit' with 3 Canva carousel templates and 5 'native-sounding' caption hooks for designers. Promote it in relevant communities and measure downloads, then survey downloaders to ask which part was more valuable. _(cost: ~$0 cash, 15-20 hours time, 2 weeks)_

**Continue if:** The kit gets over 100 downloads and qualitative feedback from a follow-up survey indicates that the caption swipes were significantly more valuable than the visual templates.

**Stop if:** Downloads are low, or feedback shows users were only interested in the free visual templates and saw little value in the captions.

---

## 3. The UX Research Kit for Non-Native UX Designers
`2026-04-29` · [ideas/2026-04-29.md](../../../ideas/2026-04-29.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX designer or researcher, likely from Europe, Asia, or Latin America, working for a US/UK company or serving English-speaking clients. They are skilled in design and research methodology but lack confidence in their linguistic ability to conduct nuanced user interviews and present findings persuasively to native-speaking stakeholders. Real pain in their words: *   A user…
- Size claim (Scout): Napkin TAM: The global User Experience (UX) Research Software Market is projected to reach ~$525 million in 2026 and grow at a CAGR of over 17%. While this product isn't software, it serves the practitioners driving that market. With millions of UX professionals globally, a conservative estimate of 100,000 non-native English speakers in this role is reasonable. Capturing 0.2% of this niche at $39 yields a $78k…

**New search and competitor evidence** — United States · en (planner: The target customers often work for US/UK companies or serve English-speaking clients, and the problem examples are from English-speaking forums, making the US market the most direct fit for search intent.)

- Search demand: **low** — Largest single keyword: "ux research templates" at 50/month. 8 keyword(s) returned no data (unknown, not zero). Low measured volume is not evidence of low demand for B2B, regulated or emerging problems, where buyers often do not search. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "ux research templates" 50/mo; no data for 8 of 9
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Broad platforms with their own pricing also rank (notion.com, figma.com); that is not evidence buyers pay for this idea.
- Competitors: 6 vendor-like or publisher domain(s) and 3 broad platform(s) (notion.com, figma.com, airtable.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on notion.com, figma.com.
- Problem evidence (assessed, quote-checked): **strong** — Multiple articles and blog posts directly address the topic of 'UX research and language barriers' (S2.6, S2.10). People post in forums seeking help for conducting interviews when there is a language barrier (S2.2). The problem is significant enough to be the subject of user research studies itself (S2.9). (S2.6, S2.2, S2.9, S2.10)
- Alternatives: Nielsen Norman Group (NN/g) — A highly respected UX research firm that provides a curated set of free templates and guides for UX activities. (S1.3); Template Marketplaces (Notion, Figma) — Major platforms where the community and the companies themselves offer numerous free and paid templates for user research. (S1.4, S1.5); Content Hubs (UserInterviews.com) — Companies in the UX space that provide free templates and examples as part of their content marketing. (S1.6)

**What changed and why**

- supports: Scout said "non-native speaker, i have little confidence in my communication ability" → The keyword "user interview language barrier" has no search volume data. However, the search results for this query are filled with articles, blog posts, and forum discussions specifically about this problem, strongly validating its existence. (K1, S2.6, S2.2)
- untested: Scout said "The market for productized UX templates is validated." → The keyword "ux research templates" has a search volume of 50/month. Search results show that major platforms like Notion and Figma have dedicated categories and communities for these templates, and industry leaders like NN/g provide them. (K4, S1.4, S1.3)

**Remaining uncertainty**

- Whether non-native UX designers will pay for a kit focused on language when so many high-quality free templates for the research process already exist.
- If the linguistic swipe-file component is valuable enough on its own to drive a purchase.
- Whether the provided phrases can offer more value than what a user could get from a modern AI writing assistant for free.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 0 dropped claim(s).
- Reviewer note: Problem evidence "strong" is grounded but likely off-topic: the cited items ("Interviewing someone with a language barrier", "Tips for communicating across a language barrier") are about researchers interviewing participants who speak another language, not about non-native researchers moderating in English. The change statement repeats this ("strongly validating its existence").

**Cheapest useful validation experiment:** Create a free PDF guide: "5 Probing Questions to Use in User Interviews (for Non-Native English Speakers)" that includes the phrases and explains the nuance. Promote it in r/UXResearch and on LinkedIn to measure interest. _(cost: ~$0 cash, 10-15 hours time, 2 weeks)_

**Continue if:** The guide is downloaded over 100 times with an email opt-in rate of 20% or more, with some qualitative feedback indicating the language-specific advice was the main draw.

**Stop if:** The guide gets fewer than 20 downloads or the opt-in rate is below 5%, suggesting the linguistic angle does not resonate strongly with the target audience.

---

## 4. The Design Presentation Kit for Non-Native UX/Product Designers
`2026-04-30` · [ideas/2026-04-30.md](../../../ideas/2026-04-30.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer working in a remote or international team where English is the primary language. They are technically and visually skilled but experience high anxiety when they need to present their work, defend their decisions, or handle critical feedback from native-speaking stakeholders. Real pain in their words: *   A designer on Medium describes the…
- Size claim (Scout): Napkin TAM: There are an estimated 1 million+ UX/product designers globally. Conservatively, 15-20% are non-native English speakers in professional roles. This creates a target market of 150,000+ designers. Capturing 0.1% of this niche at $39 yields a $58.5k ceiling. Comparables with revenue or proxy revenue: *   **Katya Kovalenko's "The Grid Deck Template" on Gumroad:** A Figma presentation template with 183…

**New search and competitor evidence** — United States · en (planner: The target customer is a non-native English speaker working in an English-speaking professional environment, and the US is a major hub for tech and design jobs where English proficiency in presentations is critical.)

- Search demand: **some** — Largest single keyword: "design presentation templates" at 320/month. 7 keyword(s) returned no data (unknown, not zero). Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "design presentation templates" 320/mo, CPC $2.97; "design communication course" 20/mo, CPC $12.03; no data for 7 of 9
- Commercial intent and payment: **moderate** — Advertisers bid on 2 commercial keyword(s) (highest CPC $12.03 on "design communication course"). CPC is an advertiser bid, not a customer's willingness to pay. 2 keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty. No published offer prices were found on the fetched competitor pages.
- Competitors: 8 vendor-like or publisher domain(s) and 3 broad platform(s) (adobe.com, canva.com, figma.com) rank across 2 queries (not all are competitors — some are consultants or publishers).
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that designers experience a general "fear of presenting designs" (S2.2) and "presentation anxiety" (S2.5, S2.9). (S2.2, S2.5, S2.9)
- Alternatives: Adobe Express — Offers hundreds of free presentation templates with customizable layouts, colors, and fonts, downloadable as PowerPoint or PDF files. (P1); SlidesCarnival — Provides a collection of professionally-designed, free PowerPoint and Google Slides templates. (P3); Figma Community — A platform with over 3,400 free, fully customizable presentation templates and slides. (S1.6)

**What changed and why**

- supports: Scout said "high anxiety when they need to present their work" → Search results confirm a general problem of "presentation anxiety" (S2.9) and a "fear of presenting designs" (S2.2) among designers. (S2.2, S2.9)
- supports: Scout said "The template market is mature" → The search results for "design presentation templates" are dominated by major platforms like Adobe, SlidesCarnival, Canva, and Figma, all offering a large number of free templates. (S1.1, S1.2, S1.6)
- untested: Scout said "lacks linguistic support" → Competitors' descriptions focus on visual customization, such as "Customize layouts, colors, and fonts" (P1), with no mention of scripts, narrative help, or specific support for non-native speakers. (P1)

**Remaining uncertainty**

- That non-native English-speaking designers perceive their language barrier, rather than general public speaking anxiety, as the primary problem.
- That this audience is willing to pay for a combined template-and-script kit instead of using free visual templates and developing their own scripts.
- That this specific niche audience can be reached effectively and affordably.
- 7 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 0 dropped claim(s).

**Cheapest useful validation experiment:** Create the free lead magnet described in the plan: "The 5-Slide Template & Script to Justify One Design Decision." Promote it in online communities where non-native designers are active (e.g., ADPList, specific LinkedIn groups, subreddits) and measure downloads and email sign-ups. _(cost: $0 + 10-15 hours of design and writing time., 2 weeks)_

**Continue if:** The lead magnet is downloaded over 100 times with an email opt-in rate of 25% or higher.

**Stop if:** The lead magnet is downloaded fewer than 20 times, or the opt-in rate is below 10%.

---

## 5. The Client Communication Kit for Non-Native Freelance Designers
`2026-05-01` · [ideas/2026-05-01.md](../../../ideas/2026-05-01.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking freelance designer (UX, UI, brand, graphic) who has secured an English-speaking client but now faces the anxiety of day-to-day communication. Their design skills are strong, but their confidence in written English is not, leading to hours wasted drafting emails, misunderstandings about deliverables, and an inability to push back on scope creep, which directly costs them…
- Size claim (Scout): Napkin TAM: There are an estimated 1.57 billion freelancers worldwide. A conservative estimate of 1 million+ non-native English-speaking freelance designers is reasonable. Capturing just 0.1% of a 200,000-person serviceable market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Etsy Template Shops:** Sellers like "LunaSoulDesign" offer a "Designer Essentials Kit" of client onboarding…

**New search and competitor evidence** — India · en (planner: India has a large population of non-native English-speaking freelancers who serve global clients and would search for solutions in English.)

- Search demand: **unknown** — No search volume was returned for 9 keyword(s). Unknown is not zero demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Published offer prices seen on 1 ranking site(s): agencyhandy.com. Prices show what sellers ask, not verified sales, and a ranking site is not necessarily a direct competitor.
- Competitors: 10 vendor-like or publisher domain(s) and 4 broad platform(s) (coursera.org, notion.com, linkedin.com, udemy.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on agencyhandy.com.
- Problem evidence (assessed, quote-checked): **moderate** — Academic research suggests non-native English speakers may experience a "higher cognitive load" in business communication (S2.3). The existence of a "Business English for Non-Native Speakers Specialization" on Coursera (S2.5) and content on tactics for this group (S2.8) indicates a recognized need for communication support. (S2.3, S2.5, S2.8)
- Alternatives: Agency Handy — Offers client communication templates as part of a broader agency management platform with features like a client portal and task management, sold as a monthly subscription or lifetime deal. (P1, P2); TiqueHQ — Sells "plug-and-play client communication templates for travel agents," indicating a market for niche-specific communication tools. (S1.4); Notion — The Notion template gallery includes a "Client Communication Bundle Template" covering several types of client emails. (S1.8)

**What changed and why**

- untested: Scout said "The "Productized Template" Market is Validated" → Search results show multiple vendors selling "Client Communication Templates" (S1.2, S1.4) and bundles on platforms like Notion (S1.8), confirming a market for this type of product. (S1.2, S1.4, S1.8)

**Remaining uncertainty**

- That non-native freelance *designers* see written client communication as a primary pain point they are willing to pay to solve.
- Whether a template and script kit is the preferred solution over a course, coaching, or using AI writing assistants.
- The effectiveness of reaching this target audience in the specified market of India.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 2 dropped claim(s).

**Cheapest useful validation experiment:** Create a simple landing page for "The Client Communication Kit for Non-Native Freelancers." Clearly state the value proposition (e.g., "Write client emails with confidence, even if English isn't your first language"). Drive traffic via a small, targeted ad campaign on a platform like LinkedIn or Facebook, targeting freelance designers in India, and measure email sign-ups for a waitlist/pre-order notification. _(cost: $100 in ad spend + 8 hours for landing page creation., 1 week)_

**Continue if:** The campaign generates 50+ email sign-ups from the target audience.

**Stop if:** The campaign generates fewer than 10 email sign-ups from the target audience.

---

## 6. The Portfolio Case Study Kit for Non-Native Designers
`2026-05-02` · [ideas/2026-05-02.md](../../../ideas/2026-05-02.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer trying to get hired or win freelance clients. They are visually proficient but struggle to write the narrative of their case studies. This is a high-stakes problem; a portfolio with strong visuals but a weak, confusing, or grammatically awkward story fails to convince hiring managers and costs them opportunities. Real pain in their words: *   On…
- Size claim (Scout): Napkin TAM: There are millions of UX/UI designers globally. A conservative estimate of 200,000+ non-native English-speaking designers actively maintaining a portfolio is reasonable. Capturing 0.1% of this market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Etsy Template Sellers:** Shops selling Canva portfolio templates often have 1,000+ sales, indicating a large volume of buyers…

**New search and competitor evidence** — United States · en (planner: The target audience is non-native English speakers globally, and the US market represents a large segment of the design industry where English proficiency in portfolios is critical.)

- Search demand: **unknown** — No search volume was returned for 9 keyword(s). Unknown is not zero demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Broad platforms with their own pricing also rank (figma.com); that is not evidence buyers pay for this idea.
- Competitors: 7 vendor-like or publisher domain(s) and 4 broad platform(s) (figma.com, adobe.com, canva.com, linkedin.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on figma.com.
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that writing case studies is a significant pain point for designers in general, described as potentially the "most dreaded part" of creating a portfolio (S2.6). Designers actively seek strategies for the writing process (S2.3). (S2.6, S2.3)
- Alternatives: Figma Community — Offers over 15 free case study templates to help designers display projects and research in an organized format. (S1.1, P5); UXfol.io — A blog that provides a detailed guide and template for structuring a UX case study, explaining what to include and how to format the story. (S1.2, P1); Adobe Express — Provides editable and free case study templates that can be customized online in minutes. (S1.3)

**What changed and why**

- untested: Scout said "The "Artifact" Market is Validated" → Major design platforms including Figma (S1.1), Adobe (S1.3), and Canva (S1.7) all offer free case study templates, validating the market for the visual artifact. (S1.1, S1.3)
- untested: Scout said "they provide the visual container but not the persuasive words" → Competitors offer "templates" (S1.1) and guidance on "structure" (S1.2), focusing on format and sections. Their descriptions do not mention providing actual scripts or phrases to use. (S1.1, S1.2)

**Remaining uncertainty**

- That the primary barrier for non-native designers in writing case studies is linguistic (finding the right words) rather than the universal challenge of structuring a compelling story.
- That this audience would pay for a script kit instead of using the many free templates and guides in combination with free AI/grammar tools.
- That a kit of templates and scripts is the most desired solution format.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 2 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create the free lead magnet: "The 1-Page Case Study Outline & 10 Essential English Phrases for Non-Native Designers." Promote it with a detailed blog post or Twitter thread on the topic. Measure downloads and email sign-ups to gauge interest from the specific target audience. _(cost: $0 + 10-15 hours of writing and design time., 2 weeks)_

**Continue if:** The lead magnet is downloaded over 100 times and the content receives significant engagement (e.g., shares, comments) from people who identify as non-native English-speaking designers.

**Stop if:** The lead magnet is downloaded fewer than 20 times and receives little to no engagement from the target audience.

---

## 7. The Figma Handoff Kit for Non-Native Designers
`2026-05-03` · [ideas/2026-05-03.md](../../../ideas/2026-05-03.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking product, UX, or UI designer working on a software team. Their visual designs are clean, but their written specifications for developers are a major source of anxiety and inefficiency. Miscommunication leads to developers building the wrong thing, which causes delays, rework, and damages the designer's credibility. This is a direct, operational pain point that costs the…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers working with developers. This is the core market. Capturing 0.1% of this at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Untitled UI on Gumroad:** Sells a massive Figma UI kit and design system for $129, with thousands of customers, indicating a high…

**New search and competitor evidence** — United States · en (planner: The United States has a large tech industry with many non-native English-speaking designers who need to communicate effectively with developers.)

- Search demand: **low** — Largest single keyword: "best design handoff tools" at 10/month. 8 keyword(s) returned no data (unknown, not zero). Low measured volume is not evidence of low demand for B2B, regulated or emerging problems, where buyers often do not search. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "best design handoff tools" 10/mo; no data for 8 of 9
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Broad platforms with their own pricing also rank (uxpin.com, miro.com); that is not evidence buyers pay for this idea.
- Competitors: 5 vendor-like or publisher domain(s) and 3 broad platform(s) (uxpin.com, miro.com, figma.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on uxpin.com, miro.com.
- Problem evidence (assessed, quote-checked): **strong** — Multiple sources state that poor design handoffs lead to problems like misinterpretation by developers, misaligned expectations, errors, delays, miscommunication, and a lack of clarity. Handoffs fail when they only cover visual aspects ('pixels') and neglect behavior, edge cases, and logic. (S2.3, S2.4, S2.7, S2.8, S2.6)
- Alternatives: Figma — A design and prototyping tool with a built-in design handoff feature. (S1.2); UXPin — An AI-powered prototyping tool. (P2); Miro — A collaborative whiteboard platform used for documenting logic and processes alongside designs. (S1.4); Zeplin — A popular tool for design handoff and collaboration between designers and engineers. (S1.3)

**What changed and why**

- supports: Scout said "The biggest problem I face is when I hand-off my design to the developers... they say that the design is not clear" → Multiple search results confirm that lack of clarity, miscommunication, and misinterpretation are core problems in design handoff. (S2.8, S2.7)
- weakens: Scout said "The "Productized Handoff" Market is Validated." → The market for design handoff *tools* is validated and crowded with major software platforms like Figma, Zeplin, and Miro. The market for productized *templates* or *kits* for handoff is not directly observed in the evidence. (S1.3, S1.2)
- untested: Scout said "Figma's Dev Mode... does not communicate logic, intent, or behavior." → Evidence suggests that effective handoff requires documenting more than just visual properties, including behavior, edge cases, and logic, which supports the idea that a tool focused only on visual specs is insufficient. (S2.6)

**Remaining uncertainty**

- Whether non-native English-speaking designers perceive their language skills as a primary barrier in design handoffs.
- If this specific group feels existing tools are insufficient for their needs.
- Whether designers are willing to pay for a template-based kit rather than using free resources or improving their own documentation skills.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 2 downgrade(s), 0 dropped claim(s).
- Reviewer note: Problem evidence "strong" is general design-handoff pain; nothing cited is about the idea's non-native-speaker angle.

**Cheapest useful validation experiment:** Create a landing page for "The Ultimate Handoff Checklist for Non-Native Designers." Offer a free 1-page PDF checklist in exchange for an email address. Promote it in relevant online design communities. _(cost: $50 for landing page tool + 10 hours, 2 weeks)_

**Continue if:** The landing page achieves a 5% or higher email conversion rate from relevant traffic.

**Stop if:** The landing page achieves less than a 1% email conversion rate, suggesting the specific pain point does not resonate.

---

## 8. The AI Prompt Kit for Non-Native Designers
`2026-05-04` · [ideas/2026-05-04.md](../../../ideas/2026-05-04.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer. They know AI is a critical skill for their career in 2026, but struggle to get useful outputs from generative tools. Their prompts are too simple, leading to generic results that require heavy editing, defeating the purpose of using AI. This problem is amplified by the language barrier, making it difficult to write the nuanced, context-rich…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers who are now required to integrate AI into their workflow. Capturing just 0.1% of this market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **AI Prompt Packs on Gumroad/YouTube:** Creators are successfully selling prompt packs and building entire business…

**New search and competitor evidence** — United States · en (planner: The product targets a global audience of non-native English speakers, and the United States is a primary market for digital products and tech-related services in English.)

- Search demand: **unknown** — No search volume was returned for 9 keyword(s). Unknown is not zero demand. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Broad platforms with their own pricing also rank (figma.com); that is not evidence buyers pay for this idea.
- Competitors: 9 vendor-like or publisher domain(s) and 2 broad platform(s) (figma.com, adobe.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on figma.com.
- Problem evidence (assessed, quote-checked): **moderate** — Multiple sources indicate that getting good output from AI design tools requires effort and skill. Better results come from writing detailed briefs, using precise keywords and references, and structuring prompts with elements like clarity, context, and specificity. (S2.2, S2.4, S1.7, S2.11)
- Alternatives: AI UX Playground — A site offering over 210 design prompts for various AI tools, covering UX research, visual design, branding, and more. (P3); DesignPrompts.dev — A site that allows users to explore design styles and get AI-ready prompts to recreate them. (S1.4); Figma / Adobe — Major design platforms that provide their own articles, resources, and guidance on writing effective AI prompts. (S2.2, S1.5); Free blog posts and newsletters — Numerous online publications and newsletters offer free lists and templates for AI prompts for designers. (S1.10, S1.11)

**What changed and why**

- supports: Scout said "AI produces "sameness," and designers need to learn how to direct it" → The evidence supports this, showing that getting better, more specific output requires skill in writing detailed, structured, and precise prompts. (S2.4, S2.11)
- untested: Scout said "The "Prompt Pack" Market is Proven and Profitable." → The search results show a crowded market of free and dedicated sites offering AI prompts for designers, which validates that there is a market for this type of content. Profitability is not directly evidenced. (S1.3, S1.4)
- untested: Scout said "This problem is amplified by the language barrier" → No evidence was found that mentions language barriers or non-native speakers in the context of writing AI prompts.

**Remaining uncertainty**

- Whether non-native English speakers perceive their language skills as a significant disadvantage when writing AI prompts.
- If designers are willing to pay for a curated prompt kit instead of using the numerous free alternatives.
- Whether the provided prompts actually lead to measurably better outcomes for the target user.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 0 dropped claim(s).

**Cheapest useful validation experiment:** Create a landing page for a free download: "5 ChatGPT Prompts for Non-Generic UI Mockups (For Non-Native English Speakers)." Promote the page in relevant design communities and measure email sign-ups. _(cost: $50 for landing page tool + 10 hours, 2 weeks)_

**Continue if:** The landing page achieves a 5% or higher email conversion rate from relevant traffic, with a specific focus on the "non-native speaker" angle in the copy.

**Stop if:** The landing page achieves less than a 1% email conversion rate, indicating the specific value proposition is not compelling.

---

## 9. The UX Writing Kit for Non-Native Designers
`2026-05-05` · [ideas/2026-05-05.md](../../../ideas/2026-05-05.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking UX, UI, or product designer who is now expected to write the copy for their own designs. They are confident in their visual skills but experience high anxiety and inefficiency when writing microcopy. This leads to vague button labels, confusing error messages, and a generic product voice, which ultimately hurts user experience and requires time-consuming revisions with…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers who are increasingly responsible for UX writing. Capturing 0.1% of this at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **UX Writing Hub Academy:** A comprehensive certification course priced at $1,440. This validates the high end of the market and proves…

**New search and competitor evidence** — United States · en (planner: The problem is specifically about writing English UI copy, and the target customer engages in English-speaking online communities like Reddit's r/uxwriting and r/UXDesign.)

- Search demand: **some** — Largest single keyword: "microcopy examples" at 110/month. 7 keyword(s) returned no data (unknown, not zero). Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "ux writing template" 10/mo; "microcopy examples" 110/mo; no data for 7 of 9
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. 1 keyword(s) show medium/high Google Ads competition — auction pressure, not SEO difficulty. Published offer prices seen on 1 ranking site(s): localazy.com. Prices show what sellers ask, not verified sales, and a ranking site is not necessarily a direct competitor. Broad platforms with their own pricing also rank (grafana.com); that is not evidence buyers pay for this idea.
- Competitors: 11 vendor-like or publisher domain(s) and 2 broad platform(s) (grafana.com, linkedin.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on grafana.com, localazy.com.
- Problem evidence (assessed, quote-checked): **weak** — A Reddit post shows a designer asking for advice on how to write good copy. An article states that writing copy can be the toughest job for a Product Manager. (S2.2, S2.8)
- Alternatives: AI Writing Assistants (e.g., Frontitude) — A Figma plugin that uses AI to suggest copy based on design elements, considering character limits. (S1.10); Free Guides and Tool Lists — Numerous blog posts and articles list free resources, tools, and best practices for UX writing. (S1.3, S1.9); Corporate Writers' Toolkits (e.g., Grafana) — Publicly available documentation from companies that provides guidelines on UI text, style, and tone. (S1.2)

**What changed and why**

- weakens: Scout said "I'm a designer who's been tasked with all the UX writing on a new project and I feel so out of my depth." → The evidence weakly supports this; one search result is a Reddit post from a designer asking "how do you write a good copy?" Another notes that writing copy is the "toughest job" for a PM, which is a related role. (S2.2, S2.8)
- untested: Scout said "The Rise of the "Full-Stack" Designer." → The evidence does not directly confirm or deny that designers are increasingly expected to write copy. It does show designers seeking help with copy, which is consistent with the premise. (S2.2)
- untested: Scout said "The market for design "process" kits is validated." → The evidence shows demand for "microcopy examples" (110 searches/month) and "ux writing template" (10 searches/month), which supports interest in artifacts and templates for UX writing. (K5, K4)

**Remaining uncertainty**

- Whether non-native English-speaking designers feel significant anxiety or inefficiency specifically around UX writing.
- If this target audience would pay for a template kit rather than using free resources, AI tools, or asking a native-speaking colleague for help.
- The extent to which designers, rather than dedicated writers or PMs, are responsible for final UI copy.
- 7 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 0 dropped claim(s).

**Cheapest useful validation experiment:** Create a landing page offering a free lead magnet: "The Empty State Copy Kit," a small Figma file with 5 components and a Notion doc with 10+ copy formulas. Promote it in r/UXDesign and r/uxwriting to measure interest. _(cost: $50 for landing page tool + 10 hours, 2 weeks)_

**Continue if:** The landing page achieves a 5% or higher email conversion rate from relevant traffic.

**Stop if:** The landing page achieves less than a 1% email conversion rate, suggesting the problem is not painful enough or the solution is not desirable.

---

## 10. The Design Critique Kit for Non-Native Designers
`2026-05-06` · [ideas/2026-05-06.md](../../../ideas/2026-05-06.md) · status: enriched

**Original assessment (Scout, unchanged)**

- Conviction: high · no numeric score in this memo format
- Who pays (Scout): The buyer is a non-native English-speaking product, UX, or UI designer working in a collaborative team. Presenting unfinished work and navigating group feedback is a major source of anxiety. They fear they will misunderstand feedback or that their own feedback will sound rude, simplistic, or grammatically incorrect. This anxiety can cause them to stay silent in meetings, which hurts their career growth, and leads to…
- Size claim (Scout): Napkin TAM: There are over 1 million product designers globally. A conservative estimate of 200,000 are non-native English speakers who participate in regular design critiques. Capturing 0.1% of this market at $39 yields a $78k ceiling. Comparables with revenue or proxy revenue: *   **Nielsen Norman Group Courses:** NN/g offers a self-paced course on "Design Critiques: Getting Actionable Feedback," validating that…

**New search and competitor evidence** — United States · en (planner: The target customers are non-native English speakers working in collaborative teams, and the US has a large tech industry with many such roles, making it a plausible primary market for English-language resources.)

- Search demand: **low** — Largest single keyword: "how to give design feedback" at 10/month. 8 keyword(s) returned no data (unknown, not zero). Low measured volume is not evidence of low demand for B2B, regulated or emerging problems, where buyers often do not search. Volumes are separate, overlapping keywords and are not added together. Searches are not customers.
- Measured keywords: "how to give design feedback" 10/mo; no data for 8 of 9
- Commercial intent and payment: **moderate** — No advertiser CPC was returned for the commercial keywords. Broad platforms with their own pricing also rank (miro.com, figma.com); that is not evidence buyers pay for this idea.
- Competitors: 11 vendor-like or publisher domain(s) and 3 broad platform(s) (miro.com, figma.com, notion.com) rank across 2 queries (not all are competitors — some are consultants or publishers); published offer prices on miro.com, figma.com.
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that design critiques are seen as a process that benefits from a 'safe, structured environment' (S1.1). There are public discussions about using more specific and effective language when giving design feedback (S2.5). (S1.1, S2.5)
- Alternatives: Miro — Offers a 'Design Critique template' to create a 'safe, structured environment'. (S1.1); Figma — Provides a 'Design critique template' with an 'Async format' intended to create a 'more inclusive critique'. (S1.2); Notion — Features a collection of 'Top 9 Design Critique Templates'. (S1.6); NNGroup — Publishes articles and guidance on how to conduct design critiques to improve products. (S1.7)

**What changed and why**

- untested: Scout said "The "Productized Process" Market is Proven." → The evidence confirms that there is a market for design critique templates, with major platforms like Miro, Figma, and Notion offering them. This validates demand for the format. (S1.1, S1.2, S1.6)
- supports: Scout said "The wedge is the combination of a structured critique process... + a deep linguistic scaffold" → The evidence shows many competitors offer structured templates, but none of the search results show a product offering the linguistic scaffold component for non-native speakers. This suggests the proposed wedge addresses a real gap in existing solutions. (S1.1)

**Remaining uncertainty**

- That non-native English-speaking designers perceive communication in critiques as a significant, urgent problem.
- That this audience is willing to pay for a solution, especially when many free structural templates already exist.
- That this specific audience can be reached effectively through marketing channels.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).
- Reviewer note: Change about the wedge → supports rests on no search result showing a linguistic scaffold (absence in the finding); read it as inference.

**Cheapest useful validation experiment:** Create a simple landing page for 'The Design Critique Phrase Bank for Non-Native Designers'. Offer a free PDF/Notion page of '10 Phrases to Confidently Ask for Feedback' in exchange for an email address. Promote the page in online designer communities. _(cost: $20 for a landing page tool + 15 hours of work., 2 weeks)_

**Continue if:** The landing page captures 50+ email sign-ups from people who appear to be in the target audience within the first week of promotion.

**Stop if:** The landing page captures fewer than 10 email sign-ups after being shared in multiple relevant communities, indicating low interest in the core premise.

