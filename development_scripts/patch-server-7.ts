import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const toReplace = `// Fallback for Shorts lockup view count embedded in title
                            if (viewsVal === 0) {
                                const mm = titleStr.match(/([\\d\\.,]+)\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones)/i);
                                if (mm) viewsVal = cleanNum(mm[0]);
                            }`;

const replacement = `// Fallback for Shorts lockup view count embedded in title
                            if (viewsVal === 0) {
                                const mm = titleStr.match(/([\\d\\.,]+)\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones)/i);
                                if (mm) viewsVal = cleanNum(mm[0]);
                                titleStr = titleStr.replace(/,\\s*[\\d\\.,]+\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones).*$/i, '').replace(/\\s*-\\s*play Short/i, '').trim();
                            }`;

// But wait, titleStr was declared as `const titleStr`. Let's change it.
const toReplace2 = `const titleStr = lvl.metadata?.lockupMetadataViewModel?.title?.content || "YouTube Video";`;
const replacement2 = `let titleStr = lvl.metadata?.lockupMetadataViewModel?.title?.content || "YouTube Video";`;

content = content.replace(toReplace, replacement).replace(toReplace2, replacement2);

fs.writeFileSync('server.ts', content);
