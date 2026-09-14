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
- Problem evidence (assessed, quote-checked): **strong** — Multiple sources, including academic papers and discussion forums, show that non-native English speakers face significant challenges in professional communication. These challenges include papers being rejected for writing quality, a lack of confidence, panicking during meetings, and higher cognitive load. (S2.2, S2.4, S2.6, S2.9, S2.11)
- Alternatives: Oxford Language Club — Offers online English courses with certificates, with monthly and yearly subscription plans. (P2); Free Content (Berlitz, Simon & Simon, etc.) — Numerous websites provide free blog posts and articles listing dozens or hundreds of common business English phrases. (S1.3, S1.4)

**What changed and why**

- untested: Scout said "AI rewriters (Grammarly, Professionally) created the category" → The search results for the tested keywords did not include AI rewriters like Grammarly or Professionally.
- untested: Scout said "Notion templates for language learning are a proven Gumroad/Notion-marketplace category" → The evidence does not contain information about Notion templates for language learning or their performance on marketplaces.

**Remaining uncertainty**

- Whether software professionals will pay for a curated swipe file instead of using free online resources or general-purpose AI writing tools.
- Whether the specific pain of async communication in tech is acute enough to motivate a purchase.
- Whether a Notion database or PDF is the preferred format for this audience.
- 6 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 0 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create a landing page for 'The Non-Native Engineer's PR Review Phrasebook.' Offer a free PDF with 10 phrases for an email signup, and include a pre-order button for the full $29 product to test purchase intent. _(cost: $50 for landing page tool + 15 hours, 2 weeks)_

**Continue if:** The landing page achieves 50+ email signups and at least 5 pre-orders.

**Stop if:** The landing page generates fewer than 10 email signups and zero pre-orders after promotion in relevant communities.

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
- Problem evidence (assessed, quote-checked): **weak** — LinkedIn posts show that non-native speakers consider which language to use for their content and that complex language can be a barrier. Some non-native speakers are actively publishing content despite having an accent. (S2.2, S2.7, S2.8)
- Alternatives: Canva — A collection of over 1,200 free and paid LinkedIn carousel templates that are fully customizable. (S1.1); Adobe Express — Offers editable and free LinkedIn carousel post templates. (S1.2); Contentdrips — Provides over 500 free LinkedIn carousel templates and uses AI to populate the slides from a topic or blog post. (S1.9)

**What changed and why**

- weakens: Scout said "non-native English-speaking solo designers... freeze when typing English captions" → The evidence shows non-native speakers think about which language to use on LinkedIn, but it does not confirm they 'freeze' or find caption writing to be a primary obstacle. (S2.7)
- supports: Scout said "Editable templates are eating static PDFs in 2026" → The top search results for 'linkedin carousel templates' are dominated by platforms offering editable templates, such as Canva, Adobe, and Figma. (S1.1, S1.2)
- untested: Scout said "Authenticity premium punishes generic AI captions" → No evidence was found in the search results regarding a preference for human-written over AI-generated captions on LinkedIn.

**Remaining uncertainty**

- Whether the caption-writing component is a strong enough differentiator to compete with thousands of free visual templates.
- Whether designers perceive a need for 'native-sounding' captions and would pay for them over using free AI tools.
- Whether the target audience is willing to pay for this type of content kit at all.
- 5 of 9 planned keywords returned no search data (unknown, not zero).

**Cheapest useful validation experiment:** Create and promote a free lead magnet: '5 LinkedIn Carousel Templates + 10 Native-English Hooks for Non-Native Designers.' Track downloads and survey recipients to identify their single biggest challenge with creating LinkedIn content. _(cost: 10 hours of work, 2 weeks)_

**Continue if:** There are 100+ downloads and at least 30% of survey respondents list 'writing captions in English' as a top challenge.

**Stop if:** There are fewer than 20 downloads, or if survey data indicates the primary challenges are design inspiration or posting consistency, not language.

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
- Problem evidence (assessed, quote-checked): **strong** — Multiple sources, including professional blogs, discussion forums, and academic studies, directly address the problem of conducting user interviews and research across a language barrier. This is presented as a known challenge with established strategies for mitigation. (S2.2, S2.6, S2.7, S2.9, S2.11)
- Alternatives: NN/g (Nielsen Norman Group) — Provides a curated set of free, authoritative templates and guides for UX activities. (S1.3); Notion Marketplace — A platform offering various free and paid templates to manage user research findings, interviews, and tests. (S1.4); Figma Community — Offers free, community-created templates for UX research that can be used directly within the Figma design tool. (S1.5)

**What changed and why**

