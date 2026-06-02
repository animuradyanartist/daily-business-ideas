# Outcomes — real-world results

This folder is the **highest-weight signal in the whole system.** Everything else (LEARNINGS, MARKET_MAP, the markets atlas, the daily memos) is reasoning. This is reality.

Each file records what actually happened when someone acted on an idea: built it, ran the validation test, tried to sell it, shipped it, or walked away. Scout reads every file here **before** researching and is told plainly: when an outcome contradicts a pattern it would otherwise assume, the outcome wins. Over time this is what bends the agent away from "plausible" and toward "actually works".

## How outcomes get logged

The easy path is the **Telegram bot**: open an idea, tap **📊 Log outcome**, and send a message describing what happened. The bot writes it here for you and commits it. You can also add or edit files by hand using the format below.

## Format

One file per idea, named after the idea's memo date: `outcomes/<YYYY-MM-DD>.md` (the date of the `ideas/<date>.md` it refers to). Append new updates to the same file over time — newest at the top — so the arc of an idea stays in one place.

```
# Outcome — <idea title>

idea: ideas/<YYYY-MM-DD>.md
stage: <considered | validating | building | launched | selling | shipped | parked | killed>
result: <win | partial | flat | loss | too-early>

## <update date>
What I did: <the concrete action — landing page, 10 outreach DMs, a paid pilot, a real sale…>
What happened: <the hard result — numbers if you have them: signups, replies, $, conversion>
What I learned: <the non-obvious takeaway, especially pay-vs-complain reality>
Verdict: <continue | pivot | stop> — <one line>
```

Numbers beat adjectives. "12 DMs, 4 replies, 1 paid pilot at $200" teaches the agent far more than "went okay". Negative outcomes are just as valuable as wins — a clear "people loved it but nobody paid" is one of the most useful things you can log.
