
export type ConnectionStatus = 'connecting' | 'connected' | 'error';

export interface VNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: VNode[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
  file?: string;
  codeSnippet?: string;
  metadata?: Record<string, any>; // JSON-style structlog metadata
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  ORCHESTRATING = 'ORCHESTRATING',
  SIMULATING = 'SIMULATING',
  AUTOMATING = 'AUTOMATING',
  REPAIRING = 'REPAIRING'
}

export interface SimulationConfig {
  iterations: number;
  seed: number;
  params: {
    S0: number;
    K: number;
    T: number;
    r: number;
    sigma: number;
  };
}

export interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsed: number; // MB
  heapTotal: number; // MB
  timestamp: number;
}

export interface PilotConfig {
  web3Enabled: boolean;
  deploymentTarget: 'vercel' | 'netlify' | 'custom';
  backend: 'node' | 'python' | 'go';
}

export interface ErrorReport {
  summary: string;
  detectedErrors: string[];
  roadmap: string;
  suggestedScripts: { name: string, content: string }[];
}