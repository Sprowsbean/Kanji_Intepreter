import { GoogleGenerativeAI } from '@google/generative-ai';
import type { KanjiCard } from '../types/kanji';

const SYSTEM_INSTRUCTION = `You are a professional Japanese Teacher. Analyze the image to find all Kanji text. For each Kanji found, return a STRICT JSON array of objects. Each object must have:
- 'kanji': The character itself.
- 'romaji': The romanized pronunciation (e.g., 'kuruma').
- 'readings': A string showing On'yomi (Katakana) and Kun'yomi (Hiragana).
- 'meaning': The English definition.
- 'context': If the kanji forms a word (like 'Tokyo'), define the whole word, not just the separate characters.
- 'level': The estimated JLPT level (N5-N1).

Return ONLY valid JSON array, no other text.`;

export async function analyzeKanjiImage(imageFile: File): Promise<KanjiCard[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_INSTRUCTION
  });

  const imageData = await fileToBase64(imageFile);

  const result = await model.generateContent([
    {
      inlineData: {
        data: imageData.split(',')[1],
        mimeType: imageFile.type,
      },
    },
    'Analyze this image and extract all Kanji characters with their information. Return as JSON array.',
  ]);

  const response = await result.response;
  const text = response.text();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No Kanji found in the image');
  }

  const kanjiData = JSON.parse(jsonMatch[0]) as KanjiCard[];

  if (!kanjiData || kanjiData.length === 0) {
    throw new Error('No Kanji found in the image');
  }

  return kanjiData;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
