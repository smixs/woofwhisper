import { GoogleGenAI, Type, Schema } from '@google/genai';

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
        sound: { type: Type.STRING, description: 'Observations about bark, growl, rhythm, tone' },
        body: { type: Type.STRING, description: 'Observations about tail, ears, posture, eyes' },
      },
      required: ['sound', 'body'],
    },
    emotionalSpectrum: {
      type: Type.OBJECT,
      properties: {
        dominantEmotion: { type: Type.STRING, description: 'e.g., Fear, Guarding, Play, Frustration' },
        stressLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'Critical'] },
      },
      required: ['dominantEmotion', 'stressLevel'],
    },
    translation: {
      type: Type.STRING,
      description: "First-person translation of what the dog is saying. e.g. 'I am nervous, give me space'",
    },
    recommendations: {
      type: Type.OBJECT,
      properties: {
        do: { type: Type.STRING, description: 'Specific advice on how to react' },
        dont: { type: Type.STRING, description: 'What NOT to do' },
      },
      required: ['do', 'dont'],
    },
  },
  required: ['observations', 'emotionalSpectrum', 'translation', 'recommendations'],
};

function readBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server is missing GEMINI_API_KEY' }));
    return;
  }

  try {
    const body = await readBody(req);
    if (!body.length) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Empty request body' }));
      return;
    }

    const mimeTypeHeader = req.headers?.['x-mime-type'];
    const contentTypeHeader = req.headers?.['content-type'];
    const mimeType =
      (Array.isArray(mimeTypeHeader) ? mimeTypeHeader[0] : mimeTypeHeader) ||
      (Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader) ||
      'application/octet-stream';

    const mediaBase64 = body.toString('base64');

    const ai = new GoogleGenAI({ apiKey });
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
              mimeType,
              data: mediaBase64,
            },
          },
          { text: "Analyze this dog's behavior and vocalizations." },
        ],
      },
    });

    const text = response.text;
    if (!text) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'No response text from Gemini' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(text);
  } catch (error: any) {
    console.error('Gemini Analysis Error:', error?.message ?? error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Gemini request failed' }));
  }
}

