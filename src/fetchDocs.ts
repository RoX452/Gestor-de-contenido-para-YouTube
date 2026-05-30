import https from "https";
import fs from "fs";

https.get("https://raw.githubusercontent.com/google/generative-ai-docs/main/site/en/gemini-api/docs/speech-generation.md", (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    fs.writeFileSync("docs.md", data);
    console.log("Downloaded!");
  });
}).on("error", (err) => console.log(err));