- supports: Scout said "The market for productized UX templates is validated." → Search results show that major industry platforms like Notion, Figma, and Airtable, along with thought leaders like NN/g, all offer UX research templates, confirming a market for these artifacts. (S1.3, S1.4)
- untested: Scout said "AI tools are augmenting, not replacing, the researcher." → The provided evidence does not contain information about AI research tools.

**Remaining uncertainty**

- Whether UX researchers are willing to pay for a language-focused kit rather than relying on free templates and improving their skills through practice.
- If the pain of conducting interviews in English is acute enough to motivate a purchase, or if it's seen as a manageable part of the job.
- Whether a swipe file is the correct format, as opposed to a video course or live coaching.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 0 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Write and publish a detailed blog post on Medium titled 'How I Overcame My Fear of Moderating User Interviews in English'. Offer a free downloadable 'User Interview Phrasebook' with 10 phrases in exchange for an email, and link to a waitlist for the full kit. _(cost: 10-15 hours of writing and design, 2 weeks)_

**Continue if:** The blog post receives over 500 views and generates at least 50 email signups for the phrasebook and waitlist.

**Stop if:** The post gets minimal traction (<100 views) and fewer than 10 email signups.

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
- Problem evidence (assessed, quote-checked): **moderate** — The evidence shows discussion and articles about designers' fear and anxiety related to presenting their work. This is described as a "specific dread" and a problem people seek solutions for. (S2.2, S2.5, S2.9)
- Alternatives: Adobe Express — Offers hundreds of free, customizable presentation templates that can be downloaded as PowerPoint or PDF files. (P1); SlidesCarnival — Provides a collection of professionally-designed, free PowerPoint and Google Slides templates. (P3); Figma Community — Offers over 3,400 free, fully customizable presentation templates and slides. (S1.6)

**What changed and why**

- supports: Scout said "The template market is mature, but lacks linguistic support." → Search results for "design presentation templates" show a crowded market of free visual templates from major players like Adobe, Figma, and Canva. These results do not mention scripts or linguistic support. (S1.1, S1.6)
- untested: Scout said "A productized toolkit for non-native English-speaking designers" → Keywords targeting the specific niche, such as "non native english presentation" and "design presentation anxiety," have no measurable search volume. (K1, K3)

**Remaining uncertainty**

- Whether non-native English-speaking designers perceive their problem as distinct from general presentation anxiety.
- Whether this target audience is willing to pay for a solution rather than using free templates and general advice.
- Whether a script-and-template toolkit is the desired solution format.
- 7 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create the free lead magnet: "The 5-Slide Template & Script to Justify One Design Decision." Promote it on platforms like Reddit (r/UXDesign) and LinkedIn, and measure downloads and collect email addresses. _(cost: $0, 10-15 hours of design and writing time., 2 weeks)_

**Continue if:** The lead magnet gets over 100 downloads and at least 5 people reply to a follow-up email confirming the specific pain point for non-native speakers.

**Stop if:** Fewer than 25 downloads, or feedback indicates that existing free templates and general public speaking advice are sufficient.

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
- Problem evidence (assessed, quote-checked): **moderate** — The evidence shows academic and professional recognition of the challenges non-native English speakers face in business communication. This includes "higher cognitive load" and "extra layers of fear and self-doubt." (S2.3, S2.4, S2.8)
- Alternatives: Agency Handy — Offers client communication templates as part of a larger agency management platform with monthly and lifetime pricing. (P1, P2); Tique — Sells plug-and-play client communication templates specifically for travel agents. (S1.4); InvoiceMonk — Provides an article with client communication templates for freelancers, suggesting they save time and ensure consistency. (S1.9)

**What changed and why**

- supports: Scout said "The "Productized Template" Market is Validated." → Search results show multiple vendors offering "client communication templates," including some with explicit pricing, which supports the idea that there is a market for such products. (S1.2, S1.4)

**Remaining uncertainty**

- Whether non-native freelance designers are actively searching for a solution to this problem.
- If they would pay for a dedicated kit of scripts and templates rather than using free online examples or AI writing tools.
- Whether the problem is significant enough to warrant a purchase, or if it's just a minor inconvenience.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 0 downgrade(s), 2 dropped claim(s).

**Cheapest useful validation experiment:** Write a blog post or a detailed Reddit comment titled '5 English Email Scripts Every Non-Native Freelance Designer Needs.' Include a link to download a PDF version in exchange for an email address. _(cost: $0, 8-10 hours of writing and promotion., 2 weeks)_

**Continue if:** The post receives significant engagement (upvotes, positive comments) and generates over 75 email sign-ups, with some users confirming the pain point.

**Stop if:** The post receives little engagement and fewer than 20 email sign-ups, indicating a lack of interest in the specific problem or solution.

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
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that writing portfolio case studies is a generally difficult or "dreaded" task for designers, who seek strategies to improve their process. (S2.6, S2.3)
- Alternatives: Figma — Offers free case study templates to help users display projects and research in an organized format. (P5); UXfol.io — Provides a blog with a detailed UX case study template and structure guide, explaining what to include and how to format the story. (P1); Adobe Express — Provides editable and free case study templates to help users create their own design online. (S1.3)

