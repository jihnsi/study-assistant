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

For the AI features put `DEEPSEEK_API_KEY` in `.env.local` (see `.env.example`). Optional: `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `VOYAGE_API_KEY`, `VOYAGE_MODEL`. These are server-only: never prefix them with `NEXT_PUBLIC_`. Without `DEEPSEEK_API_KEY` the AI endpoints return `not_configured` and the rest of the app works as before.

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
- `lib/server/`: server-only code: `appwrite-file.js` (access check and download), `pdf.js` (per-page text, cached), `deepseek.js` (streaming chat), `voyage.js` (optional embeddings), `select.js` (long-document handling and page ranking), `prompts.js`
- `lib/i18n.js`: all interface text, in English and Traditional Chinese. New text needs both.
- `PRODUCT.md`: who the app is for and what it must do

Do not commit `.env`; it can hold a server API key.
