import { after } from 'next/server';
import { splitMarker } from '../../../lib/stream-marker.js';
import { bearerJwt, guarded, readBody, streamResponse, tapStream, validFileId, validLang } from '../../../lib/server/http.js';
import { rememberFromSummary } from '../../../lib/server/memory.js';
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
    const result = await summarize({ fileId, jwt, lang });

    if (result.memory === 'on') {
      // Same as Ask: after the summary has been fully delivered, maybe save one note about what
      // the student is studying. `done` is null if the stream failed or the client went away.
      const tapped = tapStream(result.stream);
      result.stream = tapped.stream;
      after(async () => {
        const text = await tapped.done;
        if (text === null) return;
        const { text: summary, error } = splitMarker(text, true);
        if (error || !summary.trim()) return;
        await rememberFromSummary({ jwt, fileName: result.fileName, summary, lang });
      });
    }
    return streamResponse(result);
  });
}
