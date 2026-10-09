import { Client, Account, Storage } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const storage = new Storage(client);

export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

// Must match the bucket's maximum file size in Appwrite (20 MB).
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
