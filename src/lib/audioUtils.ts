/**
 * Utility to convert raw PCM data (S16_LE) to a WAV file.
 */
export function pcmToWav(pcmData: Int16Array, sampleRate: number = 24000): Blob {
  const buffer = new ArrayBuffer(44 + pcmData.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + pcmData.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * channelCount * bitsPerSample / 8)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channelCount * bitsPerSample / 8)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, pcmData.length * 2, true);

  // write PCM samples
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(44 + i * 2, pcmData[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Decodes base64 PCM data to Int16Array.
 */
export function base64ToPcm(base64: string): Int16Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

/**
 * Combines multiple Int16Arrays into one.
 */
export function combinePcms(pieces: Int16Array[]): Int16Array {
  const totalLength = pieces.reduce((acc, p) => acc + p.length, 0);
  const combined = new Int16Array(totalLength);
  let offset = 0;
  for (const p of pieces) {
    combined.set(p, offset);
    offset += p.length;
  }
  return combined;
}

/**
 * Extracts raw PCM data (Int16Array) from an ArrayBuffer containing a standard WAV file.
 * Assumes a 44-byte RIFF header, matching pcmToWav implementation.
 */
export function wavToPcm(wavBuffer: ArrayBuffer): Int16Array {
  return new Int16Array(wavBuffer, 44);
}

/**
 * Converts PCM data to a base64 WAV string (Async).
 */
export async function pcmToWavBase64(pcmData: Int16Array, sampleRate: number = 24000): Promise<string> {
  const blob = pcmToWav(pcmData, sampleRate);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Formats seconds to mm:ss.
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
