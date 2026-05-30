import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const toReplace = `// Fallback for Shorts lockup view count embedded in title
                            if (viewsVal === 0) {
                                let labelStr = lvl.rendererContext?.accessibilityContext?.label || "";
                                const mm = labelStr.match(/([\\d\\.,]+)\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones)/i);
                                if (mm) viewsVal = cleanNum(mm[0]);
                                titleStr = titleStr.replace(/,\\s*[\\d\\.,]+\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones).*$/i, '').replace(/\\s*-\\s*play Short/i, '').trim();
                            }`;

const replacement = `// Fallback for Shorts lockup view count embedded in title
                            if (viewsVal === 0) {
                                let labelStr = lvl.rendererContext?.accessibilityContext?.label || "";
                                console.log("[Debug] Short titleStr:", titleStr, "| labelStr:", labelStr);
                                const mm = labelStr.match(/([\\d\\.,]+)\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones)/i);
                                if (mm) viewsVal = cleanNum(mm[0]);
                                titleStr = titleStr.replace(/,\\s*[\\d\\.,]+\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones).*$/i, '').replace(/\\s*-\\s*play Short/i, '').trim();
                            }`;

content = content.replace(toReplace, replacement);
fs.writeFileSync('server.ts', content);
