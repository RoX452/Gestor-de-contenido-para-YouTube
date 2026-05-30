import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let openDivs = 0;
let closeDivs = 0;
let inStudio = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<motion.div') && line.includes('key="studio"')) {
        inStudio = true;
    }
    if (inStudio) {
        const opens = (line.match(/<div( |>)/g) || []).length;
        const closes = (line.match(/<\/div>/g) || []).length;
        openDivs += opens;
        closeDivs += closes;
        
        if (line.includes('</motion.div>') && i > 1800) {
            // Probably end of studio
            console.log(`At line ${i+1}: Open Divs: ${openDivs}, Close Divs: ${closeDivs}`);
            // inStudio = false; // Keep going to see if there's more
        }
    }
}