**What changed and why**

- supports: Scout said "The "Artifact" Market is Validated but Incomplete." → Search results for "design case study templates" are dominated by free offerings from major platforms like Figma, Adobe, and Canva, confirming a mature market for the visual artifact. These results do not mention linguistic support. (S1.1, S1.3)
- untested: Scout said "A productized toolkit for non-native English-speaking designers" → None of the nine keywords searched, including problem-focused ones like "struggle writing ux case study" and solution-focused ones like "design case study templates," had any measurable search volume. (K3, K4)

**Remaining uncertainty**

- Whether non-native designers see their writing challenge as a distinct problem requiring a specialized tool, rather than a general writing skill issue.
- If this audience would pay for a template/script kit when so many visual templates are free and AI writing assistants are widely available.
- The demand for this specific solution, as no search volume was found for relevant keywords.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create the free lead magnet: "The 1-Page Case Study Outline & 10 Essential English Phrases for Non-Native Designers." Promote it in relevant online communities and measure downloads via an email gate. _(cost: $0, 10-15 hours of writing and design., 2 weeks)_

**Continue if:** The lead magnet is downloaded over 100 times and a follow-up survey gets at least 10 responses confirming that writing in English is their primary barrier.

**Stop if:** Fewer than 25 downloads, or feedback suggests the problem is not specific to non-native speakers or that free templates and AI tools are a sufficient solution.

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
- Problem evidence (assessed, quote-checked): **moderate** — Multiple articles and discussions confirm that poor design handoffs are a common problem in software development. The issues cited include miscommunication, errors, delays, misaligned expectations, and a failure to document logic and behavior beyond visual pixels. (S2.7, S2.4, S2.6, S2.8, S2.2)
- Alternatives: Figma — Offers a "Free Design Handoff Tool for Designers & Developers" that "enables a design handoff experience that keeps designers and developers on the same page." (S1.2); UXPin — A design and prototyping tool listed among the "Top 10 Design Handoff Tools". It offers paid plans starting at $49/month/seat. (S1.3, P2); Miro — A collaborative platform positioned for design handoffs to "document behavior, edge cases, and logic". It offers paid plans starting at $8/month/member. (S2.6, P4); Zeplin — Described as a "popular design handoff tool making it easy for designers, engineers, and other team members to communicate and collaborate effectively." (S1.3)

**What changed and why**

- No change statement survived validation (each must quote the memo and, to claim an effect, cite quoted evidence).

**Remaining uncertainty**

- That non-native English speakers perceive their language skills as the primary barrier in design handoffs, as opposed to universal issues like lack of process.
- Willingness to pay for a template-and-snippet-based solution to this problem.
- That this specific niche (non-native English-speaking designers) is large enough and reachable.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 2 dropped claim(s).

**Cheapest useful validation experiment:** Create a simple landing page describing 'The Figma Handoff Kit for Non-Native Designers'. Include mockups, a clear description of the value proposition, and a pre-order button for $39. Drive targeted traffic from design communities like Reddit. _(cost: ~$50 for landing page tool + 10-15 hours of effort., 2 weeks)_

**Continue if:** The experiment generates 10 or more pre-orders, validating that a segment of the target audience is willing to pay to solve this specific problem.

**Stop if:** The experiment generates fewer than 3 pre-orders, suggesting a lack of willingness to pay or a failure to resonate with the target audience.

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
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows that designers are actively seeking ways to get better outputs from AI tools. This involves learning to write more detailed, specific, and constrained prompts. (S2.2, S2.4, S2.11)
- Alternatives: AI UX Playground — Offers "ready-made instructions for product design" and has a library of over 210 design prompts. The site appears to be free. (S1.3, P3); Design Prompts — An "AI-Powered Design Style Explorer" that provides "AI-ready prompts to recreate any aesthetic in your own projects." The site appears to be free. (S1.4); Adobe Firefly — Provides guidance and examples of "AI prompts for graphic designers" to help users "quickly generate ideas." (S1.5); Figma — Publishes resources on "How to Get Better Output" from AI design prompts. (S2.2)

**What changed and why**

- weakens: Scout said "The 'Prompt Pack' Market is Proven and Profitable." → The evidence shows a market for prompt packs, but the most direct competitors for designers (e.g., AI UX Playground, Design Prompts) appear to be free resources, not paid products. (S1.3, S1.4)

**Remaining uncertainty**

