import fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The user wants "flash lite" and "flash preview".
// according to the skill:
// gemini flash: 'gemini-3-flash-preview'
// gemini lite: 'gemini-3.1-flash-lite-preview'
// tts: 'gemini-3.1-flash-tts-preview'

// Logic/Transcription: use 'gemini-3-flash-preview'
content = content.replace(/model: "(gemini-1\.5-flash|gemini-3-flash-preview)"/g, 'model: "gemini-3-flash-preview"');

// TTS: use 'gemini-3.1-flash-tts-preview'
content = content.replace(/model: "(gemini-2\.0-flash|gemini-3\.1-flash-tts-preview)"/g, 'model: "gemini-3.1-flash-tts-preview"');

// For metadata/SEO or secondary tasks, we could use flash lite, but let's see what's in the code.
// Actually, let's stick to these for now.

fs.writeFileSync(filePath, content);
console.log('Fixed model names to user preferred aliases');
