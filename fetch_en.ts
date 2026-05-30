import fs from "fs";

async function run() {
    const res = await fetch("https://ai.google.dev/gemini-api/docs/speech-generation?hl=en");
    const t = await res.text();
    const text = t.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n');
    fs.writeFileSync("docs_en.txt", text);
    console.log("Written docs_en.txt");
}
run();
