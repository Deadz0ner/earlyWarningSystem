# Assignment: Dealer Portfolio Early Warning System

---

## Context

You are building for an NBFC that provides working capital loans to small dealers through large distributor anchors (think: a big electronics brand financing its retailer network). The NBFC has a live portfolio of 100 dealers across 2 anchors.

---

## The Problem

Dealers don't default overnight. There are signals weeks before: purchasing patterns shift, payments slow down, business activity changes. The NBFC's ops team currently has no way to catch these signals early. They find out a dealer is in trouble only after a missed payment.

**Your job: build a tool that catches trouble before it arrives.**

---

## What to Build

1. **Generate a synthetic dataset** of 100 dealers across 2 anchors, covering 12 months of activity. The data should include realistic patterns: some dealers are healthy, some are slowly deteriorating, some recover after a dip, some are heading toward default. You decide what data points to include and what realistic distributions look like.

2. **Build an early warning engine** that ingests this data and flags the top 10 dealers most likely to default in the next 30 days. The engine should classify dealers into risk categories you define (e.g., healthy / watch / critical) with clear thresholds.

3. **Every flag must come with an explanation.** Not just a score, but WHY this dealer is flagged. What signals triggered it.

4. **You may use AI/LLM APIs** anywhere in the build. In fact, you are encouraged to. But: for every place you use AI, document why you chose AI over a deterministic rule (or vice versa). This boundary is part of the evaluation.

5. **Present the output** as either:
   - A working dashboard/tool (preferred), or
   - A detailed document with the analysis, methodology, and sample outputs

> **Preferred stack:** PHP if you are comfortable. Otherwise, use whatever you are strongest in.

---

## What to Submit

- The working tool or document
- A **README** covering:
  - What data points you chose to monitor and why
  - Your risk classification logic (categories, thresholds, movement triggers)
  - Where you used AI vs deterministic rules, and the reasoning
  - What happens when data is missing for a dealer
  - What your false positive rate looks like and how you would measure it
  - What you would improve with more time

---

## Timeline

Please share your assumptions, questions, and proposed approach by tomorrow or day after.
And try to submit Final submission by Sunday.

> One note: if anything in this brief is unclear or incomplete, document your interpretation and reasoning. How you handle ambiguity is part of what I am looking at.
