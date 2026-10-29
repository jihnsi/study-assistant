import { after } from 'next/server';
import { splitMarker } from '../../../lib/stream-marker.js';
import { ApiFail } from '../../../lib/server/errors.js';
import { bearerJwt, guarded, readBody, streamResponse, tapStream, validFileId, validLang } from '../../../lib/server/http.js';
import { rememberFromAsk } from '../../../lib/server/memory.js';
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
    const result = await ask({ fileId, jwt, lang, question, history: body.history || [] });

    if (result.memory === 'on') {
      // Save notes about the student only after the answer has been fully delivered, so this
      // never delays or breaks it. after() runs when the response is finished (it is also run
      // if the client disconnects, in which case `done` is null and we do nothing). The tap
      // collects the streamed text; an error marker or an empty answer means nothing is saved.
      const tapped = tapStream(result.stream);
      result.stream = tapped.stream;
      after(async () => {
        const text = await tapped.done;
        if (text === null) return;
        const { text: answer, error } = splitMarker(text, true);
        if (error || !answer.trim()) return;
        await rememberFromAsk({ jwt, question, answer, lang });
      });
    }
    return streamResponse(result);
  });
}
