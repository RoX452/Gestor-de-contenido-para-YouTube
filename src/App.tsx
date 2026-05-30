import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  AudioLines, 
  ChevronRight, 
  Download, 
  History, 
  Layers, 
  LayoutDashboard, 
  Mic, 
  Play, 
  Settings, 
  Sparkles, 
  Trash2,
  FileAudio,
  Type,
  Maximize2,
  Languages,
  Plus,
  PlusCircle,
  Link as LinkIcon,
  Circle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  Boxes,
  Zap,
  Youtube,
  MonitorPlay,
  Loader2,
  Timer,
  Menu,
  X,
  Info,
  Package,
  Mic2,
  LogOut,
  User as UserIcon,
  Eye,
  Copy,
  Check,
  Leaf,
  Moon,
  Flame,
  Sun,
  Palette,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { saveHistory as saveLocalHistory, getAllHistory as getLocalHistory, deleteHistory as deleteLocalHistory } from './lib/idb';
import { pcmToWav, base64ToPcm, formatTime, combinePcms, pcmToWavBase64, wavToPcm } from './lib/audioUtils';
import { HistoryItem, NicheConfig, ScriptVariant } from './types';
import { Radar } from './components/Radar';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  updateDoc,
  orderBy,
  storage,
  User
} from './lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const VOICES = [
  { id: 'Puck', name: 'Puck (Juvenil/Enérgico/Rápido)' },
  { id: 'Charon', name: 'Charon (Narrativo/Serio/Maduro)' },
  { id: 'Kore', name: 'Kore (Firme/Profesional/Femenino)' },
  { id: 'Fenrir', name: 'Fenrir (Intenso/Emocionante/Masculino)' },
  { id: 'Aoede', name: 'Aoede (Relajado/Natural/Femenino)' },
  { id: 'Zephyr', name: 'Zephyr (Brillante/Amigable/Femenino)' },
  { id: 'Leda', name: 'Leda (Alegre/Optimista/Femenino)' },
  { id: 'Orus', name: 'Orus (Maduro/Estable/Masculino)' },
  { id: 'Callirrhoe', name: 'Callirrhoe (Cálida/Cercana/Femenino)' },
  { id: 'Autonoe', name: 'Autonoe (Expresiva/Clara/Femenino)' },
  { id: 'Enceladus', name: 'Enceladus (Profundo/Suspenso/Masculino)' },
  { id: 'Iapetus', name: 'Iapetus (Elegante/Objetivo/Masculino)' },
  { id: 'Umbriel', name: 'Umbriel (Pensativo/Calmado/Masculino)' },
  { id: 'Algieba', name: 'Algieba (Fluido/Narrativo/Masculino)' },
  { id: 'Despina', name: 'Despina (Sofisticada/Clara/Femenino)' },
  { id: 'Erinome', name: 'Erinome (Cristalina/Directa/Femenino)' },
  { id: 'Algenib', name: 'Algenib (Robusto/Rudo/Masculino)' },
  { id: 'Rasalgethi', name: 'Rasalgethi (Institucional/Locutor)' },
  { id: 'Laomedeia', name: 'Laomedeia (Vibrante/Energética)' },
  { id: 'Achernar', name: 'Achernar (Suave/Gentil/Masculino)' },
  { id: 'Alnilam', name: 'Alnilam (Poderoso/Fuerte)' },
  { id: 'Schedar', name: 'Schedar (Equilibrado/Neutro)' },
  { id: 'Gacrux', name: 'Gacrux (Sabio/Anciano/Relatos)' },
  { id: 'Pulcherrima', name: 'Pulcherrima (Directa/Femenino)' },
  { id: 'Achird', name: 'Achird (Conversacional/Amigable)' },
  { id: 'Zubenelgenubi', name: 'Zubenelgenubi (Despreocupado/Natural)' },
  { id: 'Vindemiatrix', name: 'Vindemiatrix (Maternal/Cálido)' },
  { id: 'Sadachbia', name: 'Sadachbia (Vivaz/Animado)' },
  { id: 'Sadaltager', name: 'Sadaltager (Conocimiento/Experto)' },
  { id: 'Sulafat', name: 'Sulafat (Acogedor/Profundo)' }
];

const LANGUAGES: Record<string, string> = {
  'en-US': 'Inglés (USA)',
  'en-GB': 'Inglés (UK)',
  'es-ES': 'Español España',
  'es-LA': 'Español Latino',
  'de-DE': 'Alemán Alemania',
  'de-CH': 'Alemán Suiza',
  'fr-FR': 'Francés Francia',
  'it-IT': 'Italiano Italia',
  'pt-BR': 'Portugués Brasil',
  'ja-JP': 'Japonés Japón',
  'no-NO': 'Noruego Noruega',
};

