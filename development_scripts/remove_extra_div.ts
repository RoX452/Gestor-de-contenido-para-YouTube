import fs from 'fs';

const filePath = 'src/App.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Remove line 2232 (0-indexed it would be 2231)
// Wait, I should find it by content to be safe.
const targetLineIndex = lines.findIndex((line, idx) => idx > 2220 && idx < 2240 && line.trim() === '</div>' && lines[idx+2]?.includes('Debug Console'));

if (targetLineIndex !== -1) {
    console.log(`Removing extra div at line ${targetLineIndex + 1}`);
    lines.splice(targetLineIndex, 1);
    fs.writeFileSync(filePath, lines.join('\n'));
} else {
    console.log('Extra div not found with strict check');
}
