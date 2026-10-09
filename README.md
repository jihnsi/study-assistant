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

## Stack

- Next.js (App Router, JavaScript)
- Appwrite Cloud for sign-in (email and password) and file storage

The Appwrite project needs a storage bucket with the ID `pdfs`: create permission for `users`, file security on, `.pdf` only, 20 MB maximum. Each uploaded file is readable only by the user who uploaded it.

## Where things are

- `app/`, `components/`: the pages and UI
- `lib/appwrite.js`: Appwrite client and settings
- `lib/i18n.js`: all interface text, in English and Traditional Chinese. New text needs both.
- `PRODUCT.md`: who the app is for and what it must do

Do not commit `.env`; it can hold a server API key.
