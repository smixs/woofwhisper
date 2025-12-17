import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

const SYSTEM_INSTRUCTION = `
You are an Expert Canine Behaviorist, Ethologist, and Bioacoustics Analyst.
Your task is to analyze the provided audio or image/video of a dog to decipher its emotional state and intent.
Translate "dog language" into human understanding.

Output strictly in JSON format.
The content of the fields should be in Russian (as per the requested persona), but the keys must match the schema.

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
  mediaBase64: string,
  mimeType: string
): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7, // Slight creativity for the "translation" persona
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
      throw new Error("No response from Gemini");
    }

    const result = JSON.parse(response.text) as AnalysisResult;
    return result;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
