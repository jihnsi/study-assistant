# Study Assistant

COM4101 Group 15 final year project: an AI study assistant for course notes.

Phase 1 (foundations): a user can sign in, upload a PDF and see it stored.

## Run it

```
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

For the AI features put `DEEPSEEK_API_KEY` in `.env.local` (see `.env.example`). Optional: `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `VOYAGE_API_KEY`, `VOYAGE_MODEL`, `VOYAGE_RERANK_MODEL`. These are server-only: never prefix them with `NEXT_PUBLIC_`. Without `DEEPSEEK_API_KEY` the AI endpoints return `not_configured` and the rest of the app works as before.

## Stack

- Next.js (App Router, JavaScript)
- Appwrite Cloud for sign-in (email and password) and file storage
- DeepSeek (chat completions) for summaries and answers; Voyage AI embeddings optional
- `unpdf` for reading PDF text on the server

The Appwrite project needs a storage bucket with the ID `pdfs`: create permission for `users`, file security on, `.pdf` only, 20 MB maximum. Each uploaded file is readable only by the user who uploaded it.

## Where things are

- `app/`, `components/`: the pages and UI
- `lib/appwrite.js`: Appwrite client and settings
- `lib/api.js`: browser helper for the AI endpoints (mints an Appwrite JWT, reads the streamed reply, fetches the PDF for the viewer)
- `app/api/summarize`, `app/api/ask`: route handlers. They read the user's PDF from Appwrite with the caller's JWT, so a user can only reach their own files
- `lib/server/`: server-only code: `appwrite-file.js` (access check and download), `pdf.js` (per-page text, cached), `deepseek.js` (streaming chat), `voyage.js` (optional embeddings and reranking), `select.js` (long-document handling and page ranking), `prompts.js`, `profile.js` (reads and writes the student's preferences in Appwrite account prefs), `memory.js` (notes remembered from Ask)
- `lib/i18n.js`: all interface text, in English and Traditional Chinese. New text needs both.
- `PRODUCT.md`: who the app is for and what it must do

Do not commit `.env`; it can hold a server API key.

## Reranking, preferences and memory

- Long PDFs (over the 100K character budget): Voyage embeddings shortlist the top 30 pages for a question, then `rerank-3-lite` re-orders that shortlist, and the budget is filled in that order. If the reranker fails the embedding order is used; if embeddings fail, keyword (BM25) ranking is used.
- Preferences live in the signed-in user's Appwrite account prefs under the `margin` key (`lib/prefs-schema.js`): explanation level, answer length, a remember on/off switch and up to 50 notes (written by Margin after each Ask and each summary, or added and edited by the student on the Preferences page). `/api/summarize` and `/api/ask` read them with the caller's JWT and add a `<student_profile>` block after the document. A failed read means defaults; preferences never make a request fail. Summaries use level and length (never notes); Ask also uses the notes.
- Memory: after an Ask answer has finished streaming (and only if it ended without an error), the route uses `after()` from `next/server` to ask the model whether the student's message holds anything durable worth saving (at most 2 short notes, nothing sensitive, nothing from the document). It then re-reads the prefs and saves with read-modify-write. `/api/ask` sets `X-Memory: on|off`. Question and answer text is never logged.