export const APP_THEMES = [
  { id: 'ruby', name: 'Ruby Dark (Red Accent)', colors: { 100: '#ffe4e6', 400: '#fb7185', 500: '#e11d48', 600: '#be123c' }, bg: { base: '#0a0a0b', panel: '#0c0c0e', card: '#111114', surface: '#1a1315', border: '#2b1d22' }, icon: 'Flame' },
  { id: 'carbon', name: 'Carbon Gray (Cyan Accent)', colors: { 100: '#cffafe', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2' }, bg: { base: '#0f1115', panel: '#15181e', card: '#1a1d24', surface: '#22262f', border: '#3b4252' }, icon: 'Zap' },
  { id: 'obsidian', name: 'Obsidian Black (Emerald Accent)', colors: { 100: '#d1fae5', 400: '#34d399', 500: '#10b981', 600: '#059669' }, bg: { base: '#000000', panel: '#080808', card: '#121212', surface: '#1a1a1a', border: '#262626' }, icon: 'Leaf' },
  { id: 'ash', name: 'Ash Gray (Purple Accent)', colors: { 100: '#ede9fe', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' }, bg: { base: '#18191a', panel: '#1f2022', card: '#242526', surface: '#303134', border: '#42454a' }, icon: 'Moon' },
  { id: 'midnight', name: 'Midnight Space (Blue Accent)', colors: { 100: '#e0f2fe', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7' }, bg: { base: '#050b14', panel: '#0b1426', card: '#111c33', surface: '#192a4a', border: '#253b66' }, icon: 'Palette' },
  { id: 'coffee', name: 'Coffee Dark (Gold Accent)', colors: { 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' }, bg: { base: '#14110f', panel: '#1c1815', card: '#261f1c', surface: '#332b27', border: '#4a3f38' }, icon: 'Sun' },
  { id: 'plum', name: 'Plum Dark (Magenta Accent)', colors: { 100: '#fae8ff', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3' }, bg: { base: '#0f0a15', panel: '#150e1d', card: '#1e1429', surface: '#281a38', border: '#422a5e' }, icon: 'Moon' },
];

const ThemeIcons: Record<string, React.ElementType> = {
  Zap,
  Leaf,
  Moon,
  Flame,
  Sun,
  Palette
};

const getLangName = (code: string) => {
  const raw = LANGUAGES[code] || code;
  return raw.toUpperCase();
};

const getCleanTextLength = (text: string) => {
  if (!text) return 0;
  // Remove markdown, structural tags, and TTS markers to count only spoken words
  let clean = text.replace(/\[(?:IMG|CTA|CAMBIO DE IMAGEN|CHAPTER|CAPITULO).*?\]/gi, '');
  // Remove english emotion tags
  clean = clean.replace(/\[(?:whispers|laughs|sighs|gasp|shouting|tired|sarcastic|angry|sad|excited|happy|serious|slowly|quickly|like a|sarcastically).*?\]/gi, '');
  clean = clean.replace(/[#*]/g, '');
  // Collapse spaces and count
  return clean.replace(/\s+/g, ' ').trim().length;
};

const getFilteredHistory = (hist: HistoryItem[], workspace: string) => {
  if (workspace === 'ALL') return hist;
  return hist.filter(p => {
    if (p.workspaceId === workspace) return true;
    
    // Fallback for missing or inconsistently capitalized 'psicologia' legacy projects
    if (workspace === 'psicologia') {
      if (!p.workspaceId) return true;
      const lower = p.workspaceId.toLowerCase().trim();
      return lower === 'psicología' || lower === 'psicologia' || lower === 'default' || lower === '';
    }
    return false;
  });
};

const DEFAULT_NICHES: Record<string, NicheConfig> = {
  psicologia: {
    id: 'psicologia',
    name: 'Psicología',
    tone: 'empático, cálido, comprensivo, pausado',
    prompt: `Role: Act as an expert YouTube retention analyst and scriptwriter for "faceless" psychology and everyday mental well-being mini-documentaries. 
Task: Analyze the provided original transcript. Extract the core psychological, behavioral, or philosophical lesson and write a COMPLETELY NEW script in ENGLISH applying the "Angle Shift" technique. Your goal is to make it feel deeply intimate, conversational, and grounded.

Target Market: Global English-speaking audience. 

NICHE IDENTITY (CRITICAL RULE): 
Our channel focuses on MODERN PSYCHOLOGY AND EMOTIONAL RELIEF. We explore the "Why" behind everyday human friction (overthinking, exhaustion, procrastination, quiet struggles) without sensationalizing it. Keep it grounded, relatable, and deeply human. Avoid general self-help clichés or toxic positivity. 

FACTUAL RIGOR & AUTHORITY: 
Any psychological rule, philosophical principle, or brain mechanic used MUST be 100% real and verifiable. NEVER invent fake disorders or misattribute quotes. Explain the science simply and clearly, as if explaining it to a close friend.

EVERGREEN & TIME-PROOFING RULE (MANDATORY): 
Neutralize all time-sensitive information from the original text (current events, internet trends, specific years). Transform outdated examples into timeless psychological principles.

ANGLE SHIFT TECHNIQUE (MANDATORY): 
Do not simply summarize. Change the presentation entirely. Focus on natural storytelling and relatable observations rather than academic essays.

THE DYNAMIC HOOK SYSTEM:
Alternate between these two opening strategies to maintain unpredictability, but always keep them grounded. NEVER use melodramatic, theatrical, or tragic extremes.
- STRATEGY A (The Quiet Observation): Start by describing a very specific, mundane, everyday action that reveals a deeper psychological state. Validate the viewer's quiet reality immediately without judging it or making it sound like a crisis.
- STRATEGY B (The Gentle Confrontation): Start with a mild, counter-intuitive truth about human behavior that challenges a common societal expectation, delivered with warmth and understanding.

STRICT PROHIBITION: You MUST NEVER start the script with the words "Imagine", "Picture this", "Think about", or "Have you ever". 
MANDATORY VARIETY: You must invent your own unique, everyday scenarios that perfectly match the specific context of the video. Do not rely on repetitive tropes. Keep the audience engaged with fresh, earthly situations.

THE CONFLICT (FRICTION, NOT ENEMIES): 
Instead of framing the modern world, social media, or biology as an active "Enemy", frame them as "Environmental Friction" or "Noise." The viewer isn't under attack; their brain is simply trying to adapt to an overstimulated environment. Focus on the internal friction this causes.

DON'T TELL (SHOW THE PSYCHOLOGY): 
Present psychological concepts as tangible, daily scenarios. Describe the physical and emotional sensations of a struggle using highly relatable, grounded examples instead of clinical terms. Make the viewer feel seen through everyday details.

IDIOLECT AND TONE (CRITICAL): 
Use a warm, analytical, but relaxed tone. It should sound like a deeply understanding, highly observant friend explaining something fascinating about human nature while sitting in your living room. Use accessible, earthly, and direct vocabulary. 
CRITICAL AVOIDANCE: STRICTLY AVOID theatrical drama, poetic heaviness, robotic writing, or AI marketing words (e.g., "delve into", "unlock", "crucial", "mind-blowing", "shattering", "void", "game-changer"). Write exactly like a real, grounded human.

DYNAMIC RETENTION INJECTION: 
- Contextual CTA (Call to Action): Make an organic pause just before revealing an important concept. Dynamically mix your calls to action (e.g., asking to subscribe, or asking them to drop a comment about their experience). Tie the action directly to the emotional relief of the topic. Insert the exact tag [CTA] right before this paragraph.
- Factual Open Loop (Zeigarnik Effect): Tease a counter-intuitive reality early on to be resolved naturally later in the script.
- Fourth Wall Break: Ask direct, conversational rhetorical questions to the viewer.

END SCREEN INTEGRATION (WATCH CHAIN): 
Available videos for recommendation: {{ AVAILABLE_VIDEOS }} 
1. Create a transition ONLY if a REAL title from the list fits naturally. 
2. DO NOT invent hypothetical video topics. 
3. If NO match fits: Ask a highly specific, provocative question related to the pain point discussed and explicitly tell the viewer to answer in the comments. DO NOT write a generic goodbye.
4. (VERY CRITICAL): If a match IS found: You MUST write a definitive verbal bridge telling the viewer to watch the next video. NEVER say the actual title out loud. Instead, refer to its core concept naturally and explicitly instruct them to click. For example: "The video on your screen explains exactly why this happens..." or "Click the video on your screen right now to understand how to fix it."
CRITICAL TAG PLACEMENT: The [SELECTED VIDEO] tag MUST NOT be written inside the main story.

LENGTH AND DEPTH MANDATE: You must generate a comprehensive script of at least 1,200 to 1,500 words. DO NOT reach this length by adding complex vocabulary, poetic fluff, or repeating the same idea. Instead, expand by deepening the storytelling. Walk the viewer through detailed, highly relatable internal dialogues. Provide multiple distinct, everyday examples of the psychological concept in action before explaining the science behind it. Take your time to build the conversational context.

FORMAT RULES: 
- Write solid, cohesive paragraphs containing 3 to 4 complete sentences. STRICTLY PROHIBITED to write isolated, single-sentence paragraphs. Grouping sentences is required for the TTS engine to build a natural momentum and flow.
- Write ONLY the exact text the voiceover artist will say. 

EXCEPTIONS (TAGS): 
- [IMG]: Insert dynamically (aim for 20 to 30 times total) to maintain visual pacing. Place it organically mid-paragraph or between shifting ideas, not just at the end of paragraphs.
- [CHAPTER: Name]: Insert chapter tags naturally where topics shift.
- [CTA]: Insert right before your contextual call to action paragraph.

TTS NATURAL PROSODY RULES (MANDATORY):
To ensure the voiceover reads at a normal, engaging pace without sounding exhausted, apply these rules:
1. STANDARD PUNCTUATION (THE MOMENTUM RULE): Connect your ideas using standard periods (.) and commas (,). This is the only way the TTS engine can maintain a normal conversational speed. Let the periods do the work of pacing the voice.
2. NO COLONS/SEMICOLONS: You are STRICTLY FORBIDDEN from using colons (:) or semicolons (;). 
3. ELLIPSES SCARCITY (CRITICAL): DO NOT replace periods with ellipses (...) or em dashes (—). Using them at the end of sentences breaks the pacing and makes the audio painfully slow. You are only allowed to use ellipses 2 or 3 times in the ENTIRE script for major, deliberate pauses.
4. THE QUESTION MARK TRIGGER: EVERY SINGLE TIME you type a question mark (?), you MUST append ellipses exactly after it like this: "?..." 
5. SENTENCE LENGTH: Write a mix of medium and short sentences. Avoid run-on sentences.

MANDATORY RESPONSE FORMAT: Return ONLY the [STRUCTURED STORY] (The complete final script in English here, strictly including your [IMG], [CHAPTER: Name], and [CTA] tags). No markdown intro or outro. Include emotion tags like [excitedly] inside the text if needed.`,
    voiceInstructions: 'Speak in a very calm, warm, and empathetic tone. Pace should be comfortable, pausing slightly at important emotional beats.',
    packagingPrompt: `=Role: Act as an expert Art Director, Growth Hacker, and YouTube SEO expert for a "faceless" psychology and mental health channel.
Task: Read the complete script and generate BOTH the video packaging AND a chronological list of visual scene prompts in a SINGLE JSON response.

--- PART 1: VIDEO PACKAGING RULES ---
TARGET MARKET: Global English-speaking audience dealing with modern stress, anxiety, productivity issues, or identity crisis.
TONE: Deeply relatable, provocative, and empathetic. 

DELIVERABLES (EXACT JSON STRUCTURE FOR PACKAGING):
All values generated inside the JSON must be entirely in English.

"titulos_sugeridos": An array of 4 viral, attractive, and high CTR titles based strictly on the provided script. 

CRITICAL RULE 1 (THE VIRAL ANCHOR RULE): Look at the "ORIGINAL VIRAL TITLE" provided at the end of this prompt. You MUST extract the specific, everyday action, object, or situation used in that original title. You MUST RETAIN these exact concrete nouns and actions in your 4 new titles. Do not replace the concrete relatable action with a vague psychological term. Keep the original viral hook alive, just optimize the phrasing around it for maximum CTR and curiosity.

CRITICAL RULE 2 (THE VIRAL CLONE MANDATE): You MUST analyze the exact grammatical structure, psychological angle, and phrasing pattern of the "ORIGINAL VIRAL TITLE" provided below. 
- If the original title is a negative warning (e.g., about people who NEVER do something), your 4 titles MUST follow that exact negative warning pattern. 
- If the original is a paradox, yours must be a paradox. 
Clone the structural DNA of the original title, adapt it to English, and optimize it for maximum CTR. DO NOT use generic YouTube title templates. Let the original title dictate the format.

CRITICAL RULE 3: Use highly emotional and relatable keywords (exhausted, lonely, overthinking, gifted, trapped, silent) ONLY IF they naturally compliment the concrete action.

"titulo_ganador": "From the 4 generated titles, select the absolute best one for maximizing CTR and emotional resonance. Output ONLY that exact title here without any extra text or numbers."

"etiquetas": Array of 15 relevant SEO tags for the psychology/mental health niche.
"video_recomendado": Look at the top of the text provided. Find the tag [SELECTED VIDEO]. Extract the EXACT title written there. If it says "Ninguno", output "Ninguno".

"concepto_visual": "Professional YouTube Thumbnail Illustrator prompt for direct AI generation. 
  INSTRUCTIONS FOR THE AI: 
  1. Use the character design provided by the user for consistency. 
  2. ALIGNMENT RULE (CRITICAL): Read the 'titulo_ganador'. The visual concept MUST strictly represent its concrete action. 
  3. Invent 3 to 5 highly clickable words for the text integration. 
  4. Invent a thematic background setting. 
  5. Invent 2 to 3 THEMATIC METAPHOR OBJECTS directly tied to the title's action. 
  6. Generate a SINGLE, CONCISE PROMPT PARAGRAPH integrating all elements below. DO NOT output section headers or labels. Just write the continuous prompt.

  PROMPT ELEMENTS TO COMBINE: 
  Aesthetic & Dynamic Palette: High-quality bright, airy 2D digital illustration mimicking soft watercolor and thin black ink line art. Very pale, desaturated pastel coloring. Well-lit daylight atmosphere. CRITICAL: Vary the background pastel tones based on the scene's mood (e.g., pale earthy warms, soft greens, light grays, faded yellows). DO NOT default to only light blue.
  Text Integration: Add MASSIVE bold black text reading \\"[INSERT 3-5 CLICKBAIT WORDS]\\" inside a solid, bright yellow rectangular highlight box. Place this text box dynamically (up, top, center, left, or right) where it fits best without obstructing the main subject. Clean GIANT ultra-bold sans-serif font. 
  Character (NO HUMANS): The Expressive Bean character (flat pale grayish-green, thin black outlines, subtle watercolor flat shading). Fills 50-60% of foreground. Exaggerated emotion. DO NOT make it 3D. 
  Antagonist Shadows (If needed): Light, semi-transparent flat 2D shadow figures with clean outlines and pale watercolor washes. 
  Scene Logic & Objects: The Bean interacts with [INSERT OBJECTS]. Objects MUST BE GIGANTIC in the foreground, matching the 2D ink style. 
  Object Text (SYNTAX RULE): If an object has a label, use exact syntax: labeled \\"TEXT\\". Bold legible black text seamlessly integrated. 
  Selective Color Pop & Allies: The overall scene is very pale, but use a SINGLE slightly more vibrant/saturated color ONLY on a critical element of the foreground objects. IF there is a positive companion or 'solution' element, it emits a soft, subtle warm glow (pale gold), not competing with the main color pop.
  Technical Tags: Bright 2D digital illustration, soft watercolor style, thin black ink line art, dynamic pale flat pastel colors, clean composition, high contrast typography, yellow text box, selective color pop, NO 3D, 8k resolution, wide shot." 


"descripcion": A short, persuasive 1-paragraph description. End with a highly natural, empathetic call to action. Write like a real human. DO NOT use \\n symbols; use normal spaces.

"nombres_capitulos": An array of strings with logical chapter titles. DO NOT WRITE NUMBERS, TIMESTAMPS, OR "00:00".

"escenas_visuales": An array of strings containing the chronological list of visual scene prompts. (CRITICAL: All generated scene descriptions MUST go inside this array).

"playlist_sugerida": "Select the best fit from: [The Overthinker's Guide, Behavioral Psychology, Identity & Personality, The Dark Side of Productivity]. Base your choice on the NEW angle of the script."

PART 2: VISUAL SCENE PROMPTS RULES ---
CRITICAL RULE FOR "escenas_visuales" ARRAY LENGTH:
Count the exact number of [CAMBIO DE IMAGEN] tags in the script. You MUST generate exactly that number PLUS ONE. DO NOT mismatch this mathematical rule.

 RULES FOR THE PROMPTS (IMAGE DESCRIPTIONS): 
 - ALL PROMPTS STRICTLY IN ENGLISH. 
 - AESTHETIC RULE: Every prompt must explicitly request "bright 2D digital illustration, thin black ink line art, soft watercolor textures, pale flat pastel colors, well-lit daylight, Expressive Bean character with black outlines (NO HUMANS), clean composition, NO 3D". 
 - DYNAMIC PALETTE & COLOR POP: Vary the pale watercolor background tones based on the emotion (avoid defaulting to only light blue). Use a SINGLE slightly more vibrant color ONLY on a critical object for emphasis. Allies or positive solutions should emit a soft pale gold glow.
 - EMOTIONAL METAPHORS: Describe emotions within the bright, line-art watercolor scene. Use visual metaphors, not literal darkness or heavy shadows. 
 - GLOBAL UNIVERSALITY: Universal feelings, no specific countries. 
 - TOTAL PROHIBITION OF PROPER NAMES. 

 TEXT INTEGRATION RULE (CONTEXTUAL TEXT & EXACT SYNTAX): 
 When the script introduces a core concept (e.g., 'IMPOSTOR', 'BURNOUT'), prioritize scenes that include a clean 2D illustrated sign, a book, or an object reflecting that exact text. 
 - EXPLICIT SYNTAX MANDATE: You MUST use the exact phrasing \`labeled "TEXT"\` or \`reading "TEXT"\` (e.g., a heavy rock labeled "EXPECTATIONS"). Keep the text simple and bold (do not use the yellow background box for these inner scenes). 

 PROMPT STRUCTURE (Write as a single continuous paragraph, no section headers): 
 [Subject/Environment with dynamic pale watercolor background], [Visual Metaphor/Action in 2D flat illustration], [Lighting/Colors: Bright airy pastel palette, selective vibrant color pop on one object, soft pale gold glow for allies], [Visual style: bright 2D digital illustration, thin black ink line art, soft watercolor textures, pale flat pastel colors, clean composition, Expressive Bean character, NO 3D, NO REALISTIC HUMANS]. (Use faceless silhouettes ONLY for Antagonist Shadows if needed)].`,
    visualPromptInstructions: `Generate Midjourney prompts focused on minimalist 2D flat vector illustrations without realistic humans. 
Aesthetic & Dynamic Palette: High-quality bright, airy 2D digital illustration mimicking soft watercolor and thin black ink line art. Very pale, desaturated pastel coloring. Well-lit daylight atmosphere. Vary background pastel tones based on mood. 
Character (NO HUMANS): The Expressive Bean character (flat pale grayish-green, thin black outlines, subtle watercolor flat shading). 
Antagonist Shadows (If needed): Light, semi-transparent flat 2D shadow figures. 
Selective Color Pop: Use a SINGLE slightly more vibrant/saturated color ONLY on a critical element. Positive solutions emit a soft pale gold glow. 
Technical Tags: Bright 2D digital illustration, soft watercolor style, thin black ink line art, dynamic pale flat pastel colors, clean composition, NO 3D, 8k resolution, wide shot.
Text Integration: If an object has a label, use exact syntax: labeled "TEXT".`,
    filterInstructions: `REJECT (false) IF:
- It is a highly specific, personal story or daily vlog that cannot be generalized to a universal audience.
- It is a purely clinical, dense medical lecture (e.g., deep neurochemistry without practical application) that would bore a general audience.
- It is tied to ephemeral pop-culture drama or celebrity gossip that will be irrelevant next month.
- It provides dangerous, literal medical advice or attempts to clinically diagnose the viewer with severe psychiatric disorders.

APPROVE (true) IF:
- The script explains universal human experiences (e.g., anxiety, overthinking, loneliness, burnout, procrastination, impostor syndrome).
- The content analyzes behavioral psychology, stoicism, or the philosophies of famous thinkers (e.g., Carl Jung, Marcus Aurelius) applied to modern daily life.
- It is a "List" or "Signs you are..." video that provides identity validation (e.g., "5 signs you are a highly sensitive person").
- The content contains older cultural references, BUT the underlying psychological mechanic or strategy can still be extracted and taught today (Evergreen potential).`,
    variantsPrompt: `Actúa como un Consultor Creativo de YouTube y Copywriter Experto. Analiza la transcripción original y el título del video.
Tu objetivo es darme alternativas de títulos ultra magnéticos y una breve idea de cómo abordar el nuevo guion.
Genera un JSON ESTRUCTURADO (Array de objetos) con "title" (máx 60 chars) e "idea" (breve descripción).
El sistema revisará el título y el guion para ajustarse a tu instrucción (ej: si pides 5 o 10 alternativas). Busca máxima viralidad y ángulos frescos.`,
    variantScriptPrompt: `Role: Act as an expert YouTube retention analyst and scriptwriter for "faceless" psychology mini-documentaries. 

Task: Write a COMPLETELY NEW script in ENGLISH based on the provided VARIANT (TITLE & IDEA) and using the original text as CONTEXT. Focus on natural storytelling and relatable observations.

[INSERT STYLE MANUAL AND FORMATTING RULES HERE]`
  },
  finanzas: {
    id: 'finanzas',
    name: 'Finanzas',
    tone: 'profesional, directo, educativo, dinámico',
    prompt: 'Actúa como un consultor financiero experto. El guion debe ser claro, basado en datos, con un ritmo rápido pero comprensible. Enfócate en el valor y la acción.',
    voiceInstructions: 'Speak in a professional, direct, and slightly energetic tone. Convey confidence and authority.',
    packagingPrompt: 'Generate 4 viral titles, a winning title, 15 SEO tags, visual thumbnail concept, and a 1-paragraph description based on the financial script. Output in JSON format.',
    visualPromptInstructions: 'Generate prompts for sleek, modern diagrams or abstract representations of financial growth, using a professional color palette like deep blues and gold.',
    filterInstructions: 'APPROVE IF content provides clear value on economics, money generation, or saving. REJECT IF crypto gambling or get-rich-quick scams.',
    variantScriptPrompt: 'Actúa como un experto en finanzas. Desarrolla el guion basado en la variante seleccionada, manteniendo el enfoque en la educación financiera y la acción.'
  },
  historias: {
    id: 'historias',
    name: 'Historias / Misterio',
    tone: 'narrativo, misterioso, envolvente, dramático',
    prompt: 'Actúa como un narrador de historias de suspenso. Usa el "storytelling" para crear tensión. El ritmo debe variar para enfatizar momentos de revelación.',
    voiceInstructions: 'Act as a storyteller. Use a mysterious, immersive, and slightly dramatic tone. Vary the pace to build tension.',
    packagingPrompt: 'Generate 4 mysterious titles, a winning title, 15 SEO tags, atmospheric visual thumbnail concept, and a compelling 1-paragraph description based on the mystery script. Output in JSON format.',
    visualPromptInstructions: 'Generate prompts for moody, cinematic, dark-themed illustrations with high contrast, suited for mystery and storytelling.',
    filterInstructions: 'APPROVE IF content has narrative structure, curiosity hooks, or historical facts. REJECT IF boring or unrelated.',
    variantsPrompt: `Actúa como un experto en el nicho de historias de psicología y misterio (estilo 'The Psychology of Everything'). Analiza la historia original y propón 4 ángulos narrativos únicos:
1. El ángulo del Secreto Oculto.
2. El ángulo de la Paradoja Psicológica.
3. El ángulo del Testigo Silencioso.
4. El ángulo de la Verdad Incómoda.
Genera JSON: [{ "title": "...", "idea": "..." }]`,
    variantScriptPrompt: `Actúa como un guionista senior de documentales de misterio y psicología. 
Desarrolla la historia completa basada en la variante elegida. 
Manten un tono de suspense, utiliza ganchos narrativos en cada capítulo y asegúrate de que el clímax psicológico sea impactante.
Usa el manual de estilo para el formato de etiquetas [IMG], [CHAPTER] y [CTA].`
  }
};

const formatJsonToBeautifulText = (obj: any): string => {
  if (!obj || typeof obj !== 'object') return String(obj);
  
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object') return JSON.stringify(item, null, 2);
      return String(item);
    }).join('\n');
  }

  const lines: string[] = [];
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  
  const keyLabelMap: Record<string, string> = {
    titulos_sugeridos: "🎯 SUGGESTED TITLES",
    suggested_titles: "🎯 SUGGESTED TITLES",
    titles: "🎯 SUGGESTED TITLES",
    titulos: "🎯 SUGGESTED TITLES",
    suggestedtitles: "🎯 SUGGESTED TITLES",
    
    titulo_ganador: "🏆 WINNER TITLE",
    winner_title: "🏆 WINNER TITLE",
    winner: "🏆 WINNER TITLE",
    best_title: "🏆 WINNER TITLE",
    winnertitle: "🏆 WINNER TITLE",
    
    nombres_capitulos: "📚 CHAPTERS",
    chapters: "📚 CHAPTERS",
    capitulos: "📚 CHAPTERS",
    chapternames: "📚 CHAPTERS",
    chapter_names: "📚 CHAPTERS",
    
    descripcion: "✍️ DESCRIPTION",
    description: "✍️ DESCRIPTION",
    
    etiquetas: "🏷️ TAGS",
    tags: "🏷️ TAGS",
    
    video_recomendado: "▶️ RECOMMENDED VIDEO",
    recommended_video: "▶️ RECOMMENDED VIDEO",
    recommendedvideo: "▶️ RECOMMENDED VIDEO",
    
    suggested_playlist: "📂 SUGGESTED PLAYLIST",
    playlist: "📂 SUGGESTED PLAYLIST",
    lista_de_reproduccion: "📂 SUGGESTED PLAYLIST",
    suggestedplaylist: "📂 SUGGESTED PLAYLIST",
    
    concepto_visual: "🖼️ VISUAL CONCEPT & THUMBNAIL",
    visual_concept: "🖼️ VISUAL CONCEPT & THUMBNAIL",
    thumbnail: "🖼️ VISUAL CONCEPT & THUMBNAIL",
    visualconcept: "🖼️ VISUAL CONCEPT & THUMBNAIL",
    
    escenas_visuales: "🎬 VISUAL SCENE PROMPTS",
    visual_scenes: "🎬 VISUAL SCENE PROMPTS",
    scenes: "🎬 VISUAL SCENE PROMPTS",
    prompts: "🎬 VISUAL SCENE PROMPTS",
    visualscenes: "🎬 VISUAL SCENE PROMPTS"
  };

  for (const [key, val] of Object.entries(obj)) {
    const cleanKey = key.toLowerCase().replace(/[\s_-]/g, '').trim();
    const label = keyLabelMap[cleanKey] || `${capitalize(key.replace(/_/g, ' '))}`;
    
    lines.push(`${label}:`);
    lines.push('');
    
    if (Array.isArray(val)) {
      if (cleanKey.includes('titles') || cleanKey.includes('titulos') || cleanKey.includes('chapters') || cleanKey.includes('capitulos') || cleanKey.includes('scenes') || cleanKey.includes('escenas')) {
        val.forEach((item) => {
          lines.push(`${item}`);
        });
      } else if (cleanKey.includes('tags') || cleanKey.includes('etiquetas')) {
        lines.push(`${val.join(', ')}`);
      } else {
        val.forEach(item => {
          if (typeof item === 'object') {
            lines.push(`${JSON.stringify(item)}`);
          } else {
            lines.push(`${item}`);
          }
        });
      }
    } else if (typeof val === 'object' && val !== null) {
      lines.push(JSON.stringify(val, null, 2));
    } else {
      lines.push(`${val}`);
    }
    lines.push('');
  }
  
  return lines.join('\n').trim();
};

const PrettyJsonDisplay = ({ text, placeholder, onChange }: { text: string, placeholder?: string, onChange?: (newText: string) => void }) => {
  if (!text) return <div className="text-slate-500 italic p-4 text-[11px] font-sans text-center">{placeholder || "Sin contenido"}</div>;

  let displayText = text;
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      displayText = formatJsonToBeautifulText(parsed);
    } catch(e) {
      // Fallback
    }
  }

  return (
    <textarea
      value={displayText}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-full bg-transparent text-sm text-white font-sans outline-none resize-none custom-scrollbar leading-relaxed"
    />
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeProject, setActiveProject] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [niches, setNiches] = useState<Record<string, NicheConfig>>(DEFAULT_NICHES);
  const [activeTab, setActiveTab] = useState<'projects' | 'studio' | 'settings' | 'radar'>('studio');
  const [activeWorkspace, setActiveWorkspace] = useState('psicologia');
  const [appTheme, setAppTheme] = useState(() => localStorage.getItem('appTheme') || 'carbon');
  const [newQueueUrl, setNewQueueUrl] = useState('');
  const [queueVoice, setQueueVoice] = useState('Kore');
  const [queueLanguage, setQueueLanguage] = useState('en-US');

  useEffect(() => {
    localStorage.setItem('appTheme', appTheme);
    const theme = APP_THEMES.find(t => t.id === appTheme) || APP_THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--color-cyan-100', theme.colors[100]);
    root.style.setProperty('--color-cyan-400', theme.colors[400]);
    root.style.setProperty('--color-cyan-500', theme.colors[500]);
    root.style.setProperty('--color-cyan-600', theme.colors[600]);
    
    // Set backgrounds if available in the theme
    if (theme.bg) {
      root.style.setProperty('--bg-base', theme.bg.base);
      root.style.setProperty('--bg-panel', theme.bg.panel);
      root.style.setProperty('--bg-card', theme.bg.card);
      if (theme.bg.surface) root.style.setProperty('--bg-surface', theme.bg.surface);
      if (theme.bg.border) root.style.setProperty('--border-base', theme.bg.border);
    } else {
      // Fallbacks
      root.style.setProperty('--bg-base', '#0a0a0b');
      root.style.setProperty('--bg-panel', '#0c0c0e');
      root.style.setProperty('--bg-card', '#111114');
      root.style.setProperty('--bg-surface', '#1e293b');
      root.style.setProperty('--border-base', '#1e293b');
    }
  }, [appTheme]);

  // Variants state
  const [isVariantsMode, setIsVariantsMode] = useState(false);
  const [scriptVariants, setScriptVariants] = useState<ScriptVariant[] | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);

  // Editing niches
  const [editingNiche, setEditingNiche] = useState<NicheConfig | null>(null);
  const [queueMode, setQueueMode] = useState<'directo' | 'variantes'>('directo');

  const getCleanTtsScript = (text: string, mode: 'tts_marks' | 'tts_clean' = 'tts_marks') => {
    if (!text) return '';
    let cleaned = text
      .replace(/```[A-Za-z]*\n?/g, '')
      .replace(/`/g, '')
      .replace(/^-{3,}\s*$/gm, '')
      .replace(/\[IMG\]/gi, '')
      .replace(/\[CTA\]/gi, '')
      .replace(/\[CAPITULO:.*?\]/gi, '')
      .replace(/\[CHAPTER:.*?\]/gi, '')
      .replace(/\[CAMBIO DE IMAGEN\]/gi, '')
      .replace(/\[SELECTED VIDEO\]/gi, '')
      .replace(/\[STRUCTURED STORY\]/gi, '')
      .replace(/^[ \t]+/gm, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    if (mode === 'tts_clean') {
      const match = cleaned.match(/^(\[[A-Za-z0-9_\s,.\-]+\])/);
      const firstTag = match ? match[1] : '';
      if (firstTag) {
        cleaned = cleaned.substring(firstTag.length);
      }
      cleaned = cleaned.replace(/\[.*?\]/g, '').trim();
      if (firstTag) {
        cleaned = firstTag + '\n' + cleaned;
      }
    }
    return cleaned;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      getLocalHistory().then(setHistory);
      const saved = localStorage.getItem('customNiches');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNiches({ ...DEFAULT_NICHES, ...parsed });
        } catch (e) {
          console.warn("Failed to load local niches");
        }
      }
      return;
    }

    setIsSyncing(true);
    const qProjects = query(collection(db, 'users', user.uid, 'projects'));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as HistoryItem);
      // Ensure history is ALWAYS sorted by date descending (newest first)
      setHistory(docs.sort((a, b) => b.date - a.date));
      setIsSyncing(false);
    });

    const qNiches = query(collection(db, 'users', user.uid, 'niches'));
    const unsubNiches = onSnapshot(qNiches, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data() as NicheConfig);
      const nicheMap = { ...DEFAULT_NICHES };
      docs.forEach(n => { (nicheMap as any)[n.id] = n; });
      setNiches(nicheMap);
    });

    return () => {
      unsubProjects();
      unsubNiches();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = () => signOut(auth);

  const saveHistory = async (item: HistoryItem) => {
    if (user) {
      const itemWithUser = { ...item, userId: user.uid };
      await setDoc(doc(db, 'users', user.uid, 'projects', item.id), itemWithUser);
    } else {
      await saveLocalHistory(item);
      loadHistory();
    }
  };

  const [bulkImportText, setBulkImportText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);

  const handleBulkImport = async () => {
    const lines = bulkImportText.split('\n').filter(l => l.trim().length > 3);
    if (lines.length === 0) return;

    for (const titleStr of lines) {
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const newItem: HistoryItem = {
        id,
        workspaceId: activeWorkspace,
        date: Date.now(),
        title: titleStr.trim(),
        originalTitle: titleStr.trim(),
        youtubeUrl: '',
        status: 'Pendiente',
        originalTranscript: '',
        script: '',
        enhancedScript: '',
        voice: queueVoice,
        language: queueLanguage,
        timestamps: '',
        packaging: '',
        visualPrompts: ''
      };

      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'projects', id), newItem);
      } else {
        const local = localStorage.getItem('localHistory');
        const historyList = local ? JSON.parse(local) : [];
        localStorage.setItem('localHistory', JSON.stringify([newItem, ...historyList]));
      }
    }
    setBulkImportText('');
    setShowBulkImport(false);
    loadHistory();
  };

  const updateProjectTitle = async (id: string, newTitle: string) => {
    if (user) {
      await updateDoc(doc(db, 'users', user.uid, 'projects', id), { title: newTitle });
    } else {
      const local = localStorage.getItem('localHistory');
      if (local) {
        const parsed = JSON.parse(local);
        const updated = parsed.map((p: any) => p.id === id ? { ...p, title: newTitle } : p);
        localStorage.setItem('localHistory', JSON.stringify(updated));
      }
    }
    loadHistory();
    setEditingTitleId(null);
  };

  const deleteHistory = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'projects', id));
      // Local history updating immediately to avoid UI flashing or waiting for snapshot bounce
      setHistory(prev => prev.filter(p => p.id !== id));
    } else {
      await deleteLocalHistory(id);
      loadHistory();
    }
  };

  const saveNiche = async (niche: NicheConfig) => {
    if (user) {
      const nicheWithUser = { ...niche, userId: user.uid };
      await setDoc(doc(db, 'users', user.uid, 'niches', niche.id), nicheWithUser);
    } else {
      const newNiches = { ...niches, [niche.id]: niche };
      setNiches(newNiches);
      localStorage.setItem('customNiches', JSON.stringify(newNiches));
    }
    setEditingNiche(null);
  };

  const deleteNiche = async (id: string) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'niches', id));
    } else {
      const newNiches = { ...niches };
      delete newNiches[id];
      setNiches(newNiches);
      localStorage.setItem('customNiches', JSON.stringify(newNiches));
    }
    if (activeWorkspace === id) {
      setActiveWorkspace('psicologia');
    }
  };
  
  // Real usage tracking persisted
  const [apiUsage, setApiUsage] = useState({ flash: 0, tts: 0, lite: 0 });

  useEffect(() => {
    if (!user) {
      const today = new Date().toDateString();
      const storedDate = localStorage.getItem('apiUsageDate');
      const storedUsage = localStorage.getItem('apiUsage');

      if (storedDate === today && storedUsage) {
        try {
          const parsed = JSON.parse(storedUsage);
          setApiUsage({ flash: parsed.flash || 0, tts: parsed.tts || 0, lite: parsed.lite || 0 });
        } catch (e) {
          console.warn("Failed to parse apiUsage");
        }
      } else {
        const initialUsage = { flash: 0, tts: 0, lite: 0 };
        setApiUsage(initialUsage);
        localStorage.setItem('apiUsageDate', today);
        localStorage.setItem('apiUsage', JSON.stringify(initialUsage));
      }
      return;
    }

    // Cloud Sync: Usage
    const qUser = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(qUser, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const today = new Date().toDateString();
        if (data.lastResetDate === today && data.apiUsage) {
          setApiUsage(data.apiUsage);
        } else {
          const initialUsage = { flash: 0, tts: 0, lite: 0 };
          setApiUsage(initialUsage);
          setDoc(doc(db, 'users', user.uid), { 
            apiUsage: initialUsage, 
            lastResetDate: today,
            email: user.email,
            uid: user.uid
          }, { merge: true });
        }
      }
    });

    return () => unsubUser();
  }, [user]);

  const incrementUsage = async (type: 'flash' | 'lite' | 'tts') => {
    setApiUsage(prev => {
      const next = { ...prev, [type]: prev[type] + 1 };
      if (!user) {
        localStorage.setItem('apiUsage', JSON.stringify(next));
      }
      return next;
    });

    if (user) {
      const today = new Date().toDateString();
      await setDoc(doc(db, 'users', user.uid), { 
        apiUsage: { ...apiUsage, [type]: apiUsage[type] + 1 },
        lastResetDate: today
      }, { merge: true });
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string = 'general') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    addLog("Copiado al portapapeles.");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [serverStatus, setServerStatus] = useState<{version: string, apify: boolean} | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [studioSidebarOpen, setStudioSidebarOpen] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/version');
        const data = await res.json();
        setServerStatus({ version: data.version, apify: data.apifyReady });
        addLog(`Backend conectado: ${data.version}`);
        if (!data.apifyReady) {
          addLog("AVISO: APIFY_API_TOKEN no detectada. Fallback desactivado.");
        }
      } catch (e) {
        addLog("Error conectando con el backend API.");
      }
    };
    checkServer();
  }, []);
  const [showLogs, setShowLogs] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const [targetLanguage, setTargetLanguage] = useState('en-US');

  const [isViewOnly, setIsViewOnly] = useState(false);

  // Studio states (synced with activeProject when saved)
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [enhancedScript, setEnhancedScript] = useState('');
  const [title, setTitle] = useState('');
  const [voice, setVoice] = useState('Kore');
  const [language, setLanguage] = useState('es');
  const [packaging, setPackaging] = useState('');
  const [visualPrompts, setVisualPrompts] = useState('');
  const [timestamps, setTimestamps] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [paragraphAudios, setParagraphAudios] = useState<{ text: string; url: string; index: number }[]>([]);
  const [ttsModel, setTtsModel] = useState('gemini-3.1-flash-tts-preview');

  const [isProcessing, setIsProcessing] = useState<string | null>(null); // 'transcript' | 'script' | 'packaging' | 'audio'
  const [activeStep, setActiveStep] = useState<number>(1);
  const [progress, setProgress] = useState(0);
  const [scriptTab, setScriptTab] = useState<'full' | 'tts_marks' | 'tts_clean'>('full');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [editingOriginalId, setEditingOriginalId] = useState<string | null>(null);
  const [tempOriginal, setTempOriginal] = useState('');
  const [autoQueueEnabled, setAutoQueueEnabled] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    localStorage.setItem('active_studio_url', youtubeUrl || '');
  }, [youtubeUrl]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (!user) {
      const data = await getLocalHistory();
      setHistory(data.sort((a, b) => b.date - a.date));
    }
  };

  const getSortedHistory = () => {
    return [...history].sort((a, b) => b.date - a.date);
  };

  const addToQueue = async () => {
    if (!newQueueUrl.trim()) return;
    
    let cleanedUrl = newQueueUrl.trim();
    const urlMatch = cleanedUrl.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
       cleanedUrl = urlMatch[0];
    }

    const newProj: HistoryItem = {
      id: crypto.randomUUID(),
      workspaceId: activeWorkspace,
      date: Date.now(),
      title: 'Recuperando título original...',
      originalTitle: 'Recuperando título original...',
      youtubeUrl: cleanedUrl,
      status: 'Pendiente',
      originalTranscript: '',
      script: '',
      enhancedScript: '',
      voice: queueVoice,
      language: queueLanguage,
      ttsModel: 'gemini-3.1-flash-tts-preview',
      timestamps: '',
      isVariantsMode: queueMode === 'variantes'
    };
    
    // Save placeholder instantly to UI
    await saveHistory(newProj);
    setNewQueueUrl('');
    loadHistory();

    // Background fetch to avoid blocking the UI
    try {
      fetch(`/api/yt-info?url=${encodeURIComponent(cleanedUrl)}`)
        .then(async (res) => {
          if (res.ok) {
             const data = await res.json();
             if (data.title) {
                const updatedProj = { ...newProj, originalTitle: data.title, title: data.title };
                await saveHistory(updatedProj);
                loadHistory();
                return;
             }
          }
          throw new Error('Title not found');
        })
        .catch(async () => {
            const updatedProj = { ...newProj, originalTitle: 'Título Desconocido', title: 'Título Desconocido' };
            await saveHistory(updatedProj);
            loadHistory();
        });
    } catch (e) {
      console.warn("Failed background fetch", e);
    }
  };

  const insertManualField = async () => {
    const newProj: HistoryItem = {
      id: crypto.randomUUID(),
      workspaceId: activeWorkspace === 'ALL' ? Object.keys(niches)[0] : activeWorkspace,
      date: Date.now(),
      title: 'Título Nuevo (Clic para editar)',
      originalTitle: 'URL o Idea Original (Clic para editar)',
      youtubeUrl: '',
      status: 'Pendiente',
      originalTranscript: '',
      script: '',
      enhancedScript: '',
      voice: queueVoice,
      language: queueLanguage,
      ttsModel: 'gemini-3.1-flash-tts-preview',
      timestamps: '',
      isVariantsMode: queueMode === 'variantes'
    };
    await saveHistory(newProj);
    loadHistory();
    addLog(`Campo manual añadido a la cola (${queueMode === 'variantes' ? 'Variantes' : 'Directo'}).`);
  };

  const copyNewTitles = async () => {
    const titles = getFilteredHistory(history, activeWorkspace)
      .filter(p => p.title && !p.title.includes('Recuperando') && !p.title.includes('Iniciando'))
      .map(p => p.title);
      
    if (titles.length === 0) {
      addLog("No hay títulos para copiar.");
      return;
    }
    await navigator.clipboard.writeText(titles.join('\n'));
    addLog(`Nuevos títulos copiados (${titles.length}).`);
  };

  const handleStartFromRadar = (url: string, title: string) => {
     setActiveTab('studio');
     setIsViewOnly(false);
     setYoutubeUrl(url);
     setTitle(title);
     setOriginalTranscript('');
     setEnhancedScript('');
     setPackaging('');
     setVisualPrompts('');
     setTimestamps('');
     setIsVariantsMode(false);
     setScriptVariants(null);
     setSelectedVariantIndex(0);
     setActiveProject(null); // start as "new but unsaved"
  };

  const runAutoPipeline = async (proj: HistoryItem) => {
    setActiveProject(proj);
    setActiveTab('studio');
    setYoutubeUrl(proj.youtubeUrl || '');
    setOriginalTranscript(proj.originalTranscript || '');
    setEnhancedScript(proj.enhancedScript || '');
    setPackaging(proj.packaging || '');
    setVisualPrompts(proj.visualPrompts || '');
    setTimestamps(proj.timestamps || '');
    setAudioUrl(proj.audioUrl || null);
    setParagraphAudios(proj.paragraphAudios || []);
    setLanguage(proj.language || 'es');
    setTargetLanguage(proj.language || 'es');
    setVoice(proj.voice || 'Kore');
    setTtsModel(proj.ttsModel || 'gemini-3.1-flash-tts-preview');
    setActiveWorkspace(proj.workspaceId);
    setTitle(proj.title || 'Iniciando Auto Pipeline...');
    setIsVariantsMode(proj.isVariantsMode || false);
    setScriptVariants(proj.scriptVariants || null);
    setSelectedVariantIndex(proj.selectedVariantIndex || 0);

    let currentProj = { ...proj, status: 'En Proceso' as any };
    const saveStateInfo = async (updates: Partial<HistoryItem>) => {
       currentProj = { ...currentProj, ...updates };
       setActiveProject(currentProj);
       await saveHistory(currentProj);
       loadHistory();
    };
    
    await saveProjectState({});

    try {
      console.log("Starting Auto Pipeline...");
      const ai = getAI();
      const langName = getLangName(currentProj.language);
      const nicheObj = niches[currentProj.workspaceId] || DEFAULT_NICHES['psicologia'];

      // 1. TRANSCRIPT
      let transcript = currentProj.originalTranscript;
      if (!transcript && currentProj.youtubeUrl) {
         setIsProcessing('transcript');
         addLog(`[Auto] Extrayendo: ${currentProj.youtubeUrl}`);
         const res = await fetch('/api/v2/transcript', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ url: currentProj.youtubeUrl })
         });
         
         if (!res.ok) throw new Error(`Transcript error: ${await res.text()}`);
         const data = await res.json();
         transcript = data.transcript;
         
         if (transcript && transcript.length > 20) {
            setOriginalTranscript(transcript);
            await saveProjectState({ originalTranscript: transcript });
            addLog(`[Auto] Transcripción Obtenida.`);
         } else {
            throw new Error("No se pudo obtener una transcripción válida.");
         }
      }

    // BREAKPOINT MODO EXPLORADOR
    if (currentProj.isVariantsMode && transcript && (!currentProj.scriptVariants || currentProj.scriptVariants.length === 0)) {
       setIsProcessing('variants');
       addLog(`[Auto] Modo Explorador Detectado: Generando ideas de ángulos...`);
       await generateVariants(transcript, currentProj.title);
       addLog(`[Auto] Ángulos listos. Entra al Studio para elegir uno.`);
       setIsProcessing(null);
       return;
    }

    // 2. IA CONTENT (Rewrite) Prep
      let enhanced = currentProj.enhancedScript;

      // 1.5 FILTER / GATEKEEPER
      if (transcript && !enhanced) {
          setIsProcessing('script');
          addLog(`[Auto] Evaluando viabilidad del video (Gatekeeper)...`);
          const filterCriteria = nicheObj.filterInstructions || "APPROVE (true) IF: the content is broadly useful. REJECT (false) IF: the content is spam or dangerous.";
          const filterPrompt = `Role: You are an expert Executive Producer acting as the ultimate filter (Gatekeeper).
Your job is to analyze the following video title and transcript to determine if it is viable for this channel.

TITLE: "${currentProj.title}"
TRANSCRIPT:
${transcript}

YOUR TASK:
${filterCriteria}

RESPONSE FORMAT:
Return ONLY a valid JSON object with your verdict. Zero conversational text. Do not use markdown blocks.
{
  "es_valido": true
}`;
         const filterRes = await ai.models.generateContent({
             model: "gemini-3-flash-preview",
             contents: filterPrompt
         });
         incrementUsage('lite');
         
         let filterText = filterRes.text || '';
         filterText = filterText.replace(/```json/gi, '').replace(/```/gi, '').trim();
         
         try {
             const filterObj = JSON.parse(filterText);
             if (filterObj.es_valido === false) {
                 await saveProjectState({ status: 'Hecho', title: `[RECHAZADO] ${currentProj.title}` });
                 addLog(`[Auto] Video RECHAZADO por el filtro. No es apto para este nicho.`);
                 setGlobalError("El video ha sido rechazado por el filtro heurístico del nicho. Procesamiento cancelado.");
                 setIsProcessing(null);
                 return;
             }
             addLog(`[Auto] Video Aprobado por el filtro.`);
         } catch(e) {
             addLog(`[Auto] No se pudo parsear el JSON del filtro, continuando por defecto...`);
         }

          if (!window.confirm("✅ GATEKEEPER APROBADO.\n\n¿Deseas que Gemini genere el GUION principal para este video?\n\n(Se consumirán tokens de Flash)")) {
              setIsProcessing(null);
              addLog(`[Auto] Detenido por el usuario.`);
              await saveProjectState({ status: 'Pendiente' });
              return;
          }

          setIsProcessing('script');
          addLog(`[Auto] Reescribiendo guion...`);
          
          const rewritePrompt = `
            STRICT LANGUAGE REQUIREMENT: Final script exclusively in ${langName}.
            
            === INSTRUCCIONES DE REESCRITURA (MODO AUTO) ===
            ${nicheObj.prompt}

            ORIGINAL SCRIPT:
            ${transcript}`;
          
          const rewriteRes = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: rewritePrompt
          });
          enhanced = rewriteRes.text || '';
          enhanced = enhanced.replace(/\*\*/g, '').replace(/#/g, '').trim();
          
          setEnhancedScript(enhanced);
          let newTitle = currentProj.title;
          if (!newTitle || newTitle === 'Recuperando título original...') {
             newTitle = "Proyecto Generado";
             setTitle(newTitle);
          }
          incrementUsage('flash');
          await saveProjectState({ enhancedScript: enhanced, title: newTitle });
          addLog(`[Auto] Guion reescrito con éxito.`);
      }

      // 3. PACKAGING
      let pack = currentProj.packaging;
      let vPrompts = currentProj.visualPrompts;
      if (!pack && enhanced) {
         setIsProcessing('packaging');
         addLog(`[Auto] Generando metadatos (Thumbnail & SEO)...`);
         const resPack = await runPackagingLogic(enhanced, nicheObj, langName);
         if (resPack) {
            pack = resPack.pack;
            await saveProjectState({ packaging: pack });
         }
      }
      
      if (!vPrompts && enhanced) {
         setIsProcessing('packaging');
         addLog(`[Auto] Generando Prompts Visuales...`);
         const resVis = await runVisualPromptsLogic(enhanced, nicheObj, langName);
         if (resVis) {
            vPrompts = resVis.visualPrompts;
            await saveProjectState({ visualPrompts: vPrompts });
         }
      }

      // 4. AUDIO & TIMESTAMPS
      if (enhanced && !currentProj.audioUrl) {
         if (!window.confirm("✅ GUION Y EMPAQUE LISTOS.\n\n¿Deseas generar la LOCUCIÓN final ahora?\n\n(Se consumirán tokens de TTS)")) {
             setIsProcessing(null);
             addLog(`[Auto] Pausado antes de locución.`);
             await saveProjectState({ status: 'Pendiente' });
             return;
         }

         setIsProcessing('audio');
         setProgress(0);
         addLog(`[Auto] Generando audio segmentado...`);
         
         const voiceInst = `${nicheObj.voiceInstructions}`;
         const segments = enhanced.split(/(\[IMG\]|\[CAPITULO:.*?\]|\[CHAPTER:.*?\]|\[CAMBIO DE IMAGEN\]|\[CTA\])/i);
         const audioPieces: Int16Array[] = [];
         let currentTime = 0;
         let tImg = ["--- TIEMPOS EXACTOS PARA EDICIÓN ---"];
         let tChapters = ["CAPÍTULOS:"];
         let hasFirstCap = false;
         let iCount = 0;

         const filteredSegs = segments.filter((s: string) => s.trim() !== '');
         const total = filteredSegs.length;

         let globalParaIndex = 0;

         for (let i = 0; i < total; i++) {
           const seg = filteredSegs[i].trim();
           const lower = seg.toLowerCase();
           if (lower === '[img]' || lower === '[cambio de imagen]') {
               iCount++;
               tImg.push(`Imagen ${iCount} -> ${formatTime(currentTime)}`);
           } else if (lower.startsWith('[cap') || lower.startsWith('[chapt') || lower === '[cta]') {
               const name = seg.replace(/\[(CAPITULO|CHAPTER):/i, '').replace(']', '').trim() || 'Sección';
               const time = hasFirstCap ? formatTime(currentTime) : "00:00";
               tChapters.push(`${time} ${name}`);
               hasFirstCap = true;
           } else {
             let clean = seg.replace(/\[(?:IMG|CTA|VISUAL|SCENE|B-ROLL).*?\]/gi, '');
             clean = clean.replace(/^[ \t]+/gm, '').trim();
             if (!clean) continue;
             
             const paragraphs = clean.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
             
             for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
               const paraText = paragraphs[pIdx];
               
               const baseProgress = (i / total) * 100;
               const innerProgress = (pIdx / paragraphs.length) * (100 / total);
               setProgress(Math.round(baseProgress + innerProgress));
               addLog(`[TTS] Generando párrafo ${pIdx + 1} de ${paragraphs.length} (Seg ${i+1}/${total})...`);
               
               try {
                  const pcm = await generateAudioWithRetry(ai, currentProj.ttsModel || 'gemini-3.1-flash-tts-preview', currentProj.voice, paraText, voiceInst);
                  if (pcm) {
                     const wavBlob = pcmToWav(pcm, 24000);
                     const storagePath = `historyItems/${currentProj.id}/audio/auto_${i}_p_${pIdx}.wav`;
                     const storageRef = ref(storage, storagePath);
                     let pUrl = '';
                     try {
                       await uploadBytes(storageRef, wavBlob);
                       pUrl = await getDownloadURL(storageRef);
                     } catch(err) {
                       pUrl = URL.createObjectURL(wavBlob);
                     }
                     
                     audioPieces.push(pcm);
                     setParagraphAudios(prev => [
                       ...prev.filter(pa => pa.index !== globalParaIndex),
                       { text: paraText, url: pUrl, index: globalParaIndex }
                     ]);
                     
                     currentTime += pcm.length / 24000;
                  }
               } catch (e: any) {
                  const msg = e.message || String(e);
                  addLog(`[Error Fatal Auto-TTS]: ${msg}`);
                  if (msg.includes("403") || msg.includes("404") || msg.includes("API Key") || msg.includes("permisos")) {
                     throw new Error(`Se aborta locución por error crítico (API Key o Modelo no hallado): ${msg}`);
                  }
               }
               
               globalParaIndex++;
               await new Promise(r => setTimeout(r, 4500));
             }
           }
           setProgress(Math.round(((i + 1) / total) * 100));
           incrementUsage('tts');
         }

         if (audioPieces.length > 0) {
            const finalPcm = combinePcms(audioPieces);
            const wavUrl = await pcmToWavBase64(finalPcm);
            const url = wavUrl;
            const tsText = [...tImg, "", ...tChapters].join("\n");
            
            setAudioUrl(url);
            setTimestamps(tsText);
            setParagraphAudios(prev => {
              const currentParas = [...prev];
              saveProjectState({ audioUrl: url, timestamps: tsText, status: 'Hecho', paragraphAudios: currentParas });
              return currentParas;
            });
            addLog(`[Auto] ¡PROCESAMIENTO COMPLETO!`);
       }
    }

    // 5. DONE
    setIsProcessing(null);
    await saveProjectState({ status: 'Hecho' });
    addLog(`=== PIPELINE COMPLETADO EXITOSAMENTE ===`);

  } catch (e: any) {
       handleAiError(e);
       setIsProcessing(null);
       await saveProjectState({ status: 'Pendiente' }); // rollback on err
    }
  };

  const clearStudio = () => {
    setActiveProject(null);
    setYoutubeUrl('');
    setOriginalTranscript('');
    setEnhancedScript('');
    setTitle('');
    setTargetLanguage('es');
    setPackaging('');
    setVisualPrompts('');
    setTimestamps('');
    setAudioUrl(null);
    setParagraphAudios([]);
    setTtsModel('gemini-3.1-flash-tts-preview');
  };

  const saveProjectState = async (updates: Partial<HistoryItem>) => {
    let finalProject: HistoryItem | null = null;
    let didCreate = false;

    setActiveProject(prev => {
      if (!prev) {
        if (!autoQueueEnabled) return null;
        
        // Auto-create new project on the fly taking available inputs
        const newProj: HistoryItem = {
          id: crypto.randomUUID(),
          workspaceId: activeWorkspace,
          date: Date.now(),
          title: title || updates.title || 'Nuevo Proyecto',
          originalTitle: updates.originalTitle || title || updates.title || 'Nuevo Proyecto',
          youtubeUrl: youtubeUrl || updates.youtubeUrl || '',
          status: 'Pendiente',
          originalTranscript: originalTranscript || updates.originalTranscript || '',
          script: '',
          enhancedScript: enhancedScript || updates.enhancedScript || '',
          voice: voice || 'Kore',
          language: targetLanguage || 'es',
          ttsModel: ttsModel || 'gemini-3.1-flash-tts-preview',
          timestamps: timestamps || updates.timestamps || '',
          packaging: packaging || updates.packaging || '',
          visualPrompts: visualPrompts || updates.visualPrompts || '',
          isVariantsMode: isVariantsMode,
          ...updates
        };
        finalProject = newProj;
        didCreate = true;
        return newProj;
      }
      
      const updated = { ...prev, ...updates };
      finalProject = updated;
      return updated;
    });

    // The state updater is synchronous in its callback, so we can use a setTimeout or promise 
    // to run the side effects right after React commits it, or just do it strictly from finalProject
    setTimeout(() => {
       if (finalProject) {
           saveHistory(finalProject!);
           setHistory(old => {
               if (didCreate) return [finalProject!, ...old].sort((a,b) => b.date - a.date);
               return old.map(item => item.id === finalProject!.id ? finalProject! : item);
           });
       }
    }, 0);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleAiError = (err: any) => {
    console.error("Firebase/AI Error:", err);
    let msg = err?.message || String(err);

    if (msg.includes('permission-denied') || msg.toLowerCase().includes('insufficient permissions')) {
      msg = "Error de Permisos en Firebase. Verifica que el proyecto esté guardado y tengas sesión iniciada.";
    }

    addLog(`ERROR: ${msg.substring(0, 150)}`);
    if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
      setGlobalError("LÍMITE DE CRÉDITOS ALCANZADO (429). Espera un momento o cambia de modelo.");
    } else {
      setGlobalError(msg);
    }
  };

  const getAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("API Key de Gemini no encontrada.");
    }
    return new GoogleGenAI({ apiKey: key });
  };

  useEffect(() => {
    const ai = getAI();
    ai.models.list().then(async (models) => {
      const audioModels = [];
      for await (const m of models) {
        if (m.name.includes("tts") || m.name.includes("audio") || m.name.includes("flash") || m.name.includes("speech") || m.name.includes("live") || m.name.includes("veo")) {
          audioModels.push(m.name);
        }
      }
      console.log("AVAILABLE AUDIO/FLASH MODELS:", audioModels);
      addLog("Available Models: " + audioModels.join(", "));
    }).catch(console.error);
  }, []);

  const generateAudioWithRetry = async (ai: GoogleGenAI, modelId: string, voiceName: string, textToRead: string, systemContext?: string, maxRetries = 3): Promise<Int16Array | null> => {
    // Standard prompt according to docs
    const prompt = `${systemContext ? `Context for delivery: ${systemContext}\n\n` : ''}Please read the following text aloud exactly as provided below.\n\nText to read aloud starts below:\n\n---\n${textToRead.trim()}\n---\nIMPORTANT: Your response MUST be ONLY audio data. No preamble.`;
    
    const candidateModels = [
      modelId,
      "gemini-3.1-flash-tts-preview",
      "gemini-2.5-flash-preview-tts",
      "gemini-2.5-pro-preview-tts"
    ];
    
    // Cleanup list of unique models
    const uniqueModels = Array.from(new Set(candidateModels)).filter(Boolean);
    let lastError: any = null;
    
    for (const mId of uniqueModels) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          addLog(`[TTS] Intentando modelo: ${mId} (Intento ${attempt})...`);
          
          // Correct SDK usage for @google/genai
          const response = await ai.models.generateContent({
            model: mId,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
                },
              },
            },
          });
          
          // The inlineData usually sits in parts[0]
          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          
          if (base64Audio && typeof base64Audio === 'string' && base64Audio.length > 50) {
             addLog(`[TTS] Éxito con ${mId}: RECIBIDO (${Math.round(base64Audio.length/1024)} KB)`);
             return base64ToPcm(base64Audio);
          } else {
             const textReturned = response.candidates?.[0]?.content?.parts?.[0]?.text;
             if (textReturned) {
                addLog(`[TTS Info] Intento ${attempt}: El modelo devolvió texto en lugar de audio.`);
                throw new Error("El modelo solo devolvió texto, no audio.");
             } else {
                addLog(`[TTS Info] Intento ${attempt}: Segmento vacío.`);
                throw new Error("Respuesta del modelo vacía.");
             }
          }
        } catch (e: any) {
          lastError = e;
          const msg = e.message || String(e);
          console.error(`TTS Attempt Failed (${mId}):`, e);
          
          if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
             addLog(`[TTS Info] Cuota agotada (429). Esperando 15s...`);
             await new Promise(r => setTimeout(r, 15000));
          } else if (msg.includes('PROHIBITED_CONTENT') || msg.includes('SAFETY')) {
             addLog(`[TTS Warning] Segmento omitido por filtros de seguridad.`);
             return null;
          } else if (msg.includes('404') || msg.includes('NOT_FOUND')) {
             addLog(`[TTS Info] ${mId} no encontrado. Intentando el siguiente...`);
             break; // don't retry the same model
          } else if (msg.includes('text output') || msg.includes('INVALID_ARGUMENT')) {
             addLog(`[TTS Info] ${mId} no soporta AUDIO modal. Intentando el siguiente...`);
             break; // don't retry the same model
          } else {
             addLog(`[TTS Error] Reintentando tras error: ${msg.substring(0, 80)}`);
             await new Promise(r => setTimeout(r, 3000));
          }
        }
      }
    }
    
    throw lastError;
  };

  const handleManualAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    addLog("Procesando subida de audio manual...");
    const url = URL.createObjectURL(file);
    const audioObj = new Audio(url);
    
    audioObj.onerror = () => {
      addLog("Error: No se pudo cargar el audio manual. Verifica que el archivo sea válido.");
      e.target.value = '';
    };

    audioObj.onloadedmetadata = async () => {
      const duration = audioObj.duration;
      const script = enhancedScript || originalTranscript;
      
      addLog(`Audio cargado. Análisis serio: Duración ${duration.toFixed(2)}s.`);
      
      let timestampsImg = ["--- TIEMPOS EXACTOS PARA EDICIÓN ---", "Imagen 1: 00:00"];
      let timestampsYt = ["CAPÍTULOS:"];
      let imgCount = 1;
      let firstChapterFound = false;

      const cleanScriptForTTS = script.replace(/\[(?:IMG|CTA|CAMBIO DE IMAGEN|CHAPTER|CAPITULO).*?\]/gi, '');
      const totalChars = cleanScriptForTTS.replace(/\s+/g, '').length;
      const secondsPerChar = totalChars > 0 ? duration / totalChars : 0;
      
      let currentChars = 0;
      const segments = script.split(/(\[CAMBIO DE IMAGEN\]|\[IMG\]|\[CAPITULO:.*?\]|\[CHAPTER:.*?\]|\[CTA\])/);
      
      for (const segment of segments) {
          if (segment.startsWith('[')) {
              const timePos = currentChars * secondsPerChar;
              const formattedTime = formatTime(timePos > duration ? duration : timePos);
              
              if (segment === '[CAMBIO DE IMAGEN]' || segment === '[IMG]') {
                  imgCount++;
                  timestampsImg.push(`Imagen ${imgCount} -> ${formattedTime}`);
              } else if (segment === '[CTA]') {
                  timestampsImg.push(`ANIMACIÓN SUSCRÍBETE / LIKE -> ${formattedTime}`);
              } else if (segment.startsWith('[CAPITULO:') || segment.startsWith('[CHAPTER:')) {
                  const capName = segment.replace(/\[(?:CAPITULO|CHAPTER):(.*?)\]/i, '$1').trim();
                  timestampsYt.push(`${formattedTime} ${capName}`);
                  firstChapterFound = true;
              }
          } else {
              currentChars += segment.replace(/\s+/g, '').length;
          }
      }

      const finalTimestamps = timestampsImg.join('\n') + (firstChapterFound ? "\n\n" + timestampsYt.join('\n') : "");
      
      setTimestamps(finalTimestamps);
      setAudioUrl(url);
      
      await saveProjectState({ audioUrl: url, timestamps: finalTimestamps, status: 'Hecho' });
      addLog(`Audio manual sincronizado. Finalizado.`);
      e.target.value = '';
    };
  };

  const processIdeaFromTitle = async () => {
    if (!title.trim() || !isVariantsMode) return;
    
    setIsProcessing('transcript');
    setGlobalError(null);
    const customTitle = title.trim();
    addLog(`Modo Variantes: Usando idea/título personalizado: "${customTitle}"`);
    await saveProjectState({ title: customTitle, originalTranscript: "No aplica (Generación desde título/idea)" });
    setOriginalTranscript("No aplica (Generación desde título/idea)");
    await generateVariants("No hay transcripción disponible, el usuario ingresó una idea/título desde cero. Idea original: " + customTitle, customTitle);
    setIsProcessing(null);
  };

  const processTranscript = async () => {
    if (!youtubeUrl) {
       // Si no hay youtubeUrl pero hay titulo (y estamos en modo variantes), procedemos con el titulo
       if (title.trim() && isVariantsMode) {
          await processIdeaFromTitle();
       }
       return;
    }

    const isUrl = /^(https?:\/\/)/i.test(youtubeUrl.trim());

    if (!isUrl && isVariantsMode) {
      setIsProcessing('transcript');
      setGlobalError(null);
      const customTitle = youtubeUrl.trim();
      setTitle(customTitle);
      addLog(`Modo Variantes: Usando título personalizado sin URL: "${customTitle}"`);
      await saveProjectState({ title: customTitle, originalTranscript: "No aplica (Generación desde título)" });
      setOriginalTranscript("No aplica (Generación desde título)");
      await generateVariants("No hay transcripción disponible, el usuario ingresó una idea/título desde cero. Idea original: " + customTitle, customTitle);
      setIsProcessing(null);
      return;
    }

    setIsProcessing('transcript');
    setGlobalError(null);
    addLog(`Iniciando extracción para: ${youtubeUrl}`);
    try {
      // First try to fetch the original title if it's empty
      if (!title || title === "Nuevo Proyecto" || title.includes("Generando nuevo")) {
          try {
             const resInfo = await fetch(`/api/yt-info?url=${encodeURIComponent(youtubeUrl.trim())}`);
             if (resInfo.ok) {
                 const infoData = await resInfo.json();
                 if (infoData.title) {
                     setTitle(infoData.title);
                     saveProjectState({ title: infoData.title });
                 }
             }
          } catch(e) {
             console.warn("Could not retrieve original title");
          }
      }

      const response = await fetch('/api/v2/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });
      
      if (!response.ok) {
        let errorData: any = null;
        try {
           errorData = await response.clone().json();
        } catch(e) {}
        
        if (errorData?.logs) errorData.logs.forEach((l: string) => addLog(`Server: ${l}`));
        
        const errorText = errorData?.error || await response.text();
        const errorMessage = errorData?.message || errorText;
        
        setOriginalTranscript(`Error: ${errorMessage}`);
        
        if (response.status === 403) {
           addLog("🚨 BLOQUEO DE YOUTUBE: Se requiere configurar APIFY_API_TOKEN para usar proxies.");
        }
        
        throw new Error(`${errorMessage}`);
      }

      const data = await response.json();
      
      console.log("[App] Transcript Data:", data);
      if (data.logs) data.logs.forEach((l: string) => addLog(`Server: ${l}`));

      if (data.transcript && data.transcript.trim().length > 10) {
        setOriginalTranscript(data.transcript);
        saveProjectState({ originalTranscript: data.transcript, youtubeUrl });
        addLog(`Transcripción obtenida con éxito (${data.transcript.length} carácteres).`);
        
        // If variants mode is active, fetch variants automatically
        if (isVariantsMode) {
           await generateVariants(data.transcript, title || 'Video Importado');
        }
      } else {
        addLog(`Aviso: No se obtuvo texto válido del servidor.`);
        setOriginalTranscript("Error: No se pudieron extraer subtítulos automáticamente.");
      }
    } catch (error: any) {
      console.error("[App] Transcript Error:", error);
      handleAiError(error);
      setIsProcessing(null);
    }
  };

  const generateVariants = async (text: string, originalTitleStr: string) => {
     setIsProcessing('variants');
     addLog("Modo Variantes: Analizando contexto y generando cartas de idea...");
     try {
        const ai = getAI();
        const nicheObj = niches[activeWorkspace] || DEFAULT_NICHES['psicologia'];
        const langName = getLangName(targetLanguage);
        
        if (!nicheObj.variantsPrompt || nicheObj.variantsPrompt.trim() === '') {
           addLog("Error: Para generar Variantes de Ángulo, primero debes añadir una instrucción en la configuración del nicho.");
           setIsProcessing(null);
           return;
        }

        const schema = {
           type: "ARRAY",
           items: {
             type: "OBJECT",
             properties: {
               title: { type: "STRING" },
               idea: { type: "STRING", description: "Breve descripción de cómo se abordará el guion" }
             }
           }
        };

        const response = await ai.models.generateContent({
           model: "gemini-3-flash-preview",
           contents: `INSTRUCCIÓN (OBEDECER):
${nicheObj.variantsPrompt}

IDOMA DE SALIDA OBLIGATORIO:
Las variantes y el título deben estar escritos completamente en: ${langName}.

DATOS DEL VIDEO ORIGINAL:
TITULO: ${originalTitleStr}
TRANSCRIPCIÓN:
${text}`,
           config: { responseMimeType: "application/json", responseSchema: schema as any }
        });
        
        let responseText = '';
        try {
          const res = response as any;
          if (res.response && typeof res.response.text === 'function') {
            responseText = res.response.text();
          } else if (typeof res.text === 'function') {
            responseText = res.text();
          } else if (typeof res.text === 'string') {
            responseText = res.text;
          } else {
            responseText = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } catch (e) {
          responseText = '';
        }

        const safeText = (responseText || "").trim();
        if (safeText.includes('```json')) {
           responseText = safeText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        }
        
        const finalResponseText = responseText.trim() || '[]';
        const variantsData = JSON.parse(finalResponseText);
        setScriptVariants(variantsData);
        saveProjectState({ scriptVariants: variantsData, isVariantsMode: true });
        addLog("Variantes generadas exitosamente.");
     } catch (e) {
        handleAiError(e);
     } finally {
        setIsProcessing(null);
     }
  };

  const generateScriptFromVariant = async (variant: ScriptVariant) => {
    const source = originalTranscript;
    if (!source || source.startsWith("Error:")) {
      addLog("Error: No hay contenido fuente.");
      return;
    }
    
    setIsProcessing('script');
    setGlobalError(null);
    addLog(`Generando Nuevo Guion basado en la variante: ${variant.title}...`);
    try {
      const ai = getAI();
      const nicheObj = niches[activeWorkspace] || DEFAULT_NICHES['psicologia'];
      
      const scriptPrompt = nicheObj.variantScriptPrompt || nicheObj.prompt;
      if (!scriptPrompt || scriptPrompt.trim() === '') {
        addLog("Error: Para generar el guion, primero debes añadir una instrucción en la configuración del nicho.");
        setIsProcessing(null);
        return;
      }

      const langName = getLangName(targetLanguage);
      const prompt = `
        STRICT LANGUAGE REQUIREMENT: Final script exclusively in ${langName}.
        
        === INSTRUCCIONES DE GENERACIÓN (OBEDECER ESTRICTAMENTE) ===
        ${scriptPrompt}

        === MISIÓN ESPECÍFICA ===
        Escribe el guion COMPLETO basado en esta variante seleccionada. 
        EL TÍTULO DEBE SER TRADUCIDO AL IDIOMA DE SALIDA (${langName}) E INSERTADO EN LA PRIMERA LÍNEA.
        
        TÍTULO DE LA VARIANTE: "${variant.title}"
        IDEA/ÁNGULO: "${variant.idea}"

        === CONTEXTO DEL VIDEO ORIGINAL ===
        ${source}
      `;

      // Se guarda el título de la Variante
      setTitle(variant.title);
      saveProjectState({ title: variant.title });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      incrementUsage('flash');
      
      let responseText = '';
      try {
        const res = response as any;
        if (res.response && typeof res.response.text === 'function') {
          responseText = res.response.text();
        } else if (typeof res.text === 'function') {
          responseText = res.text();
        } else if (typeof res.text === 'string') {
          responseText = res.text;
        } else {
          responseText = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (ei) {
        responseText = '';
      }

      const safeResponseText = (responseText || '').trim();
      const cleanScript = safeResponseText.replace(/\[STRUCTURED STORY\]/gi, '').trim();
      
      // The AI should have included the title if the prompt was good, 
      // but we ensure it's there or just let the response be the boss.
      const finalScript = cleanScript.toUpperCase().includes(variant.title.toUpperCase().substring(0,10))
        ? cleanScript 
        : `${variant.title.toUpperCase()}\n\n${cleanScript}`;
      
      setEnhancedScript(finalScript);
      setTitle(variant.title);
      saveProjectState({ enhancedScript: finalScript, title: variant.title });
      addLog("Guion variante generado con éxito.");
      
    } catch (error) {
      handleAiError(error);
    } finally {
      setIsProcessing(null);
    }
  };

  const rewriteScript = async () => {
    const source = originalTranscript;
    if (!source || source.startsWith("Error:")) {
      addLog("Error: No hay contenido fuente.");
      setGlobalError("Primero extrae la transcripción.");
      return;
    }
    
    setIsProcessing('script');
    setGlobalError(null);
    addLog(`Generando Nuevo Guion...`);
    try {
      const ai = getAI();
      const nicheObj = niches[activeWorkspace] || DEFAULT_NICHES['psicologia'];
      
      if (!nicheObj.prompt || nicheObj.prompt.trim() === '') {
         addLog("Error: Para realizar la re-escritura, primero debes añadir una instrucción en la configuración del nicho.");
         setIsProcessing(null);
         return;
      }

      const langName = getLangName(targetLanguage);
      const availableVideosTxt = getFilteredHistory(history, activeWorkspace)
        .filter(h => h.title && h.title !== 'Nuevo Proyecto')
        .map(h => h.title)
        .join(", ") || 'Ninguno';

      const prompt = `
        STRICT LANGUAGE REQUIREMENT: Final script exclusively in ${langName}.
        
        === TÍTULO DE REFERENCIA ===
        ${title || 'No especificado'}

        === GUION/TRANSCRIPCIÓN ORIGINAL ===
        ${source}
        
        === MANUAL DE ESTILO Y FORMATO (OBEDECER ESTRICTAMENTE) ===
        ${nicheObj.prompt.replace('{{ AVAILABLE_VIDEOS }}', availableVideosTxt)}
        
        INSTRUCCIÓN FINAL:
        Toma el guion/transcripción original y reescríbelo por completo adaptando el contenido al título dado, aplicando estrictamente las reglas del Manual de Estilo y Formato. No devuelvas ningún texto introductorio, solo el guion final.
        `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      let responseText = '';
      try {
        const res = response as any;
        if (res.response && typeof res.response.text === 'function') {
          responseText = res.response.text();
        } else if (typeof res.text === 'function') {
          responseText = res.text();
        } else if (typeof res.text === 'string') {
          responseText = res.text;
        } else {
          responseText = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (ei) {
        responseText = '';
      }
      
      let text = responseText;
      text = text.replace(/\*\*/g, '').replace(/#/g, '').trim();
      text = text.replace(/^(Aquí tienes|Te presento|Este es|Adjunto|Claro,|Here is|Sure).*\n+/gmi, '').trim();

      setEnhancedScript(text);
      saveProjectState({ enhancedScript: text });
      
      incrementUsage('flash');
      addLog("Guion viral reescrito con éxito.");

      // Next step
      await runPackagingLogic(text, nicheObj, langName);
    } catch (error: any) {
      handleAiError(error);
    } finally {
      setIsProcessing(null);
    }
  };

  const applyMarksToManualScript = async () => {
    if (!enhancedScript) return;
    setIsProcessing('script');
    addLog("Aplicando marcas TTS automáticas al guion...");
    try {
      const ai = getAI();
      const prompt = `
        You are an audio engineer and voice director.
        Read the following script. Analyze its tone, emotion, and pace.
        Intelligently insert the official Gemini TTS prosody markers. DO NOT rewrite the script, just add the markers seamlessly inside the text.
        
        Examples of valid tags (MUST BE IN ENGLISH even if the text is in Spanish):
        [whispers], [laughs], [sighs], [gasp], [shouting], [tired], [sarcastic], [angry], [sad], [excited], [happy], [serious], [slowly], [quickly]
        You can also combine them or use creative ones like [sarcastically, very slow] or [like a movie trailer voice].
        
        CRITICAL: At the very beginning of the script, YOU MUST INSERT A GLOBAL NARRATIVE MARKER (e.g., [narrator, calmly] or [narrator, intense]) to prime the global tone of the vocal engine.
        
        ONLY USE BRACKET TAGS. Do NOT modify the core words of the script.
        
        SCRIPT:
        ${enhancedScript}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      let responseText = '';
      try {
        const res = response as any;
        if (res.response && typeof res.response.text === 'function') {
          responseText = res.response.text();
        } else if (typeof res.text === 'function') {
          responseText = res.text();
        } else if (typeof res.text === 'string') {
          responseText = res.text;
        } else {
          responseText = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (ei) {
        responseText = '';
      }
      
      let text = responseText.trim();
      text = text.replace(/\*\*/g, '').replace(/#/g, '');
      setEnhancedScript(text);
      saveProjectState({ enhancedScript: text });
      
      incrementUsage('flash');
      addLog("Marcas de locución aplicadas al texto manual.");
    } catch (e: any) {
      handleAiError(e);
    } finally {
      setIsProcessing(null);
    }
  };

  const runPackagingLogic = async (scriptToUse: string, nicheObj: NicheConfig, langName: string) => {
    if (!nicheObj.packagingPrompt || nicheObj.packagingPrompt.trim() === '') {
       addLog("Saltando Viral Packaging (No hay instrucción configurada).");
       return null;
    }

    setIsProcessing('packaging');
    addLog(`Generando empaque...`);
    
    const availableVideosTxt = getFilteredHistory(history, activeWorkspace)
      .filter(h => h.title && h.title !== 'Nuevo Proyecto')
      .map(h => h.title)
      .join(", ") || 'Ninguno';

    const promptTextLower = (nicheObj.packagingPrompt || "").toLowerCase();
    const prefersPlaintext = 
      promptTextLower.includes("no json") || 
      promptTextLower.includes("plain text") || 
      promptTextLower.includes("texto plano") || 
      promptTextLower.includes("sin json") ||
      promptTextLower.includes("no usar json") ||
      !promptTextLower.includes("json");

    try {
      const prompt = `
      ${nicheObj.packagingPrompt.replace('{{ AVAILABLE_VIDEOS }}', availableVideosTxt)}

      AVAILABLE VIDEOS IN PROJECT HISTORY:
      ${availableVideosTxt}
      
      CRITICAL INSTRUCTION FOR [SELECTED VIDEO] TAG:
      If the user's script or prompt refers to a "[SELECTED VIDEO]" tag, or asks you to recommend a playlist/video based on the available options, YOU MUST USE THE REAL TITLES from the "AVAILABLE VIDEOS IN PROJECT HISTORY" list above. If the list says "Ninguno" or is empty, output "Ninguno".

      GUION:
      ${scriptToUse}
      ${prefersPlaintext ? "" : "\n\n      IMPORTANT: RESPOND EXCLUSIVELY IN VALID JSON."}`;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: prefersPlaintext ? undefined : {
          responseMimeType: "application/json"
        }
      });
      
      let text = '';
      try {
        const resp = response as any;
        if (resp.response && typeof resp.response.text === 'function') {
          text = resp.response.text();
        } else if (typeof resp.text === 'function') {
          text = resp.text();
        } else if (typeof resp.text === 'string') {
          text = resp.text;
        } else if (resp.candidates && resp.candidates[0]?.content?.parts?.[0]?.text) {
          text = resp.candidates[0].content.parts[0].text;
        } else if (resp.content && resp.content.parts && resp.content.parts[0].text) {
          text = resp.content.parts[0].text;
        } else if (resp.candidates && resp.candidates[0]?.content?.parts?.length > 0) {
          text = resp.candidates[0].content.parts[0].text || '';
        }
      } catch (e) {
        console.warn("Error extracting text from AI response", e);
        text = '';
      }
      
      const rawText = text || '';
      const safeText = (typeof rawText === 'string' ? rawText : String(rawText)).trim();
      let packPart = safeText;

      // Extract and format JSON if it's wrapped in text or returned raw
      if (safeText && safeText.includes('{') && safeText.includes('}')) {
          const startIdx = safeText.indexOf('{');
          const endIdx = safeText.lastIndexOf('}') + 1;
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
             const jsonPart = safeText.substring(startIdx, endIdx);
             try {
               const parsed = JSON.parse(jsonPart);
               packPart = formatJsonToBeautifulText(parsed);
             } catch (err) {
               packPart = jsonPart;
             }
          }
      } else {
         const trimmedText = safeText.trim();
         if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
            try {
              const parsed = JSON.parse(trimmedText);
              packPart = formatJsonToBeautifulText(parsed);
            } catch (err) {
              // Fallback
            }
         }
      }

      setPackaging(packPart);
      saveProjectState({ packaging: packPart });

      incrementUsage('lite');
      addLog("Empaque generado.");
      return { pack: packPart };
    } catch (error) {
      handleAiError(error);
      return null;
    }
  };

  const runVisualPromptsLogic = async (scriptToUse: string, nicheObj: NicheConfig, langName: string) => {
    if (!nicheObj.visualPromptInstructions || nicheObj.visualPromptInstructions.trim() === '') {
       addLog("Saltando Visual Prompts (No hay instrucción configurada en el nicho).");
       return null;
    }

    // setIsProcessing('packaging');
    addLog(`Generando prompts visuales...`);
    
    try {
      const prompt = `
      ${nicheObj.visualPromptInstructions}

      GUION DE REFERENCIA:
      ${scriptToUse}
      `;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      let text = '';
      try {
        const resp = response as any;
        if (resp.response && typeof resp.response.text === 'function') {
          text = resp.response.text();
        } else if (typeof resp.text === 'function') {
          text = resp.text();
        } else if (typeof resp.text === 'string') {
          text = resp.text;
        } else if (resp.candidates && resp.candidates[0]?.content?.parts?.[0]?.text) {
          text = resp.candidates[0].content.parts[0].text;
        } else if (resp.content && resp.content.parts && resp.content.parts[0].text) {
          text = resp.content.parts[0].text;
        } else if (resp.candidates && resp.candidates[0]?.content?.parts?.length > 0) {
          text = resp.candidates[0].content.parts[0].text || '';
        }
      } catch (e) {
        console.warn("Error extracting text from AI response", e);
        text = '';
      }
      
      const visualPart = text.trim();

      setVisualPrompts(visualPart);
      saveProjectState({ visualPrompts: visualPart });

      incrementUsage('lite');
      addLog("Prompts visuales generados.");
      return { visualPrompts: visualPart };
    } catch (error) {
      handleAiError(error);
      return null;
    }
  };

  const generatePackaging = async () => {
    if (!enhancedScript) {
        addLog("No hay guion para empaque.");
        return;
    }
    const niche = niches[activeWorkspace] || DEFAULT_NICHES['psicologia'];
    
    const langName = getLangName(targetLanguage);
    
    setIsProcessing('packaging');

    try {
      if (niche.packagingPrompt && niche.packagingPrompt.trim() !== '') {
         await runPackagingLogic(enhancedScript, niche, langName);
      } else {
         addLog("Aviso: No hay instrucción de Viral Packaging configurada en el nicho.");
      }
      
      if (niche.visualPromptInstructions && niche.visualPromptInstructions.trim() !== '') {
         await runVisualPromptsLogic(enhancedScript, niche, langName);
      } else {
         addLog("Aviso: No hay instrucción de Visual Prompts configurada en el nicho.");
      }
    } finally {
      setIsProcessing(null);
    }
  };

  const generateAudioWorkflow = async (scriptToUse?: string, initialPackaging?: string) => {
    const rawFinalScript = scriptToUse || enhancedScript;
    if (!rawFinalScript || rawFinalScript.trim() === '') {
      addLog("Error: No hay guion redactado para generar audio. Escribe algo en el guion primero.");
      setGlobalError("Escribe un guion antes de generar la locución.");
      return;
    }

    if (!user) {
      addLog("Error: Debes iniciar sesión para usar la IA de audio.");
      return;
    }

    // Attempt to auto-create a project if somehow activeProject is null
    let project = activeProject;
    if (!project) {
      addLog("[Info] No hay proyecto seleccionado. Creando contenedor temporal...");
      // Ideally we should have a project, but let's try to proceed with a dummy ID if we just want to test
      project = { id: 'temp_' + Date.now(), title: 'Prueba Rápida', workspaceId: activeWorkspace } as any;
    }
    const safeProject = project!;

    const finalScript = String(rawFinalScript);
    const niche = niches[activeWorkspace] || DEFAULT_NICHES['psicologia'];
    
    let voiceInstructions = (niche.voiceInstructions || '').trim();
    if (!voiceInstructions) {
       addLog("[Info] Usando estilo de voz predeterminado (Natural).");
       voiceInstructions = "Habla de forma natural, clara y profesional.";
    }

    setIsProcessing('audio');
    setProgress(0);
    setGlobalError(null);
    addLog("[TTS] Iniciando flujo de audio...");
    
    try {
      const ai = getAI();
      const fullVoiceInstructions = `${voiceInstructions} \nHabla de forma natural y sin prisas.`;
      
      const segments = finalScript.split(/(\[CAMBIO DE IMAGEN\]|\[IMG\]|\[CAPITULO:.*?\]|\[CHAPTER:.*?\]|\[CTA\])/);
      const audioPieces: Int16Array[] = [];
      let currentTime = 0;
      let imgCount = 1;
      let timestampsImg = ["--- TIEMPOS EXACTOS PARA EDICIÓN ---", "Imagen 1: 00:00"];
      let timestampsYt = ["CAPÍTULOS:"];
      let firstChapterFound = false;
      
      const filteredSegments = segments.filter(s => s && typeof s === 'string' && s.trim() !== '');
      const totalSteps = filteredSegments.length;
      
      addLog(`[TTS] ${totalSteps} segmentos detectados para procesar.`);

      if (totalSteps === 0) {
        addLog("Error: El texto es demasiado corto o inválido.");
        setIsProcessing(null);
        return;
      }

      const segmentsRef = collection(db, 'historyItems', safeProject.id, 'segments');
      let globalParaIndex = 0;

      for (let i = 0; i < totalSteps; i++) {
        const seg = filteredSegments[i].trim();
        if (!seg) continue;
        
        const isImgTag = seg === '[CAMBIO DE IMAGEN]' || seg === '[IMG]';
        const isCtaTag = seg === '[CTA]';
        const isChapterTag = seg.toLowerCase().startsWith('[capitulo:') || seg.toLowerCase().startsWith('[chapter:');
        
        if (isImgTag) {
          imgCount++;
          timestampsImg.push(`Imagen ${imgCount} -> ${formatTime(currentTime)}`);
        } else if (isCtaTag) {
          timestampsImg.push(`ANIMACIÓN SUSCRÍBETE / LIKE -> ${formatTime(currentTime)}`);
        } else if (isChapterTag) {
          const capName = seg.replace(/\[(?:CAPITULO|CHAPTER):(.*?)]/gi, '$1').trim();
          const timeStr = firstChapterFound ? formatTime(currentTime) : "00:00";
          timestampsYt.push(`${timeStr} ${capName}`);
          firstChapterFound = true;
        } else {
           let cleanText = seg.replace(/\[(?:IMG|CTA|VISUAL|SCENE|B-ROLL).*?\]/gi, '');
           cleanText = cleanText.replace(/^[ \t]+/gm, '').trim();
           if (!cleanText) continue;

           const paragraphs = cleanText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
           
           for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
             const paraText = paragraphs[pIdx];
             
             const baseProgress = (i / totalSteps) * 100;
             const innerProgress = ((pIdx) / paragraphs.length) * (100 / totalSteps);
             setProgress(Math.round(baseProgress + innerProgress));
             
             addLog(`[TTS] Generando párrafo ${pIdx + 1} de ${paragraphs.length} (Seg ${i+1}/${totalSteps})...`);
             const segmentDocRef = doc(segmentsRef, `segment_${i}_p_${pIdx}`);
             
             let pcm: Int16Array | null = null;
             let pUrl = '';
             
             try {
                const docSnap = await getDoc(segmentDocRef);
                if (docSnap.exists() && docSnap.data().status === 'processed') {
                   addLog(`[Checkpoint] Párrafo recuperado de caché.`);
                   pUrl = docSnap.data().url;
                   const response = await fetch(pUrl);
                   const blob = await response.blob();
                   const arrayBuffer = await blob.arrayBuffer();
                   pcm = wavToPcm(arrayBuffer);
                   currentTime = docSnap.data().endTime || currentTime;
                }
             } catch (e) {
               console.warn("Doc fetch failed, starting fresh paragraph segment:", e);
             }

             if (!pcm) {
                pcm = await generateAudioWithRetry(ai, ttsModel || 'gemini-3.1-flash-tts-preview', voice, paraText, voiceInstructions);

                if (pcm) {
                  const wavBlob = pcmToWav(pcm, 24000);
                  const storagePath = `historyItems/${safeProject.id}/audio/segment_${i}_p_${pIdx}.wav`;
                  const storageRef = ref(storage, storagePath);
                  
                  try {
                    await uploadBytes(storageRef, wavBlob);
                    pUrl = await getDownloadURL(storageRef);
                  } catch (storageErr) {
                    console.warn("Storage upload failed, using local URL:", storageErr);
                    pUrl = URL.createObjectURL(wavBlob);
                  }
                  
                  try {
                    await setDoc(segmentDocRef, {
                      url: pUrl,
                      status: 'processed',
                      index: `${i}_${pIdx}`,
                      text: paraText,
                      endTime: currentTime + (pcm.length / 24000)
                    });
                  } catch (dbErr) {
                    console.warn("Firestore cache failed:", dbErr);
                  }
                  
                  currentTime += pcm.length / 24000;
                }
             }
             
             if (pcm && pUrl) {
                audioPieces.push(pcm);
                setParagraphAudios(prev => [
                   ...prev.filter(pa => pa.index !== globalParaIndex),
                   { text: paraText, url: pUrl, index: globalParaIndex }
                ]);
             }
             globalParaIndex++;
             
             if (!pcm) {
                await new Promise(r => setTimeout(r, 2000));
             } else {
                await new Promise(r => setTimeout(r, 4500)); // wait after successful synthesis
             }
           }
        }
        setProgress(Math.round(((i + 1) / totalSteps) * 100));
      }
      incrementUsage('tts');

      if (audioPieces.length === 0) {
        addLog("Error: No se pudo generar ningún segmento de audio.");
        setGlobalError("Fallo en la generación de audio TTS o se excedió la cuota de uso. Verifica la API.");
        setIsProcessing(null);
        return;
      }

      const totalLength = audioPieces.reduce((acc, p) => acc + p.length, 0);
      const combinedPcm = new Int16Array(totalLength);
      let offset = 0;
      for (const piece of audioPieces) {
        combinedPcm.set(piece, offset);
        offset += piece.length;
      }

      const wavBlob = pcmToWav(combinedPcm, 24000);
      let finalAudioUrl = URL.createObjectURL(wavBlob);
      
      // Persist to Firebase Storage
      if (user && activeProject?.id) {
        try {
          addLog("Subiendo master final a la nube...");
          const storageRef = ref(storage, `historyItems/${activeProject.id}/audio/master.wav`);
          await uploadBytes(storageRef, wavBlob);
          finalAudioUrl = await getDownloadURL(storageRef);
          addLog("Master persistido en Firebase Storage.");
        } catch (storageErr) {
          console.error("Storage upload failed:", storageErr);
        }
      }

      setAudioUrl(finalAudioUrl);
      
      const finalTimestamps = timestampsImg.join('\n');
      setTimestamps(finalTimestamps);
      
      // Inject timestamps into packaging if there are chapters
      let finalPackaging = packaging || initialPackaging || '';
      if (firstChapterFound) {
         const chaptersStr = timestampsYt.join('\n') + "\n\n";
         if (finalPackaging.includes("DESCRIPCIÓN:")) {
            finalPackaging = finalPackaging.replace("DESCRIPCIÓN:", chaptersStr + "DESCRIPCIÓN:");
         } else {
            finalPackaging += "\n\n" + chaptersStr;
         }
         // Clean packaging from asterisks and hashtags (markdown)
         finalPackaging = finalPackaging.replace(/\*\*/g, '').replace(/#/g, '');
         setPackaging(finalPackaging);
      }
      
      setParagraphAudios(prev => {
        const currentParas = [...prev];
        saveProjectState({ 
          audioUrl: finalAudioUrl, 
          timestamps: finalTimestamps,
          packaging: finalPackaging,
          status: 'Hecho',
          paragraphAudios: currentParas
        });
        return currentParas;
      });
      addLog("Master Audio y Tiempos finalizados con éxito.");
      
    } catch (error) {
      handleAiError(error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleExport = () => {
    const sluggify = (str: string) => {
      if (!str) return 'proyecto-sin-titulo';
      let s = str.toLowerCase().trim();
      s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      s = s.replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
      return s;
    };
    
    const safeTitle = activeProject?.originalTitle || title;
    const fileBaseName = sluggify(safeTitle);

    // Audio
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `${fileBaseName}_audio.wav`;
      a.click();
    }

    // Timestamps
    if (timestamps) {
      const tsBlob = new Blob([timestamps], { type: 'text/plain' });
      const a2 = document.createElement('a');
      a2.href = URL.createObjectURL(tsBlob);
      a2.download = `${fileBaseName}_tiempos.txt`;
      a2.click();
    }

    // Packaging & Visuals
    if (packaging || visualPrompts) {
      const content = `PROMPT DE PACKAGING ESTRATÉGICO:\n\n${packaging}\n\n========================================\n\nPROMPTS VISUALES CREATIVOS:\n\n${visualPrompts}`;
      const packBlob = new Blob([content], { type: 'text/plain' });
      const a3 = document.createElement('a');
      a3.href = URL.createObjectURL(packBlob);
      a3.download = `${fileBaseName}_empaque_y_prompts.txt`;
      a3.click();
    }

    // Full Script (With tags)
    if (enhancedScript) {
      const fullBlob = new Blob([enhancedScript], { type: 'text/plain' });
      const aFull = document.createElement('a');
      aFull.href = URL.createObjectURL(fullBlob);
      aFull.download = `${fileBaseName}_guion_completo.txt`;
      aFull.click();
      
      // Clean Script (TTS version)
      const cleanScript = getCleanTtsScript(enhancedScript);
      const cleanBlob = new Blob([cleanScript], { type: 'text/plain' });
      const aClean = document.createElement('a');
      aClean.href = URL.createObjectURL(cleanBlob);
      aClean.download = `${fileBaseName}_narracion_limpia.txt`;
      aClean.click();
    }

    addLog("Pipeline de exportación finalizado. Revisa tus descargas.");
  };

  const openProject = (item: HistoryItem) => {
    setIsViewOnly(item.status === 'Hecho');
    const wasPending = item.status === 'Pendiente';
    
    setActiveProject(item);
    if (item.status === 'Pendiente') {
       item.status = 'En Proceso';
       saveHistory(item).then(loadHistory);
    }
    setYoutubeUrl(item.youtubeUrl || '');
    setOriginalTranscript(item.originalTranscript || item.script || '');
    setEnhancedScript(item.enhancedScript || '');
    setTitle(item.title || '');
    setVoice(item.voice || 'Kore');
    setLanguage(item.language || 'es');
    setTargetLanguage(item.language || 'es');
    setPackaging(item.packaging || '');
    setVisualPrompts(item.visualPrompts || '');
    setTimestamps(item.timestamps || '');
    setAudioUrl(item.audioUrl || null);
    setParagraphAudios(item.paragraphAudios || []);
    
    if (wasPending) {
       setIsVariantsMode(item.isVariantsMode || false);
       setScriptVariants(item.scriptVariants || null);
    } else {
       setIsVariantsMode(false);
       setScriptVariants(null);
    }
    
    setSelectedVariantIndex(item.selectedVariantIndex || 0);
    setActiveTab('studio');
  };

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row font-sans bg-[#0a0a0b] text-slate-200 overflow-hidden w-full">
      {/* Universal Mini Sidebar / Bottom Nav on Mobile */}
      <aside className="fixed bottom-0 left-0 right-0 h-16 md:static md:w-20 md:h-auto bg-[#0c0c0e] border-t md:border-t-0 md:border-r border-[var(--border-base)] flex md:flex-col items-center px-4 md:px-0 md:py-6 gap-4 md:gap-8 z-[50] shadow-2xl md:shadow-none">
        <div className="hidden md:flex p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <Zap className="w-6 h-6 text-white" />
        </div>
        
        <nav className="flex md:flex-col justify-around md:justify-start w-full md:w-auto gap-2 md:gap-6 flex-1">
          <button 
            onClick={() => {
              if (activeTab === 'studio' && activeProject && !isViewOnly) {
                 saveProjectState({
                   title,
                   youtubeUrl,
                   originalTranscript,
                   enhancedScript,
                   packaging,
                   visualPrompts,
                   language: targetLanguage as any,
                   voice,
                   ttsModel
                 });
              }
              setActiveTab('projects');
            }}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 md:flex-none",
              activeTab === 'projects' ? "text-cyan-400 bg-cyan-400/5 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : "text-slate-600 hover:text-slate-400"
            )}
          >
            <Boxes className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Cola</span>
          </button>
          <button 
            onClick={() => setActiveTab('studio')}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 md:flex-none",
              activeTab === 'studio' ? "text-cyan-400 bg-cyan-400/5 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : "text-slate-600 hover:text-slate-400"
            )}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Studio</span>
          </button>
          <button 
            onClick={() => setActiveTab('radar')}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 md:flex-none",
              activeTab === 'radar' ? "text-amber-500 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "text-slate-600 hover:text-slate-400"
            )}
          >
            <Zap className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Radar</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 md:flex-none",
              activeTab === 'settings' ? "text-cyan-400 bg-cyan-400/5 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : "text-slate-600 hover:text-slate-400"
            )}
          >
            <Settings className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Ajustes</span>
          </button>

          {/* User Profile for Mobile */}
          <div className="md:hidden flex items-center justify-center flex-1">
             {user ? (
               <div className="relative">
                 <button 
                   onClick={() => setMobileUserMenuOpen(!mobileUserMenuOpen)}
                   className="w-9 h-9 rounded-full border-2 border-cyan-500/30 overflow-hidden"
                 >
                   <img 
                     src={user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.email || 'U') + '&background=random'} 
                     className="w-full h-full object-cover" 
                   />
                 </button>

                 {mobileUserMenuOpen && (
                   <div className="fixed bottom-20 left-4 right-4 bg-[#0c0c0e] border border-[var(--border-base)] p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] animate-in fade-in slide-in-from-bottom-4">
                     <div className="flex flex-col items-center gap-4 mb-6 pb-6 border-b border-[var(--border-base)]">
                        <div className="relative">
                          <img src={user.photoURL || ''} alt="Profile" className="w-16 h-16 rounded-full border-2 border-slate-700 shadow-xl" />
                          <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border-2 border-[#0c0c0e]">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <div className="text-center overflow-hidden w-full">
                          <div className="text-sm font-black text-slate-100 uppercase truncate tracking-tight">{user.displayName || 'Usuario Cloud'}</div>
                          <div className="text-[10px] text-slate-500 truncate font-mono">{user.email}</div>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 gap-2">
                        <button 
                          onClick={() => { setActiveTab('settings'); setMobileUserMenuOpen(false); }}
                          className="flex items-center justify-center gap-2 text-[11px] font-black text-cyan-400 hover:text-white hover:bg-cyan-500 bg-cyan-500/5 p-4 rounded-xl w-full transition-all border border-cyan-500/20"
                        >
                          <Settings className="w-4 h-4" /> AJUSTES DE PERFIL
                        </button>
                        <button 
                          onClick={() => { handleLogout(); setMobileUserMenuOpen(false); }}
                          className="flex items-center justify-center gap-2 text-[11px] font-black text-red-500 hover:text-white hover:bg-red-500 bg-red-500/5 p-4 rounded-xl w-full transition-all border border-red-500/20"
                        >
                          <LogOut className="w-4 h-4" /> CERRAR SESIÓN
                        </button>
                     </div>
                     <button 
                       onClick={() => setMobileUserMenuOpen(false)}
                       className="mt-4 w-full p-2 text-[10px] font-bold text-slate-500 uppercase"
                     >
                       Cerrar
                     </button>
                   </div>
                 )}
               </div>
             ) : (
               <button onClick={handleLogin} className="p-2 text-slate-600"><UserIcon className="w-6 h-6" /></button>
             )}
          </div>
        </nav>

        <div className="hidden md:flex flex-col items-center gap-4 mt-auto mb-4 border-t border-[var(--border-base)] pt-6 w-full">
           <button 
             onClick={() => setShowLogs(!showLogs)}
             className={cn(
               "flex flex-col items-center gap-1 p-2 rounded-xl transition-all w-full",
               showLogs ? "text-emerald-400 bg-emerald-400/5" : "text-slate-600 hover:text-slate-400"
             )}
           >
             <MonitorPlay className="w-5 h-5" />
             <span className="text-[8px] font-bold uppercase">Logs</span>
           </button>

           {user ? (
             <div className="group relative">
               <div className="cursor-pointer">
                  <img src={user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.email || 'U') + '&background=random'} alt="Profile" className="w-9 h-9 rounded-full border-2 border-cyan-500/30 hover:border-cyan-500 transition-all shadow-lg" />
               </div>
               <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#0c0c0e] border border-[var(--border-base)] p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto min-w-[220px] z-[100] transform translate-y-2 group-hover:translate-y-0">
                 {/* Popover Arrow */}
                 <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0c0c0e] border-b border-r border-[var(--border-base)] rotate-45"></div>
                 
                 <div className="flex flex-col items-center gap-3 mb-4 pb-4 border-b border-[var(--border-base)]">
                    <div className="relative">
                      <img src={user.photoURL || ''} alt="Profile" className="w-14 h-14 rounded-full border-2 border-slate-700 shadow-xl" />
                      <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border-2 border-[#0c0c0e]">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="text-center overflow-hidden w-full">
                      <div className="text-[11px] font-black text-slate-100 uppercase truncate tracking-tight">{user.displayName || 'Usuario Cloud'}</div>
                      <div className="text-[9px] text-slate-500 truncate font-mono">{user.email}</div>
                    </div>
                 </div>
                 <button 
                   onClick={handleLogout}
                   className="flex items-center justify-center gap-2 text-[10px] font-black text-red-500 hover:text-white hover:bg-red-500 bg-red-500/5 p-3 rounded-xl w-full transition-all border border-red-500/20 group/btn"
                 >
                   <LogOut className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" /> CERRAR SESIÓN
                 </button>
               </div>
             </div>
           ) : (
             <button 
               onClick={handleLogin}
               className="p-3 bg-[var(--bg-surface)] hover:bg-slate-800 border border-[var(--border-base)] text-cyan-400 rounded-2xl transition-all shadow-xl group flex items-center justify-center relative overflow-hidden"
               title="Sincronizar Cloud"
             >
               <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <UserIcon className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" />
             </button>
           )}
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0a0b] pb-16 md:pb-0">
        <AnimatePresence mode="wait">
          {activeTab === 'projects' && (
            <motion.div 
              key="projects"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 p-4 md:p-8 pb-[130px] md:pb-8 overflow-y-auto custom-scrollbar min-h-0"
            >
              <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-10 gap-4 border-b border-[var(--border-base)]/50 pb-6">
                  <div className="text-center md:text-left w-full md:w-auto">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">Flujo de Proyectos</h1>
                    <p className="text-slate-500 text-xs md:text-sm mt-1">Automatización para canales faceless</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                      <div className="grid grid-cols-3 md:flex gap-2">
                        <select 
                          value={activeWorkspace}
                          onChange={(e) => {
                            setActiveWorkspace(e.target.value);
                            setStudioSidebarOpen(false);
                          }}
                          className="bg-[var(--bg-surface)] border border-[var(--border-base)] p-2.5 rounded-xl text-[9px] md:text-[10px] uppercase font-bold text-cyan-400 outline-none h-[42px]"
                        >
                           <option value="ALL" className="bg-[#0c0c0e]">🌟 Todos los Proyectos</option>
                           {(Object.values(niches) as NicheConfig[]).map((n) => (
                             <option key={n.id} value={n.id} className="bg-[#0c0c0e]">{n.name}</option>
                           ))}
                        </select>
                        <select 
                          value={queueLanguage}
                          onChange={(e) => setQueueLanguage(e.target.value)}
                          className="bg-[var(--bg-surface)] border border-[var(--border-base)] p-2.5 rounded-xl text-[9px] md:text-[10px] uppercase font-bold text-emerald-400 outline-none h-[42px]"
                        >
                          {Object.entries(LANGUAGES).map(([code, name]) => (
                             <option key={code} value={code} className="bg-[#0c0c0e]">
                                {name}
                             </option>
                          ))}
                        </select>
                        <select 
                          value={queueVoice}
                          onChange={(e) => setQueueVoice(e.target.value)}
                          className="bg-[var(--bg-surface)] border border-[var(--border-base)] p-2.5 rounded-xl text-[9px] md:text-[10px] uppercase font-bold text-purple-400 outline-none h-[42px]"
                        >
                           {VOICES.map((v) => (
                             <option key={v.id} value={v.id} className="bg-[#0c0c0e]">{v.name}</option>
                           ))}
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-base)] p-1.5 rounded-2xl w-full shadow-inner ring-1 ring-white/5 overflow-hidden">
                          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-[var(--border-base)]/50 shrink-0">
                             <button
                               onClick={() => setQueueMode('directo')}
                               className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap", queueMode === 'directo' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-400")}
                             >
                               Normal
                             </button>
                             <button
                               onClick={() => setQueueMode('variantes')}
                               className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap", queueMode === 'variantes' ? "bg-cyan-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-400")}
                             >
                               Variantes
                             </button>
                          </div>
                          <div className="flex-1 flex items-center gap-2 px-1">
                          <input 
                              value={newQueueUrl}
                              onChange={(e) => setNewQueueUrl(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addToQueue()}
                              placeholder="URL de YouTube..."
                              className="bg-transparent border-none outline-none text-xs py-2 px-2 flex-1 text-slate-300 placeholder:text-slate-600"
                          />
                          <button 
                            onClick={addToQueue}
                            disabled={!newQueueUrl.trim()}
                            className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-2 font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 shadow-lg"
                          >
                            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">AÑADIR</span>
                          </button>
                      </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end md:ml-4">
                    <button 
                      onClick={copyNewTitles}
                      className="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-[var(--border-base)] rounded-lg flex items-center gap-2 font-black text-[10px] uppercase tracking-wider transition-all shadow shadow-black/50 overflow-hidden"
                    >
                      <Copy className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Copiar Títulos Nuevos</span>
                    </button>
                    <button 
                      onClick={insertManualField}
                      className="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-[var(--border-base)] rounded-lg flex items-center gap-2 font-black text-[10px] uppercase tracking-wider transition-all shadow shadow-black/50 overflow-hidden shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Insertar Campo Nuevo</span>
                    </button>
                  </div>
                </div>
                </header>

                <AnimatePresence>
                  {showBulkImport && (
                     <motion.div 
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: 'auto', opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="mb-8 border border-cyan-500/10 bg-cyan-500/5 rounded-2xl overflow-hidden shadow-2xl relative"
                     >
                        <div className="p-6 space-y-4">
                           <div className="flex justify-between items-center">
                              <h3 className="text-sm font-bold text-cyan-50 flex items-center gap-2 font-mono">
                                <PlusCircle className="w-4 h-4 text-cyan-400" /> BULK_IMPORT_MANIFEST
                              </h3>
                              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-black/40 px-2 py-0.5 rounded">UNA LÍNEA POR TÍTULO</span>
                           </div>
                           <textarea 
                             value={bulkImportText}
                             onChange={(e) => setBulkImportText(e.target.value)}
                             placeholder="Pega aquí los títulos de tus PDFs o capturas OCR..."
                             rows={6}
                             className="w-full bg-black/60 border border-[var(--border-base)] rounded-xl p-4 text-[11px] text-slate-300 outline-none focus:border-cyan-500/40 transition-all custom-scrollbar font-mono"
                           />
                           <div className="flex justify-end gap-3 pt-2">
                              <button onClick={() => setShowBulkImport(false)} className="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase letter-spacing-widest">DESCARTAR</button>
                              <button 
                                onClick={handleBulkImport}
                                disabled={!bulkImportText.trim() || isProcessing !== null}
                                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                               >
                                Iniciar Importación a {niches[activeWorkspace]?.name}
                              </button>
                           </div>
                        </div>
                     </motion.div>
                  )}
                </AnimatePresence>

                {/* Database-like view (NocoDB style) */}
                <div className="bg-[#111114] border border-[var(--border-base)]/50 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
                  <table className="hidden md:table w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#111114] border-b border-[var(--border-base)]">
                        <th className="p-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest w-12">#</th>
                        <th className="p-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest w-24">Fecha</th>
                        <th className="p-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest w-40">URL / Título Original</th>
                        <th className="p-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest">Nuevo Título</th>
                        <th className="p-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest w-24">Locución</th>
                        <th className="p-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest w-24">Estado</th>
                        <th className="p-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest text-right w-32">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {getFilteredHistory(history, activeWorkspace).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 text-xs italic">
                            No hay proyectos en la cola de {(niches as any)[activeWorkspace]?.name || activeWorkspace}. Añade un link para empezar.
                          </td>
                        </tr>
                      ) : (
                        (() => {
                           const filteredHistory = getFilteredHistory(history, activeWorkspace);
                           const totalCount = filteredHistory.length;
                           return filteredHistory.map((proj, idx) => (
                              <tr 
                                key={proj.id}
                                className="hover:bg-slate-800/20 group transition-colors"
                              >
                              <td className="p-4 text-[11px] text-slate-600 font-mono font-bold">
                                {totalCount - idx}
                              </td>
                               <td className="p-4 text-[11px] text-slate-500 font-mono">
                                 {new Date(proj.date).toLocaleDateString()}
                               </td>
                               <td className="p-4 group/orig relative">
                                {editingOriginalId === proj.id ? (
                                   <input 
                                     autoFocus
                                     value={tempOriginal}
                                     onChange={(e) => setTempOriginal(e.target.value)}
                                     onBlur={() => {
                                        const updated = { ...proj, originalTitle: tempOriginal };
                                        saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                                        setEditingOriginalId(null);
                                     }}
                                     onKeyDown={(e) => {
                                       if (e.key === 'Enter') {
                                         const updated = { ...proj, originalTitle: tempOriginal };
                                         saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                                         setEditingOriginalId(null);
                                       }
                                       if (e.key === 'Escape') setEditingOriginalId(null);
                                     }}
                                      className="w-full bg-[var(--bg-surface)] border border-slate-500/50 rounded px-2 py-1 text-[11px] text-slate-300 outline-none"
                                   />
                                ) : (
                                  <div 
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingOriginalId(proj.id);
                                          setTempOriginal(proj.originalTitle || '');
                                      }}
                                     className="cursor-text hover:bg-slate-800/40 p-1 -mx-1 rounded-md transition-colors"
                                  >
                                      <div className="text-[11px] font-medium text-slate-400 capitalize opacity-90 leading-tight flex items-center gap-1.5 min-h-[16px]">
                                         {proj.originalTitle === 'Recuperando título original...' && <Loader2 className="w-3 h-3 animate-spin text-cyan-500" />}
                                         {proj.originalTitle || '--'}
                                      </div>
                                      {proj.youtubeUrl && <div className="text-[9px] text-slate-600 mt-1 flex items-center gap-1 font-mono hover:text-cyan-500 transition-colors cursor-pointer w-fit" onClick={(e) => {e.stopPropagation(); window.open(proj.youtubeUrl, '_blank')}}>{proj.youtubeUrl}</div>}
                                  </div>
                                )}
                              </td>
                             <td className="p-4 group/title relative">
                               {editingTitleId === proj.id ? (
                                  <input 
                                    autoFocus
                                    value={tempTitle}
                                    onChange={(e) => setTempTitle(e.target.value)}
                                    onBlur={() => updateProjectTitle(proj.id, tempTitle)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') updateProjectTitle(proj.id, tempTitle);
                                      if (e.key === 'Escape') setEditingTitleId(null);
                                    }}
                                    className="w-full bg-[var(--bg-surface)] border border-cyan-500/50 rounded px-2 py-1 text-sm text-cyan-50 outline-none shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                  />
                               ) : (
                                 <div 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setEditingTitleId(proj.id);
                                     setTempTitle(proj.title || '');
                                   }}
                                   className="font-bold text-sm text-cyan-50/90 leading-tight cursor-text hover:text-cyan-400 transition-colors group-hover/title:bg-slate-800/40 p-1 rounded-md"
                                 >
                                   {!proj.title || proj.title === proj.originalTitle || proj.title === 'Nuevo Proyecto' || proj.title.includes('Recuperando') || proj.title.includes('Iniciando') || proj.title === 'En cola...' ? <span className="text-slate-600 italic font-medium text-xs">Esperando...</span> : proj.title}
                                 </div>
                               )}
                             </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1.5 w-fit">
                               <select
                                 value={proj.language || 'es'}
                                 onChange={(e) => {
                                    const updated = { ...proj, language: e.target.value };
                                    saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                                 }}
                                 className="bg-slate-800/80 px-1 py-1 rounded text-[9px] font-bold uppercase border border-slate-700/50 text-slate-400 text-center w-[110px] outline-none focus:border-cyan-500 cursor-pointer"
                               >
                                  {Object.entries(LANGUAGES).map(([code, name]) => (
                                    <option key={code} value={code}>{name}</option>
                                  ))}
                               </select>
                               <select
                                 value={proj.voice || 'Kore'}
                                 onChange={(e) => {
                                    const updated = { ...proj, voice: e.target.value };
                                    saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                                 }}
                                 className="bg-indigo-500/10 px-1 py-1 rounded text-[9px] font-bold uppercase border border-indigo-500/20 text-indigo-400 text-center w-[110px] outline-none focus:border-indigo-400 cursor-pointer"
                               >
                                 {VOICES.map((v) => (
                                   <option key={v.id} value={v.id} className="bg-[var(--bg-surface)]">{v.name}</option>
                                 ))}
                               </select>
                            </div>
                          </td>
                          <td className="p-4">
                            <select 
                              value={proj.status || 'Pendiente'}
                              onChange={(e) => {
                                const updated = { ...proj, status: e.target.value as any };
                                saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                              }}
                              className={cn(
                                "px-2.5 py-1.5 outline-none rounded-full text-[9px] font-bold uppercase border cursor-pointer appearance-none text-center transition-colors min-w-[80px]",
                                proj.status === 'Pendiente' ? "bg-amber-500/10 text-amber-500 border-amber-500/20 focus:border-amber-500" :
                                proj.status === 'En Proceso' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 focus:border-cyan-400" :
                                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 focus:border-emerald-500"
                              )}
                            >
                              <option value="Pendiente" className="bg-[#0c0c0e] text-amber-500">Pendiente</option>
                              <option value="En Proceso" className="bg-[#0c0c0e] text-cyan-400">En Proceso</option>
                              <option value="Hecho" className="bg-[#0c0c0e] text-emerald-400">Hecho</option>
                            </select>
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-3">
                               <button 
                                  onClick={() => runAutoPipeline(proj)}
                                  disabled={proj.status === 'En Proceso' || proj.status === 'Hecho'}
                                  className={cn(
                                    "px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all flex items-center gap-1.5 mr-2",
                                    proj.status === 'En Proceso' || proj.status === 'Hecho' ? "bg-slate-800/50 text-slate-500 border-[var(--border-base)] cursor-not-allowed" : "bg-slate-800 hover:bg-cyan-600/20 text-cyan-400 border-slate-700 hover:border-cyan-500/50"
                                  )}
                               >
                                  {proj.status === 'En Proceso' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                  Procesar
                               </button>
                               <div className="flex items-center gap-0.5 bg-slate-800/50 rounded-lg border border-[var(--border-base)]/80 p-0.5">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); openProject(proj); setActiveTab('studio'); }}
                                   className="p-1 px-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-md transition-all"
                                   title="Ver Proyecto"
                                 >
                                   <Eye className="w-4 h-4" />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); deleteHistory(proj.id).then(loadHistory); }}
                                   className="p-1 px-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </div>
                             </div>
                          </td>
                        </tr>
                      ))
                        })()
                      )}
                    </tbody>
                  </table>

                  {/* Mobile Card List */}
                  <div className="md:hidden divide-y divide-slate-800">
                    {(() => {
                        const filteredHistory = getFilteredHistory(history, activeWorkspace);
                        if (filteredHistory.length === 0) return (
                          <div className="p-10 text-center text-slate-500 text-xs italic">
                            No hay proyectos aquí.
                          </div>
                        );
                        const totalCount = filteredHistory.length;
                        return filteredHistory.map((proj, idx) => (
                          <div key={proj.id} className="p-5 flex flex-col gap-4 hover:bg-slate-800/10 transition-colors">
                             <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 overflow-hidden">
                                   <div className="flex items-center gap-2 mb-1 group/orig relative">
                                       <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">#{totalCount - idx}</span>
                                       {editingOriginalId === proj.id ? (
                                         <input 
                                           autoFocus
                                           value={tempOriginal}
                                           onChange={(e) => setTempOriginal(e.target.value)}
                                           onBlur={() => {
                                             const updated = { ...proj, originalTitle: tempOriginal };
                                             saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                                             setEditingOriginalId(null);
                                           }}
                                           onKeyDown={(e) => {
                                             if (e.key === 'Enter') {
                                               const updated = { ...proj, originalTitle: tempOriginal };
                                               saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                                               setEditingOriginalId(null);
                                             }
                                             if (e.key === 'Escape') setEditingOriginalId(null);
                                           }}
                                           className="w-full bg-[var(--bg-surface)] border border-slate-500/50 rounded px-1.5 py-0.5 text-[11px] text-slate-300 outline-none"
                                         />
                                       ) : (
                                        <div 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingOriginalId(proj.id);
                                            setTempOriginal(proj.originalTitle || '');
                                          }}
                                          className="text-[11px] font-black text-slate-100 truncate uppercase tracking-tight cursor-text hover:bg-slate-800/40 p-0.5 -ml-0.5 rounded transition-colors flex-1 min-w-[50px]"
                                        >
                                           {proj.originalTitle}
                                        </div>
                                       )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 italic truncate italic">
                                       {!proj.title || proj.title === proj.originalTitle || proj.title === 'Nuevo Proyecto' || proj.title.includes('Recuperando') || proj.title.includes('Iniciando') || proj.title === 'En cola...' ? 'Esperando...' : proj.title}
                                    </div>
                                 </div>
                                 <select 
                                  value={proj.status || 'Pendiente'}
                                  onChange={(e) => {
                                    const updated = { ...proj, status: e.target.value as any };
                                    saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                                  }}
                                  className={cn(
                                    "shrink-0 px-2.5 py-1 rounded-full text-[8px] font-black uppercase border outline-none appearance-none cursor-pointer text-center md:min-w-[70px] min-w-[60px]",
                                    proj.status === 'Pendiente' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                    proj.status === 'En Proceso' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  )}
                                >
                                  <option value="Pendiente" className="bg-[#0c0c0e] text-amber-500">Pendiente</option>
                                  <option value="En Proceso" className="bg-[#0c0c0e] text-cyan-400">En Proceso</option>
                                  <option value="Hecho" className="bg-[#0c0c0e] text-emerald-400">Hecho</option>
                                </select>
                              </div>

                           <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1.5 w-[90px]">
                                 <select
                                   value={proj.language || 'es'}
                                   onChange={(e) => {
                                      const updated = { ...proj, language: e.target.value };
                                      saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                                   }}
                                   className="bg-slate-800/80 px-1 py-1 rounded text-[8px] font-bold uppercase border border-slate-700/50 text-slate-400 text-center w-full outline-none focus:border-cyan-500 cursor-pointer"
                                 >
                                    {Object.entries(LANGUAGES).map(([code, name]) => (
                                      <option key={code} value={code}>{name}</option>
                                    ))}
                                 </select>
                                 <select
                                   value={proj.voice || 'Kore'}
                                   onChange={(e) => {
                                      const updated = { ...proj, voice: e.target.value };
                                      saveHistory(updated).then(() => setHistory(old => old.map(item => item.id === proj.id ? updated : item)));
                                   }}
                                   className="bg-indigo-500/10 px-1 py-1 rounded text-[8px] font-bold uppercase border border-indigo-500/20 text-indigo-400 text-center w-full outline-none focus:border-indigo-400 cursor-pointer"
                                 >
                                   {VOICES.map((v) => (
                                     <option key={v.id} value={v.id} className="bg-[var(--bg-surface)]">{v.name}</option>
                                   ))}
                                 </select>
                              </div>
                              <div className="flex items-center gap-3">
                                 <button 
                                    onClick={() => runAutoPipeline(proj)}
                                    disabled={proj.status === 'En Proceso' || proj.status === 'Hecho'}
                                    className="p-2 text-cyan-400 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg disabled:opacity-30"
                                 >
                                    <Play className="w-3.5 h-3.5" />
                                 </button>
                                 <div className="flex items-center gap-0.5 bg-slate-800/40 rounded-lg border border-[var(--border-base)]">
                                   <button onClick={() => { openProject(proj); setActiveTab('studio'); }} className="p-2 text-slate-300 hover:text-cyan-400 rounded-md transition-all">
                                      <Eye className="w-3.5 h-3.5" />
                                   </button>
                                   <button onClick={() => { deleteHistory(proj.id).then(loadHistory); }} className="p-2 text-red-500/60 hover:text-red-400 rounded-md transition-all">
                                      <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'radar' && (
            <motion.div 
              key="radar"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col pt-3 pb-0 px-2 md:p-6"
            >
              <Radar startFromRadar={handleStartFromRadar} addLog={addLog} user={user} />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 p-4 md:p-8 pb-[130px] md:pb-8 overflow-y-auto custom-scrollbar min-h-0"
            >
              <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
                <header className="mb-4 md:mb-8 border-b border-[var(--border-base)]/50 pb-4 text-center md:text-left">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">Ajustes Generales</h1>
                  <p className="text-slate-500 text-xs md:text-sm mt-1">Administra tus nichos, perfiles de voz y prompts globales.</p>
                </header>

                {/* Theme Selector */}
                <div className="bg-[#111114] border border-[var(--border-base)] rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg md:text-xl font-bold font-mono text-cyan-400 flex items-center gap-2">
                       <Palette className="w-5 h-5" /> TEMA VISUAL
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2 relative">
                     <select 
                       value={appTheme}
                       onChange={(e) => setAppTheme(e.target.value)}
                       className="w-full md:w-1/2 appearance-none bg-[var(--bg-surface)] border border-slate-700 p-4 rounded-xl text-sm font-semibold text-slate-200 outline-none focus:border-cyan-500 hover:border-slate-500 cursor-pointer shadow-lg transition-colors"
                     >
                       {APP_THEMES.map((theme) => (
                         <option key={theme.id} value={theme.id} className="bg-[#0c0c0e] hover:bg-cyan-500/10">
                           {theme.name}
                         </option>
                       ))}
                     </select>
                     <div className="absolute top-[18px] right-4 md:right-[calc(50%+1rem)] pointer-events-none">
                       <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />
                     </div>
                     <p className="text-xs text-slate-500 mt-2">
                       Selecciona el tema que cambiará la paleta global y los fondos de la aplicación.
                     </p>
                  </div>
                </div>

                <div className="bg-[#111114] border border-[var(--border-base)] rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg md:text-xl font-bold font-mono text-cyan-400">NICHOS</h2>
                    <button 
                      onClick={() => setEditingNiche({ 
                        id: '', 
                        name: '', 
                        tone: '', 
                        prompt: '', 
                        packagingPrompt: '', 
                        voiceInstructions: '', 
                        visualPromptInstructions: '', 
                        filterInstructions: '',
                        variantsPrompt: '',
                        variantScriptPrompt: ''
                      })}
                      className="px-3 md:px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 font-black text-[10px] uppercase tracking-wider transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span className="hidden md:inline">AGREGAR</span> NICHO
                    </button>
                  </div>

                  {editingNiche ? (
                    <div className="space-y-4 bg-[var(--bg-surface)]/50 p-4 md:p-6 rounded-xl border border-[var(--border-base)]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                           <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ID (Identificador)</label>
                           <input 
                             value={editingNiche.id}
                             readOnly={!!niches[editingNiche.id] && editingNiche.id !== ''}
                             onChange={e => setEditingNiche({...editingNiche, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')})}
                             className="w-full bg-black/40 border border-[var(--border-base)] p-2 rounded-lg text-xs outline-none focus:border-cyan-500"
                             placeholder="ej: mi_nicho"
                           />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Nombre del Nicho</label>
                           <input 
                             value={editingNiche.name}
                             onChange={e => setEditingNiche({...editingNiche, name: e.target.value})}
                             className="w-full bg-black/40 border border-[var(--border-base)] p-2 rounded-lg text-xs outline-none focus:border-cyan-500"
                           />
                         </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tono / Vibes</label>
                        <input 
                          value={editingNiche.tone}
                          onChange={e => setEditingNiche({...editingNiche, tone: e.target.value})}
                          className="w-full bg-black/40 border border-[var(--border-base)] p-2 rounded-lg text-xs outline-none focus:border-cyan-500"
                          placeholder="ej: misterioso, enérgico, educativo"
                        />
                      </div>

                       <div className="space-y-1">
                         <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cambio de Ángulo (Manual de Reescritura Directa)</label>
                         <textarea 
                           value={editingNiche.prompt}
                           onChange={e => setEditingNiche({...editingNiche, prompt: e.target.value})}
                           rows={6}
                           className="w-full bg-black/40 border border-[var(--border-base)] p-3 rounded-lg text-xs outline-none focus:border-cyan-500 custom-scrollbar"
                           placeholder="Instrucciones para cuando usas el botón 'Generar Automático'..."
                         />
                       </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Prompt de Packaging Viral y SEO (JSON)</label>
                        <textarea 
                          value={editingNiche.packagingPrompt}
                          onChange={e => setEditingNiche({...editingNiche, packagingPrompt: e.target.value})}
                          rows={6}
                          className="w-full bg-black/40 border border-[var(--border-base)] p-3 rounded-lg text-xs outline-none focus:border-cyan-500 custom-scrollbar"
                          placeholder="Reglas para títulos, descripción, tags..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Instrucciones para la Voz (TTS) en Inglés</label>
                        <textarea 
                          value={editingNiche.voiceInstructions}
                          onChange={e => setEditingNiche({...editingNiche, voiceInstructions: e.target.value})}
                          rows={4}
                          className="w-full bg-black/40 border border-[var(--border-base)] p-3 rounded-lg text-xs outline-none focus:border-cyan-500 custom-scrollbar"
                          placeholder="Speak in a very calm... (En inglés por defecto para Gemini TTS)"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Instrucciones para PROMPTS Visuales (Midjourney)</label>
                        <textarea 
                          value={editingNiche.visualPromptInstructions || ''}
                          onChange={e => setEditingNiche({...editingNiche, visualPromptInstructions: e.target.value})}
                          rows={4}
                          className="w-full bg-black/40 border border-[var(--border-base)] p-3 rounded-lg text-xs outline-none focus:border-cyan-500 custom-scrollbar"
                          placeholder="Generate Midjourney prompts focused on minimalist 2D flat vector illustrations..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Filtro (Gatekeeper - Criterios de Aprobación/Rechazo)</label>
                        <textarea 
                          value={editingNiche.filterInstructions || ''}
                          onChange={e => setEditingNiche({...editingNiche, filterInstructions: e.target.value})}
                          rows={4}
                          className="w-full bg-black/40 border border-[var(--border-base)] p-3 rounded-lg text-xs outline-none focus:border-cyan-500 custom-scrollbar"
                          placeholder="REJECT IF... APPROVE IF..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lluvia de Ideas (Variantes de Títulos y Enfoques)</label>
                        <textarea 
                          value={editingNiche.variantsPrompt || ''}
                          onChange={e => setEditingNiche({...editingNiche, variantsPrompt: e.target.value})}
                          rows={4}
                          className="w-full bg-black/40 border border-[var(--border-base)] p-3 rounded-lg text-xs outline-none focus:border-cyan-500 custom-scrollbar"
                          placeholder="Ej: 'Genera 5 alternativas de títulos...'. Esta instrucción manda sobre el modo variantes."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Escritura desde Variante (Guion Completo tras Elección)</label>
                        <textarea 
                          value={editingNiche.variantScriptPrompt || ''}
                          onChange={e => setEditingNiche({...editingNiche, variantScriptPrompt: e.target.value})}
                          rows={6}
                          className="w-full bg-black/40 border border-[var(--border-base)] p-3 rounded-lg text-xs outline-none focus:border-cyan-500 custom-scrollbar"
                          placeholder="Instrucciones específicas para desarrollar el guion a partir de la idea elegida..."
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                         <button 
                           onClick={() => setEditingNiche(null)}
                           className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold uppercase transition-all"
                         >
                           Cancelar
                         </button>
                         <button 
                           onClick={() => saveNiche(editingNiche)}
                           disabled={!editingNiche.id || !editingNiche.name}
                           className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase disabled:opacity-50 transition-all"
                         >
                           Guardar Nicho
                         </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {(Object.values(niches) as NicheConfig[]).map(niche => (
                         <div key={niche.id} className="bg-[var(--bg-surface)] border border-[var(--border-base)] p-4 rounded-xl flex flex-col gap-2 hover:border-cyan-500/50 transition-colors group">
                           <div className="flex justify-between items-start">
                             <div>
                               <h3 className="font-bold text-slate-200">{niche.name}</h3>
                               <p className="text-[10px] text-slate-500 italic font-mono mt-0.5">{niche.id}</p>
                             </div>
                             <div className="flex gap-1 md:gap-2 opacity-100 transition-opacity">
                               <button onClick={() => setEditingNiche(niche)} className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-lg border border-[var(--border-base)] md:border-none"><Settings className="w-4 h-4" /></button>
                               {!DEFAULT_NICHES[niche.id] && (
                                <button onClick={() => deleteNiche(niche.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg border border-[var(--border-base)] md:border-none"><Trash2 className="w-4 h-4" /></button>
                               )}
                             </div>
                           </div>
                           <div className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed"><strong>Ángulo:</strong> {niche.prompt}</div>
                           <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed"><strong>Packaging:</strong> {niche.packagingPrompt}</div>
                           <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed"><strong>Voz:</strong> {niche.voiceInstructions}</div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'studio' && (
            <motion.div 
              key="studio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              {/* Studio Toolbar */}
              <header className="h-16 border-b border-[var(--border-base)] bg-[#0c0c0e]/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-20">
                <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                   <button onClick={() => setStudioSidebarOpen(!studioSidebarOpen)} className="md:hidden p-2 text-slate-400 hover:text-cyan-400 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-base)] shrink-0">
                     <Menu className="w-4 h-4" />
                   </button>
                   <button onClick={() => {
                     if (activeProject && !isViewOnly) {
                       saveProjectState({
                         title,
                         youtubeUrl,
                         originalTranscript,
                         enhancedScript,
                         packaging,
                         visualPrompts,
                         language: targetLanguage as any,
                         voice,
                         ttsModel
                       });
                     }
                     setActiveTab('projects');
                   }} className="p-2 text-slate-600 hover:text-slate-400 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-base)] shrink-0"><ArrowRight className="w-4 h-4 rotate-180" /></button>
                  <button onClick={clearStudio} disabled={isViewOnly} title="Limpiar Studio" className="p-2 text-slate-600 hover:text-cyan-400 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-base)] shrink-0 disabled:opacity-50 transition-colors"><Plus className="w-4 h-4" /></button>
                  <div className="flex items-center gap-3 ml-2">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">Estado</span>
                        <span className="text-xs font-black text-cyan-400 uppercase tracking-tighter animate-pulse">{isProcessing || activeProject?.status || 'ESPERANDO'}</span>
                     </div>
                     {activeProject && (
                       <div className="flex gap-2">
                          <span className="uppercase text-[9px] font-bold text-slate-400 border border-slate-700 bg-slate-800 px-1.5 py-0.5 rounded">{niches[activeProject.workspaceId]?.name || activeProject.workspaceId}</span>
                          <span className="uppercase text-[9px] font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded">{getLangName(targetLanguage)}</span>
                       </div>
                     )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="hidden lg:flex items-center gap-6 px-5 py-2 bg-[#111114] border border-[var(--border-base)] rounded-2xl shadow-inner ml-2">
                       <div className="flex items-center gap-5">
                          <div className="flex flex-col">
                             <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">GEMINI FLASH</span>
                             <span className="text-[10px] font-mono text-cyan-400 font-black">{apiUsage.flash}/20</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">FLASH LITE</span>
                             <span className="text-[10px] font-mono text-emerald-400 font-black">{apiUsage.lite}/500</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">AUDIOS</span>
                             <span className="text-[10px] font-mono text-indigo-400 font-black">{apiUsage.tts}</span>
                          </div>
                       </div>
                    </div>

                   <div className="flex gap-2">
                      <button onClick={handleExport} disabled={!enhancedScript || isViewOnly} className={cn("px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest transition-all flex items-center gap-2", audioUrl ? "bg-cyan-600 text-white border-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)]" : "bg-[var(--bg-surface)] text-slate-600 border-[var(--border-base)]")}>
                        <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">EXPORTAR</span>
                      </button>
                   </div>
                </div>
              </header>

              <AnimatePresence>
                {globalError && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-red-500 text-white text-[11px] font-bold py-2 px-6 flex items-center justify-between shadow-2xl relative z-10"
                  >
                    <div className="flex items-center gap-2 italic uppercase tracking-wider">
                       <Zap className="w-3 h-3 fill-white" /> {globalError}
                    </div>
                    <button onClick={() => setGlobalError(null)} className="hover:scale-110"><Trash2 className="w-3 h-3" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 flex overflow-hidden min-h-0 relative">
                {/* Workflow Stepper Sidebar Overlay on Mobile */}
                <div className={cn(
                  "fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:relative md:bg-transparent md:inset-auto md:z-10 transition-all duration-300",
                  studioSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"
                )} onClick={() => setStudioSidebarOpen(false)}>
                  <div 
                    className={cn(
                      "w-72 h-full border-r border-[var(--border-base)] bg-[#111114] p-5 flex flex-col gap-4 transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none",
                      studioSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    )}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between md:hidden mb-2">
                       <span className="text-xs font-black text-cyan-400 tracking-[0.2em] uppercase">Pipeline de Flujo</span>
                       <button onClick={() => setStudioSidebarOpen(false)} className="p-2 text-slate-500 hover:text-white bg-[var(--bg-surface)] rounded-lg border border-[var(--border-base)]">
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                  <div className="flex flex-col gap-1 mb-2">
                     <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">Espacio de Trabajo</span>
                     <div className="flex gap-2 w-full">
                       <select 
                          value={activeWorkspace}
                          onChange={(e) => {
                            setActiveWorkspace(e.target.value);
                            setStudioSidebarOpen(false);
                          }}
                          className="flex-1 bg-slate-950 border border-[var(--border-base)] p-2 rounded-lg text-xs text-cyan-400 font-bold outline-none min-w-0"
                        >
                           <option value="ALL">🌟 Todos los Proyectos</option>
                           {(Object.values(niches) as NicheConfig[]).map((n) => (
                             <option key={n.id} value={n.id}>{n.name}</option>
                           ))}
                        </select>
                        <button 
                          onClick={() => { setActiveTab('settings'); setStudioSidebarOpen(false); }}
                          className="p-2 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-lg text-slate-400 hover:text-cyan-400 shrink-0"
                          title="Ajustes de Nicho"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                     </div>
                  </div>

                   <div className="flex flex-col gap-1 mb-2">
                     <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">Idioma de Salida</span>
                     <select 
                        value={targetLanguage}
                        onChange={(e) => {
                          const newLang = e.target.value;
                          setTargetLanguage(newLang);
                          saveProjectState({ language: newLang as any });
                          setStudioSidebarOpen(false);
                        }}
                        className="bg-slate-950 border border-[var(--border-base)] p-2 rounded-lg text-xs text-emerald-400 font-bold outline-none"
                      >
                         {Object.entries(LANGUAGES).map(([code, name]) => (
                           <option key={code} value={code}>{name}</option>
                         ))}
                      </select>
                  </div>

                  <div className="hidden md:flex flex-col gap-4 border-t border-[var(--border-base)]/40 pt-4 mt-2">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em] px-1">Guía del Creador</span>
                     <div className="space-y-3 px-1 text-[11px] text-slate-400">
                       <div className="p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10 space-y-1">
                         <div className="font-extrabold text-cyan-400 uppercase text-[9px] tracking-wider">1. Importa la Idea</div>
                         <p className="text-slate-500 text-[10px] leading-relaxed">Inserta un enlace de YouTube o ingresa una idea base para estructurar tu proyecto.</p>
                       </div>
                       <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/10 space-y-1">
                         <div className="font-extrabold text-purple-400 uppercase text-[9px] tracking-wider">2. Generación Viral</div>
                         <p className="text-slate-500 text-[10px] leading-relaxed">Convierte la fuente en un guion estructurado y optimizado con ganchos de retención alta.</p>
                       </div>
                       <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-1">
                         <div className="font-extrabold text-emerald-400 uppercase text-[9px] tracking-wider">3. SEO & Audiences</div>
                         <p className="text-slate-500 text-[10px] leading-relaxed">Crea títulos sugeridos, descripciones optimizadas y prompts visuales para tu diseño.</p>
                       </div>
                       <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-1">
                         <div className="font-extrabold text-indigo-400 uppercase text-[9px] tracking-wider">4. Locución de Elíte</div>
                         <p className="text-slate-500 text-[10px] leading-relaxed">Sintetiza la pista de audio principal usando voces de IA premium listas para producción.</p>
                       </div>
                     </div>
                  </div>
                  
                  {/* Hidden old controls to bypass block matching issues */}
                  <div className="hidden">

                  <button 
                    onClick={() => { rewriteScript(); setStudioSidebarOpen(false); }}
                    disabled={isProcessing === 'script' || !originalTranscript || isViewOnly}
                    className={cn(
                    "group flex flex-col justify-center p-4 rounded-xl border transition-all relative overflow-hidden",
                    enhancedScript ? "bg-emerald-500/5 border-emerald-500/10" : "bg-[var(--bg-surface)]/40 border-[var(--border-base)]/60 hover:border-cyan-500/40",
                    isProcessing === 'script' && "bg-cyan-500/5 border-cyan-500/30"
                  )}>
                    <div className="flex items-center justify-between w-full z-10 px-1">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[11px] font-black uppercase tracking-wider">2. Nuevo Guion</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isProcessing === 'script' ? 'Generando...' : 'Re-escritura Viral'}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        {isProcessing === 'script' ? <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /> : (enhancedScript ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Sparkles className="w-5 h-5 text-slate-600 transition-colors" />)}
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => { generatePackaging(); setStudioSidebarOpen(false); }}
                    disabled={isProcessing === 'packaging' || !enhancedScript || isViewOnly}
                    className={cn(
                    "group flex flex-col justify-center p-4 rounded-xl border transition-all relative overflow-hidden",
                    packaging ? "bg-emerald-500/5 border-emerald-500/10" : "bg-[var(--bg-surface)]/40 border-[var(--border-base)]/60 hover:border-cyan-500/40",
                    isProcessing === 'packaging' && "bg-cyan-500/5 border-cyan-500/30"
                  )}>
                    <div className="flex items-center justify-between w-full z-10 px-1">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[11px] font-black uppercase tracking-wider">3. Empaque</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isProcessing === 'packaging' ? 'Generando...' : 'SEO & Prompts'}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        {isProcessing === 'packaging' ? <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /> : (packaging ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Package className="w-5 h-5 text-slate-600 transition-colors" />)}
                      </div>
                    </div>
                  </button>

                    <div className="flex gap-2">
                       <button 
                         onClick={() => { generateAudioWorkflow(); setStudioSidebarOpen(false); }}
                         disabled={isProcessing === 'audio' || !enhancedScript || isViewOnly}
                         className={cn(
                           "group flex-1 flex flex-col justify-center p-4 rounded-xl border transition-all relative overflow-hidden",
                           audioUrl ? "bg-emerald-500/5 border-emerald-500/10" : "bg-[var(--bg-surface)]/40 border-[var(--border-base)]/60 hover:border-cyan-500/40",
                           isProcessing === 'audio' && "bg-cyan-500/5 border-cyan-500/30"
                         )}>
                         <div className="flex items-center justify-between w-full z-10 px-1">
                           <div className="flex flex-col items-start gap-1">
                             <span className="text-[11px] font-black uppercase tracking-wider">4. Locución</span>
                             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isProcessing === 'audio' ? `Sintetizando... ${progress}%` : 'Sintetizador Audio'}</span>
                           </div>
                           <div className="flex items-center justify-center">
                             {isProcessing === 'audio' ? <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" /> : (audioUrl ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Mic2 className="w-5 h-5 text-slate-600 transition-colors" />)}
                           </div>
                         </div>
                       </button>
                       {isProcessing === 'audio' && (
                         <motion.button 
                           initial={{ opacity: 0, scale: 0.8 }}
                           animate={{ opacity: 1, scale: 1 }}
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={() => {
                             setIsProcessing(null);
                             setAudioUrl(null);
                             setProgress(0);
                             addLog("Generación de audio detenida.");
                           }}
                           className="px-5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/20 transition-all flex flex-col items-center justify-center gap-1.5 relative overflow-hidden group"
                           title="Detener Locución"
                         >
                           <div className="w-2.5 h-2.5 bg-red-500 rounded-sm shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse"></div>
                           <span className="text-[7px] font-black uppercase tracking-tighter opacity-70 group-hover:opacity-100">Stop</span>
                         </motion.button>
                       )}
                    </div>
                  </div>

              </div>
            </div>

              {/* Workflow Main Editor Panels */}
                <div className="flex-1 flex flex-col p-2 md:p-6 pb-[160px] md:pb-6 gap-4 md:gap-6 overflow-y-auto custom-scrollbar relative">
                    {/* Visual Pipeline Stepper */}
                    <div className="border border-[var(--border-base)]/50 bg-[#111114]/80 backdrop-blur p-1 rounded-2xl flex items-center justify-between gap-1 w-full max-w-4xl mx-auto shadow-xl sticky top-0 z-30">
                      {[
                        { id: 1, label: "1. Guión Viral", desc: "Ideas, Transcripción y Edición", color: "from-cyan-500 to-blue-500", done: !!enhancedScript },
                        { id: 2, label: "2. SEO & Prompts", desc: "Títulos, Miniaturas y Visuales", color: "from-purple-500 to-indigo-500", done: !!packaging },
                        { id: 3, label: "3. Locución Master", desc: "TTS Premium Voces", color: "from-emerald-500 to-teal-500", done: !!audioUrl },
                      ].map((s) => {
                        const active = activeStep === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setActiveStep(s.id)}
                            className={cn(
                              "flex-1 flex flex-col md:flex-row items-center justify-center md:justify-start md:text-left gap-2 p-2.5 rounded-xl transition-all font-sans relative",
                              active 
                                ? "bg-slate-800 text-white shadow-md border border-white/5" 
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/45 border border-transparent"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                              active ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]" : s.done ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-950 text-slate-500"
                            )}>
                              {s.id}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={cn("text-[10px] uppercase font-black tracking-wider leading-none", active ? "text-cyan-400" : s.done ? "text-slate-300" : "text-slate-500")}>{s.label}</span>
                              <span className="text-[8px] font-bold text-slate-500 tracking-tight truncate hidden md:block mt-0.5">{s.desc}</span>
                            </div>
                            {s.done && (
                              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {activeStep === 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 h-auto md:h-[650px] flex-shrink-0 transition-all duration-500">
                      {/* Left Panel: Source Data */}
                      <div className="space-y-3 md:space-y-6 flex flex-col h-full min-w-0">
                        <div className="p-3 md:p-6 bg-[#111114] md:border border-[var(--border-base)] rounded-2xl md:rounded-3xl gap-3 md:space-y-6 shadow-2xl relative overflow-hidden group flex flex-col h-full ring-1 ring-white/5 md:ring-0">
                               <div className="flex items-center justify-between border-b border-[var(--border-base)]/50 pb-4 mb-2">
                                 <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                     <Youtube className="w-4 h-4 text-red-400" />
                                   </div>
                                   <div>
                                     <div className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Flujo 1</div>
                                     <div className="text-xs font-black text-white uppercase tracking-tight">FUENTE DE ENTRADA</div>
                                   </div>
                                 </div>
                                 {originalTranscript && (
                                   <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/10">Listo</span>
                                 )}
                               </div>

                               <div className="space-y-4 p-4 bg-black/20 rounded-2xl border border-white/[0.02]">
                                 <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                      <div className="flex items-center gap-3">
                                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block">URL de Youtube</label>
                                        <div className="flex items-center gap-1.5" title="Registrar automáticamente en la Cola">
                                          <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">A-Que</span>
                                          <button
                                            onClick={() => setAutoQueueEnabled(!autoQueueEnabled)}
                                            className={cn(
                                              "relative w-7 h-3.5 rounded-full transition-colors flex items-center shrink-0",
                                              autoQueueEnabled ? "bg-cyan-500" : "bg-slate-700"
                                            )}
                                          >
                                            <div
                                              className={cn(
                                                "w-2.5 h-2.5 bg-white rounded-full shadow-sm transform transition-transform",
                                                autoQueueEnabled ? "translate-x-[15px]" : "translate-x-0.5"
                                              )}
                                            />
                                          </button>
                                        </div>
                                      </div>
                                      <button 
                                        onClick={() => setIsVariantsMode(!isVariantsMode)}
                                        disabled={isViewOnly}
                                        className={cn(
                                          "px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all flex items-center gap-1.5 shadow-lg",
                                          isVariantsMode ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 ring-1 ring-cyan-500/20" : "bg-slate-800/80 text-slate-400 border-slate-700/50 hover:border-slate-600",
                                          isViewOnly && "opacity-50 cursor-not-allowed"
                                        )}
                                      >
                                        <Sparkles className={cn("w-3.5 h-3.5 transition-transform", isVariantsMode ? "rotate-12" : "grayscale opacity-50")} /> 
                                        <span className="hidden sm:inline">
                                          {isVariantsMode ? "Modo: Variantes" : "Modo: Normal"}
                                        </span>
                                      </button>
                                    </div>
                                    <div className="relative group/input">
                                      <input 
                                        value={youtubeUrl}
                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                        onBlur={() => saveProjectState({ youtubeUrl })}
                                        onKeyDown={(e) => e.key === 'Enter' && !isProcessing && !isViewOnly && processTranscript()}
                                        disabled={isViewOnly}
                                        placeholder={isVariantsMode ? "Pega un link de YouTube o escribe una idea/título..." : "https://www.youtube.com/watch?v=..."}
                                        className="w-full bg-black border border-[var(--border-base)] rounded-xl pl-4 pr-12 py-3 text-[11px] text-white outline-none focus:border-cyan-500 shadow-inner transition-all disabled:opacity-50"
                                      />
                                      <button 
                                        onClick={processTranscript}
                                        disabled={isProcessing === 'transcript' || isViewOnly}
                                        className={cn(
                                          "absolute right-1.5 top-1.5 p-2 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center",
                                          isVariantsMode && youtubeUrl && !/^(https?:\/\/)/i.test(youtubeUrl.trim()) 
                                            ? "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                                            : "bg-red-600 hover:bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                                        )}
                                        title={isVariantsMode && youtubeUrl && !/^(https?:\/\/)/i.test(youtubeUrl.trim()) ? "Generar Ángulos desde Idea" : isVariantsMode ? "Extraer + Ideas" : "Extraer Transcripción"}
                                      >
                                        {isProcessing === 'transcript' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                                          isVariantsMode && youtubeUrl && !/^(https?:\/\/)/i.test(youtubeUrl.trim()) ? <Sparkles className="w-3.5 h-3.5" /> : <Youtube className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                    {isVariantsMode && (
                                      <div className="text-[9px] text-cyan-500/70 italic px-1 pt-1 animate-pulse">
                                        ✨ Modo Variantes: Primero extraeremos ideas, luego eliges tu ángulo.
                                      </div>
                                    )}
                                 </div>

                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block">Título del Vídeo</label>
                                    <div className="relative group/title">
                                      <input 
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        onBlur={() => saveProjectState({ title })}
                                        onKeyDown={(e) => e.key === 'Enter' && isVariantsMode && !isProcessing && !isViewOnly && processIdeaFromTitle()}
                                        disabled={isViewOnly}
                                        placeholder="Título del proyecto..."
                                        className="w-full bg-black border border-[var(--border-base)] rounded-xl pl-4 pr-12 py-3 text-xs font-bold text-white outline-none focus:border-cyan-500 transition-all disabled:opacity-50"
                                      />
                                      {isVariantsMode && (
                                        <button 
                                          onClick={processIdeaFromTitle}
                                          disabled={isProcessing === 'transcript' || isViewOnly || !title.trim()}
                                          className={cn(
                                            "absolute right-1.5 top-1.5 p-2 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center",
                                            title.trim() 
                                              ? "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]" 
                                              : "bg-slate-800"
                                          )}
                                          title="Generar Ángulos desde Título/Idea"
                                        >
                                          {isProcessing === 'transcript' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        </button>
                                      )}
                                    </div>
                                 </div>


                               </div>

                               <div className="space-y-2 flex-1 flex flex-col">
                                  <div className="flex justify-between items-end">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block">
                                      Guion o Transcripción
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold">{getCleanTextLength(originalTranscript)} <span className="text-[10px] text-slate-500 font-black tracking-widest">CARACTERES</span></span>
                                      <button 
                                        onClick={() => copyToClipboard(originalTranscript, 'transcript')}
                                        className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-md transition-all flex items-center gap-1"
                                        title="Copiar Transcripción"
                                      >
                                        {copiedId === 'transcript' ? <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Copiado</span></> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  </div>
                                  <textarea 
                                    value={originalTranscript}
                                    onChange={(e) => setOriginalTranscript(e.target.value)}
                                    onBlur={() => saveProjectState({ originalTranscript })}
                                    readOnly={isViewOnly}
                                    placeholder="Escribe aquí tu guion o extrae uno de YouTube arriba..."
                                    className="w-full flex-1 min-h-[250px] md:min-h-0 bg-black border border-[var(--border-base)] rounded-2xl p-5 text-sm text-white outline-none font-sans custom-scrollbar transition-all leading-relaxed focus:border-red-500/40 disabled:opacity-50"
                                  />
                               </div>
                            </div>
                      </div>

                      {/* Right Panel: Enhanced Result */}
                      <div className="space-y-3 md:space-y-6 flex flex-col h-full min-w-0">
                        <div className="p-3 md:p-6 bg-[#111114] md:border border-[var(--border-base)] rounded-2xl md:rounded-3xl flex flex-col shadow-2xl relative overflow-hidden group h-full ring-1 ring-white/5 md:ring-0">
                                     <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-[var(--border-base)]/50 pb-4 mb-4">
                                       <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                           <Sparkles className="w-4 h-4 text-cyan-400" />
                                         </div>
                                         <div>
                                           <div className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Flujo 2</div>
                                           <div className="text-xs font-black text-white uppercase tracking-tight">RE-ESCRITURA VIRAL</div>
                                         </div>
                                       </div>
                                       
                                       <div className="flex items-center gap-2 w-full xl:w-auto self-stretch xl:self-auto font-sans">
                                         <button
                                           onClick={rewriteScript}
                                           disabled={isProcessing === 'script' || !originalTranscript || isViewOnly}
                                           className={cn(
                                             "flex-1 xl:flex-none bg-cyan-500 hover:bg-cyan-400 text-black disabled:bg-slate-800 disabled:text-slate-500 font-extrabold py-2 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg",
                                             enhancedScript && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 shadow-none hover:scale-[1.02]"
                                           )}
                                         >
                                           {isProcessing === 'script' ? (
                                             <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                           ) : (
                                             <Sparkles className="w-3.5 h-3.5" />
                                           )}
                                           {isProcessing === 'script' ? 'Generando...' : enhancedScript ? 'Re-escribir Guion' : 'Reescribir Guion'}
                                         </button>
                                       </div>
                                     </div>

                                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/[0.03] mb-4 font-sans">
                                       <div className="flex overflow-x-auto custom-scrollbar bg-black/60 p-1 rounded-xl border border-[var(--border-base)] shadow-inner w-full sm:w-auto shrink-0">
                                         <button 
                                            type="button"
                                            onClick={() => setScriptTab('full')}
                                            className={cn(
                                               "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap", 
                                               scriptTab === 'full' ? "bg-cyan-600 text-white shadow" : "text-slate-500 hover:text-slate-300"
                                            )}
                                         >
                                            Completo
                                         </button>
                                         <button 
                                            type="button"
                                            onClick={() => setScriptTab('tts_marks')}
                                            className={cn(
                                               "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap", 
                                               scriptTab === 'tts_marks' ? "bg-purple-600 text-white shadow" : "text-slate-500 hover:text-slate-300"
                                            )}
                                         >
                                            Locución (Marcas)
                                         </button>
                                         <button 
                                            type="button"
                                            onClick={() => setScriptTab('tts_clean')}
                                            className={cn(
                                               "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap", 
                                               scriptTab === 'tts_clean' ? "bg-pink-600 text-white shadow" : "text-slate-500 hover:text-slate-300"
                                            )}
                                         >
                                            Locución (Limpia)
                                         </button>
                                       </div>
                                       <div className="flex items-center justify-between w-full sm:w-auto gap-4 px-2">
                                         <div className="flex items-center gap-1 opacity-60">
                                            <span className="text-xs font-mono text-cyan-400 font-bold leading-none">{getCleanTextLength(scriptTab === 'full' ? enhancedScript : getCleanTtsScript(enhancedScript, scriptTab as any))}</span>
                                            <span className="text-[9px] text-slate-500 font-black tracking-widest uppercase">chars</span>
                                         </div>
                                         <button 
                                            type="button"
                                            onClick={() => copyToClipboard(scriptTab === 'full' ? enhancedScript : getCleanTtsScript(enhancedScript, scriptTab as any), 'script')}
                                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all border border-white/5 bg-black/40 flex items-center gap-1 px-2.5 h-7"
                                            title="Copiar Guion"
                                          >
                                            {copiedId === 'script' ? (
                                              <><Check className="w-3 h-3 text-emerald-400" /><span className="text-[9px] text-emerald-400 font-bold uppercase">Copiado</span></>
                                            ) : (
                                              <><Copy className="w-3 h-3 animate-pulse" /><span className="text-[9px] font-bold uppercase">Copiar</span></>
                                            )}
                                          </button>
                                       </div>
                                     </div>
                             <textarea 
                                value={scriptTab === 'full' ? enhancedScript : getCleanTtsScript(enhancedScript, scriptTab as any)}
                                onChange={(e) => {
                                  setEnhancedScript(e.target.value);
                                  if (scriptTab !== 'full') {
                                    addLog("Nota: Al editar en modo locución, se eliminarán las etiquetas estructurales (como imágenes y capítulos) del guion principal.");
                                  }
                                }}
                                onBlur={() => saveProjectState({ enhancedScript })}
                                disabled={isViewOnly}
                                placeholder={scriptTab === 'full' 
                                  ? "Aquí aparecerá el guion optimizado..." 
                                  : "Aquí aparecerá la versión limpia para TTS (sin etiquetas de imagen)..."}
                                className="flex-1 min-h-[250px] md:min-h-0 bg-black/40 border border-[var(--border-base)] rounded-2xl p-6 text-sm text-emerald-400/95 outline-none focus:border-emerald-500 shadow-inner font-sans custom-scrollbar leading-relaxed disabled:opacity-70"
                              />
                          </div>
                      </div>
                    </div>
                    )}

                    {activeStep === 2 && (
                      <div className="space-y-4 md:space-y-6 flex flex-col min-h-0">
                        {/* Step 3: Packaging & Prompts Control Banner */}
                    <div className="p-5 bg-[#111114] border border-[var(--border-base)] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center justify-center shadow-lg">
                          <Package className="w-5 h-5 text-slate-300" />
                        </div>
                        <div className="text-left font-sans">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Flujo 3</div>
                          <div className="text-sm font-black text-white tracking-tight uppercase">EMPAQUE VIRAL & PROMPTS DE DISEÑO</div>
                        </div>
                      </div>
                      <button
                        onClick={generatePackaging}
                        disabled={isProcessing === 'packaging' || !enhancedScript || isViewOnly}
                        className={cn(
                          "w-full sm:w-auto bg-[#1a1a20] hover:bg-[#202028] text-white border border-white/10 disabled:bg-slate-950 disabled:text-slate-700 disabled:opacity-40 font-extrabold py-3 px-6 rounded-xl uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 shadow-none font-sans",
                          packaging && "bg-[#102a1e] text-emerald-400 border border-emerald-500/20 hover:bg-[#153a2a] shadow-none hover:scale-[1.02]"
                        )}
                      >
                        {isProcessing === 'packaging' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Package className="w-4 h-4" />
                        )}
                        {isProcessing === 'packaging' ? 'Generando SEO & Prompts...' : packaging ? 'Regenerar SEO & Prompts' : 'Generar Empaque y Visual Prompts'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 h-auto md:h-[480px] flex-shrink-0">
                       <div className="p-3 md:p-6 bg-[#111114] md:border border-[var(--border-base)] rounded-2xl md:rounded-3xl shadow-xl flex flex-col h-full group ring-1 ring-white/5 md:ring-0">
                          <div className="flex items-center justify-between mb-3 md:mb-5">
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-cyan-500/10 flex items-center justify-center">
                                <Package className="w-3.5 h-3.5 text-cyan-400" />
                              </div>
                              Viral Packaging & SEO
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              <button 
                                onClick={() => copyToClipboard(packaging, 'packaging')}
                                className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-md transition-all flex items-center gap-1.5"
                                title="Copiar Empaque"
                              >
                                {copiedId === 'packaging' ? <><Check className="w-4 h-4 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Copiado</span></> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="w-full flex-1 min-h-[250px] md:min-h-0 bg-black/40 border border-[var(--border-base)] rounded-2xl p-4 md:p-5 flex flex-col overflow-hidden relative transition-colors focus-within:border-cyan-500/50">
                             <PrettyJsonDisplay 
                               text={packaging} 
                               placeholder="Títulos y Estrategia de Miniatura..." 
                               onChange={(val) => {
                                 setPackaging(val);
                                 saveProjectState({ packaging: val });
                               }}
                             />
                          </div>
                       </div>
                       <div className="p-3 md:p-6 bg-[#111114] md:border border-[var(--border-base)] rounded-2xl md:rounded-3xl shadow-xl flex flex-col h-full group ring-1 ring-white/5 md:ring-0">
                          <div className="flex items-center justify-between mb-3 md:mb-5">
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                               <div className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center">
                                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                              </div>
                              Creative Visual Prompts
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              <button 
                                onClick={() => copyToClipboard(visualPrompts, 'visualPrompts')}
                                className="p-1.5 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-md transition-all flex items-center gap-1.5"
                                title="Copiar Prompts"
                              >
                                {copiedId === 'visualPrompts' ? <><Check className="w-4 h-4 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Copiado</span></> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="w-full flex-1 min-h-[250px] md:min-h-0 bg-black/40 border border-[var(--border-base)] rounded-2xl p-4 md:p-5 flex flex-col overflow-hidden relative transition-colors focus-within:border-purple-500/50">
                             <PrettyJsonDisplay 
                               text={visualPrompts} 
                               placeholder="Prompts específicos para IA Generativa (Midjourney/Flux)..." 
                               onChange={(val) => {
                                 setVisualPrompts(val);
                                 saveProjectState({ visualPrompts: val });
                               }}
                             />
                          </div>
                       </div>
                    </div>
                    </div>
                    )}

                    {activeStep === 3 && (
                      <div className="space-y-4 md:space-y-6 flex flex-col min-h-0">
                        {/* Step 4: Final Audio & Metadata */}
                    <div className="p-4 md:p-8 bg-[#111114] md:border border-[var(--border-base)] rounded-2xl md:rounded-3xl gap-4 md:space-y-8 shadow-2xl relative overflow-hidden flex-shrink-0 ring-1 ring-white/5 md:ring-0">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none"></div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-base)]/10 pb-5 mb-5 w-full relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
                              <Mic2 className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                              <div className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Flujo 4</div>
                              <div className="text-xs font-black text-white uppercase tracking-tight">LOCUCIÓN DE ELITE (TTS)</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto font-sans">
                            {isProcessing === 'audio' && (
                              <button 
                                onClick={() => {
                                  setIsProcessing(null);
                                  setAudioUrl(null);
                                  setProgress(0);
                                  addLog("Generación de audio detenida.");
                                }}
                                className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/20 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5"
                                title="Detener Locución"
                              >
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div> Stop
                              </button>
                            )}
                            <button
                              onClick={generateAudioWorkflow}
                              disabled={isProcessing === 'audio' || !enhancedScript || isViewOnly}
                              className={cn(
                                "flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-500 hover:to-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 font-extrabold py-2 px-5 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg auto-animate hover:shadow-indigo-500/20 hover:scale-[1.02]",
                                audioUrl && "from-slate-800 to-slate-900 border border-indigo-500/30 text-slate-300 shadow-none"
                              )}
                            >
                              {isProcessing === 'audio' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mic2 className="w-3.5 h-3.5 text-indigo-400" />
                              )}
                              {isProcessing === 'audio' ? `Sintetizando... ${progress}%` : audioUrl ? 'Regenerar Audio Completo' : 'Sintetizar Audio Completo'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center relative z-10 w-full mb-4 md:mb-0">
                           <div className={cn(
                             "w-20 h-20 rounded-full border flex items-center justify-center flex-shrink-0 transition-all shadow-2xl",
                             isProcessing === 'audio' ? "bg-cyan-500/20 border-cyan-400 animate-pulse shadow-cyan-500/40" : audioUrl ? "bg-cyan-500 border-cyan-400 shadow-cyan-500/20" : "bg-[var(--bg-surface)] border-[var(--border-base)]"
                           )}>
                              {isProcessing === 'audio' ? <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /> : <Play className={cn("w-8 h-8 ml-1", audioUrl ? "text-white fill-white" : "text-slate-700")} />}
                           </div>
                           
                           <div className="flex-1 w-full space-y-4">
                              <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{isProcessing === 'audio' ? 'Sintetizando Master...' : 'Salida Master Audio'}</div>
                                  <div className="text-xs font-bold text-slate-200">Gemini TTS Engine • {voice}</div>
                                </div>
                                <div className="text-[10px] font-mono text-cyan-400 p-1 px-2 bg-cyan-500/10 rounded">24KHZ / WAV</div>
                              </div>
                              
                              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-[var(--border-base)] shadow-inner">
                                <motion.div 
                                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_15px_cyan]"
                                  initial={{ width: 0 }}
                                  animate={{ width: isProcessing === 'audio' ? `${progress}%` : audioUrl ? '100%' : '0%' }}
                                />
                              </div>
                              
                              {audioUrl && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-4">
                                    <audio ref={audioRef} controls src={audioUrl} className="flex-1 h-8 opacity-40 filter invert contrast-125" />
                                    <button onClick={handleExport} className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all" title="Descargar Master">
                                      <Download className="w-5 h-5" />
                                    </button>
                                  </div>
                                  
                                  {paragraphAudios.length > 0 && (
                                    <div className="mt-6 border-t border-[var(--border-base)]/60 pt-4">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Audios por Párrafo ({paragraphAudios.length})</h4>
                                      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                        {paragraphAudios.map((pa) => (
                                          <div key={pa.index} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--bg-surface)]/50 p-3 rounded-xl border border-[var(--border-base)]/40">
                                            <p className="flex-1 text-[10px] text-slate-300 line-clamp-2 italic opacity-80 select-all">"{pa.text}"</p>
                                            <div className="flex items-center gap-2">
                                              <audio controls src={pa.url} className="h-6 w-32 sm:w-48 opacity-50 filter invert contrast-125" />
                                              <a href={pa.url} download={`parrafo_${pa.index + 1}.wav`} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors" title="Descargar Párrafo">
                                                <Download className="w-3.5 h-3.5" />
                                              </a>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                           </div>
                        </div>
                           
                           <div className="flex flex-col gap-3 w-full md:w-auto p-4 bg-[var(--bg-surface)]/50 rounded-2xl border border-[var(--border-base)]/50">
                              <div className="space-y-3">
                                <div className="flex flex-col gap-2">
                                  <label className="text-[9px] uppercase font-black text-slate-600 tracking-[0.2em]">Motor TTS</label>
                                  <select 
                                    value={ttsModel}
                                    onChange={(e) => {
                                      if (isViewOnly) return;
                                      setTtsModel(e.target.value);
                                      saveProjectState({ ttsModel: e.target.value });
                                    }}
                                    disabled={isViewOnly}
                                    className="w-full bg-black/40 border border-[var(--border-base)] p-2.5 rounded-xl text-[10px] uppercase font-bold text-slate-300 outline-none focus:border-cyan-500 disabled:opacity-50"
                                  >
                                     <option value="gemini-3.1-flash-tts-preview" className="bg-[#0c0c0e]">3.1 Flash TTS (Preview)</option>
                                     <option value="gemini-2.5-flash-preview-tts" className="bg-[#0c0c0e]">2.5 Flash TTS</option>
                                     <option value="gemini-2.5-pro-preview-tts" className="bg-[#0c0c0e]">2.5 Pro TTS (HQ)</option>
                                  </select>
                                </div>
                                <div className="flex items-center justify-between border-t border-[var(--border-base)]/50 pt-3">
                                  <label className="text-[9px] uppercase font-black text-slate-600 tracking-[0.2em]">Selección de Locutor</label>
                                  <button onClick={() => window.open('https://ai.google.dev/api/rest/v1beta/SpeechConfig#prebuiltvoiceconfig', '_blank')} className="text-[8px] text-cyan-500 hover:underline">VER DOCS</button>
                                </div>
                                <div className="flex gap-2 items-center w-full">
                                  <select 
                                    value={voice}
                                    onChange={(e) => {
                                      if (isViewOnly) return;
                                      setVoice(e.target.value);
                                      saveProjectState({ voice: e.target.value });
                                    }}
                                    disabled={isViewOnly}
                                    className="flex-1 min-w-[140px] bg-black/40 border border-[var(--border-base)] p-3 rounded-xl text-xs text-slate-300 outline-none focus:border-cyan-500 overflow-hidden disabled:opacity-50"
                                  >
                                    {VOICES.map(v => <option key={v.id} value={v.id} className="bg-[#0c0c0e]">{v.name}</option>)}
                                  </select>
                                  <button 
                                     onClick={async () => {
                                        try {
                                           if (isProcessing) return;
                                           setIsProcessing('test_audio');
                                           addLog(`Generando demo para la voz: ${voice}...`);
                                           const ai = getAI();
                                           const demoScript = targetLanguage === 'es' 
                                            ? `Hola, mi nombre es ${voice}. Soy la voz que has seleccionado para narrar tu contenido. ¿Qué te parece?`
                                            : `Hello, my name is ${voice}. I am the voice you selected to narrate your content. How do I sound?`;
                                           const candidateModels = [
                                              ttsModel,
                                              "gemini-3.1-flash-tts-preview",
                                              "gemini-2.5-flash-preview-tts",
                                              "gemini-2.5-pro-preview-tts"
                                           ];
                                           const uniqueModels = Array.from(new Set(candidateModels)).filter(Boolean);
                                           let base64Audio = null;
                                           for (const mId of uniqueModels) {
                                              try {
                                                const response = await ai.models.generateContent({
                                                   model: mId,
                                                   contents: [{ parts: [{ text: demoScript }] }],
                                                   config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice as any } } } }
                                                });
                                                base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                                                if (base64Audio) break;
                                              } catch (e: any) {
                                                console.warn(`Demo failed with ${mId}:`, e.message);
                                                // ignore, try next
                                              }
                                           }

                                           if (base64Audio) {
                                              const pcm = base64ToPcm(base64Audio);
                                              const wavBlob = pcmToWav(pcm, 24000);
                                              const audio = new Audio(URL.createObjectURL(wavBlob));
                                              audio.play();
                                              addLog("Demo reproducido exitosamente.");
                                           }
                                        } catch(e) {
                                           handleAiError(e);
                                        } finally {
                                           setIsProcessing(null);
                                        }
                                     }}
                                     disabled={!!isProcessing}
                                     className="p-3 bg-slate-800 hover:bg-cyan-600 border border-slate-700 hover:border-cyan-500 rounded-xl transition-all disabled:opacity-50"
                                     title="Escuchar Demo de Voz"
                                  >
                                     {isProcessing === 'test_audio' ? <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" /> : <Play className="w-4 h-4 text-cyan-400 group-hover:text-white" />}
                                  </button>
                                </div>
                              </div>
                           </div>
                        </div>



                      </div>
                    )}

                      {/* Variants Overlay Panel (Movable/Draggable) */}
                      <AnimatePresence>
                        {isVariantsMode && scriptVariants && scriptVariants.length > 0 && (
                          <motion.div 
                            drag
                            dragMomentum={false}
                            initial={{ x: 200, y: 0, opacity: 0 }}
                            animate={{ x: 0, y: 0, opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed top-24 right-4 md:right-12 w-[340px] bg-[#0c0c0e]/98 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.1)] z-[100] overflow-hidden flex flex-col ring-1 ring-white/10"
                          >
                             {/* Drag Handle */}
                             <div className="h-8 flex items-center justify-center bg-white/5 cursor-grab active:cursor-grabbing border-b border-white/5 group">
                                <div className="w-12 h-1.5 bg-slate-700 rounded-full group-hover:bg-cyan-500/50 transition-colors"></div>
                             </div>

                             <div className="flex items-center justify-between p-6 bg-gradient-to-b from-white/5 to-transparent">
                                <div className="flex flex-col">
                                  <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Variantes de Ángulo
                                  </label>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{scriptVariants.length} IDEAS</span>
                                    <button 
                                      onClick={() => generateVariants(originalTranscript, title || 'Video Importado')}
                                      disabled={isProcessing === 'variants'}
                                      className="flex items-center gap-1 text-[9px] font-black text-cyan-500 hover:text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 transition-all uppercase"
                                    >
                                      {isProcessing === 'variants' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Regenerar
                                    </button>
                                  </div>
                                </div>
                                <button onClick={() => setScriptVariants(null)} className="p-2.5 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-2xl hover:bg-red-500/20">
                                  <X className="w-4 h-4" />
                                </button>
                             </div>
  
                             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 max-h-[60vh]">
                                {scriptVariants.map((v, i) => (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    key={i} 
                                    className={cn(
                                       "p-5 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden",
                                       selectedVariantIndex === i ? "bg-cyan-500/10 border-cyan-500/40 shadow-[0_15px_30px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20" : "bg-black/60 border-white/5 hover:bg-slate-800/40 hover:border-white/10"
                                    )}
                                    onClick={() => {
                                      setSelectedVariantIndex(i);
                                      const newTitle = v.title;
                                      setTitle(newTitle);
                                      saveProjectState({ title: newTitle, selectedVariantIndex: i });
                                    }}
                                  >
                                     <div className="flex justify-between items-start mb-2.5 gap-2">
                                        <h3 className={cn("text-[12px] font-bold leading-tight flex-1 transition-colors", selectedVariantIndex === i ? "text-cyan-50" : "text-slate-300 group-hover:text-cyan-400 uppercase tracking-tight")}>{v.title}</h3>
                                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    copyToClipboard(v.title, `variant_${i}`); 
                                                }}
                                                className={cn("p-1.5 rounded-lg transition-all border flex items-center gap-1", selectedVariantIndex === i ? "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20" : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600 bg-slate-800/50")}
                                                title="Copiar Título"
                                            >
                                                {copiedId === `variant_${i}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                            {selectedVariantIndex === i && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                                        </div>
                                     </div>
                                     <p className={cn("text-[10px] leading-relaxed transition-all", selectedVariantIndex === i ? "text-cyan-100/70" : "text-slate-500 line-clamp-2 group-hover:line-clamp-none")}>{v.idea}</p>
                                     
                                     {selectedVariantIndex === i && (
                                        <motion.button 
                                          initial={{ opacity: 0, y: 5 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          onClick={(e) => { e.stopPropagation(); generateScriptFromVariant(v); }}
                                          disabled={isProcessing === 'script'}
                                          className="mt-5 w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-none border border-cyan-500/20"
                                        >
                                          {isProcessing === 'script' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Aplicar Idea y Generar
                                        </motion.button>
                                     )}
                                  </motion.div>
                                ))}
                             </div>
                             <div className="p-5 bg-black/40 border-t border-white/5">
                                <p className="text-[9px] text-slate-600 text-center uppercase font-black tracking-widest italic flex items-center justify-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 animate-ping inline-block"></span>
                                  Arrastra este panel donde prefieras
                                </p>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                </div>

                 {/* Debug Console Overlay */}
                <AnimatePresence>
                  {showLogs && (
                    <motion.div 
                      id="debug-console"
                      initial={{ y: 300, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 300, opacity: 0 }}
                      className="fixed md:absolute bottom-[130px] md:bottom-6 left-4 right-4 md:left-6 md:right-6 h-48 bg-black/95 border border-[var(--border-base)] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-40 overflow-hidden flex flex-col backdrop-blur-xl"
                    >
                       <div id="debug-header" className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[var(--bg-surface)]/50">
                          <div className="flex items-center gap-2">
                            <MonitorPlay className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Debug Console & Pipeline Logs</span>
                          </div>
                          <button onClick={() => setShowLogs(false)} className="text-slate-500 hover:text-white shrink-0">
                            <Maximize2 className="w-3 h-3" />
                          </button>
                       </div>
                       <div id="debug-body" className="flex-1 p-5 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-1">
                          {logs.length === 0 ? (
                            <div className="text-slate-700 italic">Esperando eventos del pipeline...</div>
                          ) : (
                            logs.map((log, i) => (
                              <div key={i} className={cn(
                                "border-l-2 pl-3 py-0.5 whitespace-pre-wrap",
                                log.includes('ERROR') ? "border-red-500 text-red-400 bg-red-500/5" : "border-emerald-500 text-emerald-400/80"
                              )}>
                                {log}
                              </div>
                            ))
                          )}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}