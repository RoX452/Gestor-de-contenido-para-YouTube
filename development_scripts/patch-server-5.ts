import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const toReplace = `// Fallback for Shorts lockup view count embedded in title
                            if (viewsVal === 0) {
                                const mm = titleStr.match(/([\\d\\.,]+)\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones)/i);
                                if (mm) viewsVal = cleanNum(mm[0]);
                            }`;

const replacement = `// Fallback for Shorts lockup view count embedded in title
                            if (viewsVal === 0) {
                                let labelStr = lvl.rendererContext?.accessibilityContext?.label || "";
                                const mm = labelStr.match(/([\\d\\.,]+)\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones)/i);
                                if (mm) viewsVal = cleanNum(mm[0]);
                            }`;

content = content.replace(toReplace, replacement);
fs.writeFileSync('server.ts', content);
