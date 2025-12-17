import { GoogleGenAI, Type, Schema } from '@google/genai';
import { AnalysisResult } from '../types';
import { blobToBase64 } from './audioUtils';

const SYSTEM_INSTRUCTION = `
You are an Expert Canine Behaviorist, Ethologist, and Bioacoustics Analyst.
Your task is to analyze the provided audio or image/video of a dog to decipher its emotional state and intent.
Translate "dog language" into human understanding.

Output strictly in JSON format.
The content of the text fields should be in Russian (as per the requested persona).
IMPORTANT: Enum values (like stressLevel) must remain in English as per the schema (Low, Medium, Critical).

Analysis Framework:
- Audio: Pitch (High=fear/play, Low=threat), Tone, Rhythm.
- Visual: Tail, Ears, Eyes, Mouth, Posture.

Prioritize safety. If signals conflict, assume a conservative safety interpretation.
`;

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    observations: {
      type: Type.OBJECT,
      properties: {
        sound: { type: Type.STRING, description: "Observations about bark, growl, rhythm, tone" },
        body: { type: Type.STRING, description: "Observations about tail, ears, posture, eyes" },
      },
      required: ["sound", "body"],
    },
    emotionalSpectrum: {
      type: Type.OBJECT,
      properties: {
        dominantEmotion: { type: Type.STRING, description: "e.g., Fear, Guarding, Play, Frustration" },
        stressLevel: { type: Type.STRING, enum: ["Low", "Medium", "Critical"] },
      },
      required: ["dominantEmotion", "stressLevel"],
    },
    translation: {
      type: Type.STRING,
      description: "First-person translation of what the dog is saying. e.g. 'I am nervous, give me space'",
    },
    recommendations: {
      type: Type.OBJECT,
      properties: {
        do: { type: Type.STRING, description: "Specific advice on how to react" },
        dont: { type: Type.STRING, description: "What NOT to do" },
      },
      required: ["do", "dont"],
    },
  },
  required: ["observations", "emotionalSpectrum", "translation", "recommendations"],
};

export const analyzeDogMedia = async (
  media: Blob,
  mimeType: string
): Promise<AnalysisResult> => {
  if (import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY) {
    const mediaBase64 = await blobToBase64(media);
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
      },
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: mediaBase64,
            },
          },
          {
            text: "Analyze this dog's behavior and vocalizations.",
          },
        ],
      },
    });

    if (!response.text) {
      throw new Error('No response from Gemini');
    }

    return JSON.parse(response.text) as AnalysisResult;
  }

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
      'X-Mime-Type': mimeType || 'application/octet-stream',
    },
    body: media,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API request failed (${response.status}): ${text || response.statusText}`);
  }

  return (await response.json()) as AnalysisResult;
};
