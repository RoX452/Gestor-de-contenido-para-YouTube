export interface ScriptVariant {
  title: string;
  idea: string;
}

export interface HistoryItem {
  id: string;
  workspaceId: string;
  date: number;
  title: string;
  originalTitle?: string;
  youtubeUrl?: string;
  status?: 'Pendiente' | 'En Proceso' | 'Hecho';
  originalTranscript: string;
  script: string;
  enhancedScript: string;
  voice: string;
  language: string;
  ttsModel?: string;
  audioUrl?: string;
  paragraphAudios?: { text: string; url: string; index: number }[];
  timestamps: string;
  packaging?: string;
  visualPrompts?: string;
  isVariantsMode?: boolean;
  scriptVariants?: ScriptVariant[];
  selectedVariantIndex?: number;
  userId?: string; // For cloud sync
}

export interface NicheConfig {
  id: string;
  name: string;
  tone: string;
  prompt: string;
  packagingPrompt: string;
  voiceInstructions: string;
  visualPromptInstructions: string;
  filterInstructions: string;
  variantsPrompt?: string; // Prompt for generating structural ideas/variants
  variantScriptPrompt?: string; // Prompt for generating the full script from a variant idea
  userId?: string; // For cloud sync
}
