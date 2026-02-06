
import { GoogleGenAI, Type } from "@google/genai";
import { SherlockAnalysis, AnalysisConfig } from "../types";

const SYSTEM_INSTRUCTION = `You are Sherlock Holmes. 
Observe every detail. Use the 'googleSearch' tool to identify specific brands, logos, or items (like watches, phones, or clothing labels) visible in the image.

Analyze:
1. Micro-details (wear patterns, stains, jewelry).
2. Posture and Body Language (confidence, fatigue, intent).
3. Context (likely occupation, recent activities).

Deduce the subject's INTENT (what they are about to do or why they are there).
You must return a strictly valid JSON response. Avoid conversational filler in the JSON.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    session_id: { type: Type.STRING },
    scan_data: {
      type: Type.OBJECT,
      properties: {
        gender: { type: Type.STRING },
        age_range: { type: Type.STRING },
        environment: { type: Type.STRING },
        attention_score: { type: Type.NUMBER },
        posture_score: { type: Type.NUMBER },
        stance: { type: Type.STRING },
        balance: { type: Type.STRING },
        intent_prediction: { type: Type.STRING },
        behavioral_flags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["gender", "intent_prediction", "behavioral_flags", "attention_score"]
    },
    deductions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          logic_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.INTEGER },
                y: { type: Type.INTEGER },
                width: { type: Type.INTEGER },
                height: { type: Type.INTEGER },
                description: { type: Type.STRING }
              }
            }
          }
        }
      }
    },
    final_assessment: { type: Type.STRING },
    session_memory: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["session_id", "scan_data", "deductions", "final_assessment"]
};

export async function analyzeEvidence(
  base64Image: string,
  mimeType: string,
  sessionId: string,
  config: AnalysisConfig,
  previousMemory: string[] = []
): Promise<SherlockAnalysis> {
  // Use the exact mandated initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const priorityInstruction = config.priorityFlags.length > 0 
    ? `IMPORTANT: Prioritize looking for and flagging these behaviors/traits: ${config.priorityFlags.join(', ')}.`
    : '';
  
  const thresholdInstruction = `Only include deductions where you are confident (confidence > ${config.confidenceThreshold}).`;
  const depthInstruction = config.depthLevel === 'exhaustive' 
    ? "Perform an exhaustive analysis. Notice even the smallest scuffs or fabric pills." 
    : config.depthLevel === 'fast' 
    ? "Perform a rapid scan. Focus on the most obvious and high-impact clues." 
    : "Perform a standard Sherlockian analysis.";

  const promptText = `Identify items using search. Case: ${sessionId}. Previous Context: ${previousMemory.join(', ')}. 
    ${priorityInstruction} ${thresholdInstruction} ${depthInstruction}
    Deduce subject intent. Provide clear logical steps for each deduction.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ 
      parts: [
        { text: promptText }, 
        { inlineData: { data: base64Image, mimeType: mimeType } }
      ] 
    }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    }
  });

  try {
    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText) as SherlockAnalysis;
    
    if (parsed.deductions) {
      parsed.deductions = parsed.deductions.filter(d => d.confidence >= config.confidenceThreshold);
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && parsed.deductions) {
      parsed.deductions.forEach(d => {
        const matchingChunks = groundingChunks.filter(c => c.web);
        if (matchingChunks.length > 0) {
          d.grounding = matchingChunks.map(c => ({
            title: c.web?.title || 'Research Source',
            uri: c.web?.uri || '#'
          }));
        }
      });
    }

    return parsed;
  } catch (e) {
    console.error("Parse error:", e);
    throw new Error("Logical failure in thinking palace.");
  }
}
