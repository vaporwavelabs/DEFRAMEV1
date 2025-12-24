
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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  CODING = 'CODING',
  DEBUGGING = 'DEBUGGING',
  REFINING = 'REFINING',
  SIMULATING = 'SIMULATING',
  AUTOMATING = 'AUTOMATING',
  REPORTING = 'REPORTING'
}

export interface PilotConfig {
  web3Enabled: boolean;
  deploymentTarget: 'vercel' | 'netlify' | 'custom';
  backend: 'node' | 'python' | 'go';
}

export interface AutomationStep {
  action: string;
  target?: string;
  value?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ManualCredentials {
  username?: string;
  password?: string;
}

export interface ErrorReport {
  summary: string;
  detectedErrors: string[];
  roadmap: string;
  suggestedScripts: { name: string, content: string }[];
}
