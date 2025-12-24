
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Synthesizes errors and logs into a comprehensive guidance report and fix script.
 */
export const generateErrorReport = async (logs: any[], errors: any[], vfsJson: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are an Autonomous Systems Architect. Analyze the following project state and failure logs.
    
    ERROR LOGS: ${JSON.stringify(errors)}
    SYSTEM LOGS: ${JSON.stringify(logs)}
    PROJECT STRUCTURE: ${vfsJson}
    
    TASK:
    1. Summarize exactly what is failing.
    2. Create a "Guidance Script" (a roadmap for a human or another AI) to fix these issues.
    3. Provide the actual fix scripts/code blocks.
    
    Return JSON: {
      "summary": "...",
      "detectedErrors": ["...", "..."],
      "roadmap": "...",
      "suggestedScripts": [{ "name": "...", "content": "..." }]
    }`,
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(text);
  } catch (e) {
    return { summary: "Failed to generate report.", detectedErrors: [], roadmap: "", suggestedScripts: [] };
  }
};

/**
 * Analyzes multimodal content (image/text) using Gemini 3 series models.
 */
export const analyzeContent = async (content: string, isImage: boolean = false) => {
  const model = isImage ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const payload = isImage ? {
    inlineData: {
      mimeType: 'image/jpeg',
      data: content.split(',')[1]
    }
  } : { text: content };

  const prompt = isImage 
    ? "Analyze the UI shown in this image. Identify components, data structures, and logical flow. List potential errors or improvements."
    : `Analyze this data: ${content}. Provide structural insights.`;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [payload, { text: prompt }] },
    config: { thinkingConfig: { thinkingBudget: 16000 } }
  });

  return response.text || "";
};

/**
 * Plans and executes web automation steps, including navigation and login.
 */
export const runWebAutomation = async (instruction: string, credentials?: { username?: string, password?: string }) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Autonomous Web Agent Mode. 
    Instruction: ${instruction}
    Credentials Provided: ${credentials ? `User: ${credentials.username}, Pass: ${credentials.password}` : 'None'}
    
    Task: 
    1. Research the website structure using Google Search if necessary.
    2. Generate a sequence of automation steps (Navigate, Click, Type, Submit).
    3. If login is required, detail the specific fields to inject.
    
    Return JSON: { "steps": [{ "action": "navigate" | "click" | "type" | "submit", "target": "URL or CSS Selector", "value": "text to type", "description": "..." }], "goal": "..." }`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(text);
  } catch (e) {
    return { steps: [], goal: "Failed to parse automation plan." };
  }
};

/**
 * Runs a virtual simulation of the project code to detect errors.
 */
export const runSimulation = async (vfsJson: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a Code Simulation Engine. Here is the project structure: ${vfsJson}.
    Task: 'Run' this project in your mind. Check for structural integrity and logical connections.
    Format: { "status": "success" | "error", "logs": [{ "timestamp": "...", "message": "...", "type": "info" | "error" }] }`,
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(text);
  } catch (e) {
    return { status: "error", logs: [{ timestamp: new Date().toLocaleTimeString(), message: "Simulation error.", type: "error" }] };
  }
};

/**
 * Automatically researches and attempts to fix errors in the project.
 */
export const autonomousFix = async (errorLog: string, vfsJson: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Runtime Error Fix Loop.
    Error: ${errorLog}
    Context: ${vfsJson}
    Return: { "updatedFiles": [{ "path": "...", "content": "..." }], "explanation": "..." }`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  const text = response.text || "{}";
  try {
    const parsed = JSON.parse(text);
    return {
      ...parsed,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (e) {
    return { updatedFiles: [], explanation: "Fix engine failure.", sources: [] };
  }
};

/**
 * Acts as a senior engineer to generate or update project files.
 */
export const runCodingPilot = async (instruction: string, context: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Autonomous Senior Engineer. Instructions: ${instruction}. Context: ${context}. Return JSON: { "files": [{ "path": "...", "content": "..." }] }`,
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  return response.text || "";
};

/**
 * Solves general errors using Google Search grounding.
 */
export const solveError = async (errorLog: string, codeContext: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Error: ${errorLog}. Context: ${codeContext}. Solve with Google Search.`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return {
    text: response.text || "",
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};
