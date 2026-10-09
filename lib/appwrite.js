import { Client, Account, Storage } from 'appwrite';

// These three are public identifiers (they ship to the browser). The defaults let a fresh
// deploy build and run with no setup; set the NEXT_PUBLIC_ variables in .env.local or in
// Vercel's Environment Variables to point at a different Appwrite project.
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6ac89ae4003507a218a0';

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

export const account = new Account(client);
export const storage = new Storage(client);

export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || 'pdfs';

// Must match the bucket's maximum file size in Appwrite (20 MB).
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
