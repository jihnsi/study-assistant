// Reads the caller's own file from Appwrite using the caller's JWT. There is no server API key,
// so Appwrite itself enforces that the file belongs to the user.

import { BUCKET_ID, ENDPOINT, PROJECT_ID } from '../appwrite.js';
import { ApiFail } from './errors.js';

// Appwrite IDs start with a letter or digit. Requiring that also keeps "." and ".." out of URLs.
const FILE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;
const MAX_PDF_BYTES = 25 * 1024 * 1024; // bucket limit is 20 MB; small margin
const META_TIMEOUT_MS = 15000;
const DOWNLOAD_TIMEOUT_MS = 45000;

export function isValidFileId(id) {
  return typeof id === 'string' && FILE_ID_RE.test(id);
}

function fileUrl(fileId, suffix = '') {
  if (!isValidFileId(fileId)) throw new ApiFail('bad_request');
  return `${ENDPOINT}/storage/buckets/${encodeURIComponent(BUCKET_ID)}/files/${encodeURIComponent(fileId)}${suffix}`;
}

async function appwriteGet(url, jwt, timeoutMs) {
  let res;
  try {
    res = await fetch(url, {
      headers: { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-JWT': jwt },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiFail('server_error');
  }
  if (res.status === 401 || res.status === 403) throw new ApiFail('unauthorized');
  if (res.status === 404) throw new ApiFail('not_found');
  if (!res.ok) throw new ApiFail('server_error');
  return res;
}

// Access check. Succeeds only if this JWT's user may read the file.
// Returns { id, name, size, updatedAt, version }; version changes when the file changes.
export async function getFileMeta(fileId, jwt) {
  const res = await appwriteGet(fileUrl(fileId), jwt, META_TIMEOUT_MS);
  let meta;
  try {
    meta = await res.json();
  } catch {
    throw new ApiFail('server_error');
  }
  const size = Number(meta.sizeOriginal) || 0;
  const updatedAt = String(meta.$updatedAt || '');
  return {
    id: String(meta.$id || fileId),
    name: String(meta.name || ''),
    size,
    updatedAt,
    version: `${fileId}:${updatedAt}:${size}`,
  };
}

export async function downloadFile(fileId, jwt) {
  const res = await appwriteGet(fileUrl(fileId, '/download'), jwt, DOWNLOAD_TIMEOUT_MS);
  const length = Number(res.headers.get('content-length'));
  if (length > MAX_PDF_BYTES) throw new ApiFail('bad_request');
  let buf;
  try {
    buf = await res.arrayBuffer();
  } catch {
    throw new ApiFail('server_error');
  }
  if (buf.byteLength > MAX_PDF_BYTES) throw new ApiFail('bad_request');
  return new Uint8Array(buf);
}
