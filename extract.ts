import fs from 'fs';

const html = fs.readFileSync('docs.html', 'utf8');
const text = html.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n');
fs.writeFileSync('docs.txt', text);
console.log("Done");
