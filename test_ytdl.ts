import youtubedl from 'youtube-dl-exec';
import fs from 'fs/promises';

async function test_ytdl() {
    try {
        const output = await youtubedl('https://www.youtube.com/watch?v=_ef1-0Onsv8', {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
            writeAutoSub: true,
            subLang: 'en,es'
        }) as any;
        console.log("Got response:", Object.keys(output.subtitles), Object.keys(output.automatic_captions));
    } catch(e) {
        console.error("error:", e);
    }
}
test_ytdl();
