import fs from "fs";
const run = async () => {
    const res = await fetch("https://ai.google.dev/gemini-api/docs/speech-generation");
    const t = await res.text();
    const text = t.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n');
    fs.writeFileSync("docs.txt", text);
    console.log("HTML written");
}
run();
