import { bearerJwt, guarded, readBody, streamResponse, validFileId, validLang } from '../../../lib/server/http.js';
import { summarize } from '../../../lib/server/pipeline.js';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  return guarded(async () => {
    const jwt = bearerJwt(request);
    const body = await readBody(request);
    const fileId = validFileId(body.fileId);
    const lang = validLang(body.lang);
    return streamResponse(await summarize({ fileId, jwt, lang }));
  });
}
