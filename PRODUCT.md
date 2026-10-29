# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js (App Router, JavaScript) with Appwrite Cloud (free plan to start; self-hosted Docker is the plan's fallback). Next.js and Appwrite were chosen in the COM4101 Group 15 Project Plan (phase 0, 28 Sep 2026). JavaScript over TypeScript is a build-time choice to keep phase 1 small.

## Users
University students in a Hong Kong-based group project (COM4101, Group 15). They upload their own course notes as PDFs and want help studying from them. The group's classmates are the first trial users.

## Product Purpose
An AI agent study assistant: chat Q&A, document upload and summarising, study plan generation, memory, and task-based agent actions. Phase 1 (5 Oct to 1 Nov 2026) is only the foundation: a user can sign in, upload a PDF and see it stored.

## Positioning
Per the plan, the differentiator is an agent that builds a revision plan from the student's own uploaded PDFs in one request, with answers cited to document pages. This is a plan, not yet validated; the student survey has not launched.

## Operating Context
Students upload their own course material, so privacy and trust matter at upload time. Start with text PDFs; scanned notes and slide-only PDFs are out of scope until after the midterm. The app runs locally for demos at first; hosting is not chosen.

## Capabilities and Constraints
- Phase 1 scope: sign in (and create an account), upload a PDF, see stored PDFs. Nothing else is in scope yet.
- Interface is bilingual, English and Chinese, from the start (user-confirmed). Assumed to be Traditional Chinese (Hong Kong); not yet confirmed.
- App name: "Margin" in English, "旁註" in Chinese (decided with the user; replaces the placeholder "Study Assistant").
- Language model is undecided (Jeffrey, proposed 16 October). Phase 1 does not depend on it.
- Roles in the group: Nico (platform), Jeffrey (chat and model), Ching (documents), Anson (planner and UI).

## Brand Commitments
Name: Margin / 旁註. Concept: the margin of a school exercise book, where students write notes beside the text. Signature motif: a thin vermilion margin rule. Palette: paper, ink, pen-blue, vermilion red pen. Type: Newsreader and Noto Serif TC for display, Instrument Sans and Noto Sans TC for UI. Full detail in DESIGN.md. Voice: plain, specific, no hype.

## Evidence on Hand
COM4101 Group 15 Project Plan (PDF). No user research, survey results, testimonials or real course files yet; do not fabricate any.

## Product Principles
- Trust first: students hand over their own notes, so say plainly what is stored and what happens to it.
- Foundations before features: show only what exists today, no placeholder chat, planner or settings.
- Both languages are first-class, not a translation afterthought.
- Plain, specific words that say what happens (Sign in, Upload PDF, Stored files).

## Accessibility & Inclusion
No product-specific standard set. Bilingual users; keyboard and screen-reader basics apply.
