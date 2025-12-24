
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * High-Fidelity Master Code Builder Orchestrator.
 * Adheres to 2025 standards (FastAPI, Next.js 15, Pydantic V2).
 */
export const runCodingPilot = async (instruction: string, context: string, stack: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `ACT AS: MasterCodeBuilder Orchestrator (v2025.1)
      STACK: ${stack}
      INSTRUCTION: ${instruction}
      VFS_CONTEXT: ${context}
      
      STANDARDS:
      - Python: Pydantic v2, FastAPI, uv-style dependencies.
      - Next.js: App Router, Server Actions, React 19.
      - Edge: Hono, Cloudflare Workers.
      
      OUTPUT FORMAT: Strict JSON.
      {
        "files": [{ "path": "string", "content": "string" }],
        "telemetry_logs": ["string"]
      }`,
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  return response.text || "{}";
};

/**
 * Monte Carlo Simulation Strategy.
 * Generates theoretical stochastic paths for financial or logical modeling.
 */
export const runSimulation = async (type: 'math' | 'logic', config: any) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `ACT AS: Stochastic Simulation Engine.
      TYPE: ${type}
      CONFIG: ${JSON.stringify(config)}
      
      TASK: Perform a Monte Carlo analysis. Return JSON with mean result and standard error estimates.`,
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 16000 }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { status: "error", message: "Failed to parse simulation output." };
  }
};

/**
 * Multimodal Analysis (Vision/Scanner).
 */
export const analyzeContent = async (base64Data: string, isImage: boolean = true) => {
  const parts: any[] = [{ text: "System Audit: Perform a deep structural analysis of the provided buffer. Categorize by technical stack and potential failure points." }];
  
  if (isImage) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data.split(',')[1]
      }
    });
  } else {
    parts.push({ text: base64Data });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts },
    config: { thinkingConfig: { thinkingBudget: 12000 } }
  });

  return response.text || "";
};

export const solveError = async (errorLog: string, context: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `URGENT: RESOLVE SYSTEM FAULT.
      LOG: ${errorLog}
      CONTEXT: ${context}
      
      Provide definitive repair steps.`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "" };
};

export const generateErrorReport = async (logs: any[], errors: any[], vfs: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Diagnostic Task: Generate System Health Report.
      LOGS: ${JSON.stringify(logs)}
      ERRORS: ${JSON.stringify(errors)}
      VFS: ${vfs}`,
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(response.text || "{}");
};