- That designers are willing to pay for a prompt kit when many comprehensive, free alternatives exist.
- That non-native English speakers struggle with prompt writing significantly more than native speakers.
- That a static list of prompts is the desired solution, rather than learning the underlying skill of prompt engineering from free guides.
- 9 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create a free lead magnet: 'The 10-Prompt Starter Kit for Non-Native Designers to Generate Better UI Concepts'. Promote it in relevant online communities to see if the 'non-native' angle generates any interest or email sign-ups. _(cost: ~$20 for landing page tool + 8 hours of effort., 1 week)_

**Continue if:** The lead magnet gets over 100 email sign-ups, indicating the positioning resonates with a specific audience.

**Stop if:** The lead magnet gets fewer than 20 sign-ups, suggesting the 'non-native' angle does not provide a strong enough hook to stand out from free alternatives.

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
- Problem evidence (assessed, quote-checked): **weak** — Evidence from a Reddit discussion and an article suggests that writing good copy is a recognized challenge for designers and product managers. (S2.2, S2.8)
- Alternatives: Frontitude — Offers an "AI writing assistant for design teams" as a Figma plugin that "delivers copy suggestions based on your design elements." (S1.10); Localazy — A localization platform that also publishes content on tools for UX writers. It offers paid plans for its core service. (S1.5, P6); Grafana — Provides a public "Writers' Toolkit" documentation with guidelines on "creating text, style, and tone in the different components that make up the UI." (S1.2)

**What changed and why**

- untested: Scout said "The Market for Design 'Process' Kits is Validated." → Keyword data shows search demand for solution-oriented terms like "microcopy examples" (110 searches/month) and "ux writing template" (10 searches/month), supporting the idea that people are looking for artifacts to help them. (K5, K4)

**Remaining uncertainty**

- That the primary problem for non-native designers is a lack of templates, rather than fundamental language or writing skills.
- Willingness to pay for a kit of templates and phrases instead of using free guides or AI-powered tools.
- The core assumption that non-native English speakers are a distinct and reachable market segment for this specific problem.
- 7 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 1 downgrade(s), 2 dropped claim(s).

**Cheapest useful validation experiment:** Create a simple landing page for 'The UX Writing Kit for Non-Native Designers'. Detail the contents (Figma components, Notion swipe file), show mockups, and include a pre-order button for $39. Promote the page in UX writing and design communities. _(cost: ~$50 for landing page tool + 10-15 hours of effort., 2 weeks)_

**Continue if:** The experiment achieves 10 or more pre-orders, indicating that the specific solution and positioning resonate enough for people to pay.

**Stop if:** The experiment results in fewer than 3 pre-orders, suggesting a weak product-market fit or low willingness to pay.

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
- Problem evidence (assessed, quote-checked): **weak** — The evidence shows a general need for design critiques to be safe, structured, and inclusive. There are also discussions about using more specific, constructive language during critiques. (S1.1, S1.2, S2.5)
- Alternatives: Miro — Offers design critique templates to provide a structured environment for feedback. (S1.1); Figma — Provides community-created design critique templates, including asynchronous formats. (S1.2); Nielsen Norman Group — Publishes articles and likely offers training on how to conduct effective design critiques. (P1); Notion — Hosts collections of design critique templates. (S1.6)

**What changed and why**

- supports: Scout said "The "Productized Process" Market is Proven." → Search results for "design critique templates" show numerous offerings from major platforms like Miro, Figma, and Notion, confirming demand for such tools. (S1.1, S1.2, S1.6)
- supports: Scout said "The wedge is the combination of a structured critique process... + a deep linguistic scaffold" → The market is crowded with solutions for the 'structured process' part, but none of the observed competitors focus on providing a 'linguistic scaffold' for non-native speakers. (S1.1, S2.2)

**Remaining uncertainty**

- That non-native English-speaking designers perceive their language skills as a primary blocker in design critiques.
- That this audience is actively looking for a solution to this specific problem.
- That they are willing to pay for a toolkit of templates and phrase banks.
- 8 of 9 planned keywords returned no search data (unknown, not zero).
- The assessment's own over-claims were cut: 0 citation(s) without a matching quote, 0 downgrade(s), 1 dropped claim(s).

**Cheapest useful validation experiment:** Create a one-page lead magnet titled '10 Phrases to Use in Design Critiques to Sound More Confident (for Non-Native English Speakers)'. Distribute it via a simple landing page in online communities where UX designers gather (e.g., subreddits, LinkedIn groups) and measure downloads and qualitative feedback. _(cost: $0 + 4-6 hours, 1-2 weeks)_

**Continue if:** The lead magnet receives 100+ downloads and at least 5 unsolicited, positive comments from people identifying as non-native English-speaking designers.

**Stop if:** The lead magnet receives fewer than 20 downloads and no qualitative feedback, or feedback indicates this is not a significant problem for the target audience.

