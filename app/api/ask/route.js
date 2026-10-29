import { ApiFail } from '../../../lib/server/errors.js';
import { bearerJwt, guarded, readBody, streamResponse, validFileId, validLang } from '../../../lib/server/http.js';
import { ask } from '../../../lib/server/pipeline.js';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_QUESTION_CHARS = 2000;

export async function POST(request) {
  return guarded(async () => {
    const jwt = bearerJwt(request);
    const body = await readBody(request);
    const fileId = validFileId(body.fileId);
    const lang = validLang(body.lang);
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (question.length < 1 || question.length > MAX_QUESTION_CHARS) throw new ApiFail('bad_request');
    if (body.history !== undefined && !Array.isArray(body.history)) throw new ApiFail('bad_request');
    return streamResponse(await ask({ fileId, jwt, lang, question, history: body.history || [] }));
  });
}
