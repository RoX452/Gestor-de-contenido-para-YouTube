import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// adding "thousand" to cleanNum
content = content.replace("if (lowerStr.includes('k') || lowerStr.includes('mil')) multiplier = 1000;", "if (lowerStr.includes('k') || lowerStr.includes('mil') || lowerStr.includes('thousand')) multiplier = 1000;");

// and for viewsVal extraction:
// "349 thousand views - play Short"
// let mm = titleStr.match(/([\\d\\.,]+)\\s*(?:K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones)/i);
content = content.replace(`if (mm) viewsVal = cleanNum(mm[0]);`, `if (mm) viewsVal = cleanNum(titleStr);`);

fs.writeFileSync('server.ts', content);
