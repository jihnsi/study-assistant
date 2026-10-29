// Error codes shared with the client (see lib/api.js). Each maps to one HTTP status.

export const STATUS = {
  bad_request: 400,
  unauthorized: 401,
  not_found: 404,
  no_text: 422,
  rate_limited: 429,
  not_configured: 500,
  model_error: 502,
  server_error: 500,
};

export class ApiFail extends Error {
  constructor(code) {
    super(code);
    this.name = 'ApiFail';
    this.code = STATUS[code] ? code : 'server_error';
    this.status = STATUS[this.code];
  }
}

export function errorResponse(err) {
  const fail = err instanceof ApiFail ? err : new ApiFail('server_error');
  if (!(err instanceof ApiFail)) {
    // Log the kind of failure only, never document text, tokens or keys.
    console.error('[api] unexpected error:', err && err.name ? err.name : 'unknown');
  } else if (fail.code === 'server_error' || fail.code === 'model_error') {
    console.error('[api] error:', fail.code);
  }
  return Response.json({ error: fail.code }, { status: fail.status, headers: { 'Cache-Control': 'no-store' } });
}
