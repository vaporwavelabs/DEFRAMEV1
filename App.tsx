
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Maximize2, Minimize2, Terminal as TerminalIcon, Code, 
  MessageSquare, AlertCircle, RefreshCw, FolderTree, 
  Zap, Globe, Database, Settings, X, GripVertical, Search,
  Play, Bug, CheckCircle, FileCode, Layers, MousePointer2, 
  Monitor, ShieldCheck, Key, ArrowRight, FileText, ClipboardList, Cpu,
  Crosshair, Move, Camera, Scan, Unlock, Cloud, CloudOff, CloudSync,
  Activity, Radio
} from 'lucide-react';
import { VNode, LogEntry, ChatMessage, AppState, PilotConfig, AutomationStep, ManualCredentials, ErrorReport } from './types';
import { analyzeContent, runCodingPilot, solveError, runSimulation, autonomousFix, runWebAutomation, generateErrorReport } from './geminiService';
import { supabase, persistAppState, persistLog, persistChat, fetchLatestSession } from './supabase';

// --- Sub-components ---

const LogWindow = ({ logs, title, icon: Icon, colorClass, collapsible = true, onAction, actionLabel = "RUN" }: { 
  logs: LogEntry[], title: string, icon: any, colorClass: string, collapsible?: boolean, onAction?: () => void, actionLabel?: string 
}) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className={`glass rounded-none overflow-hidden flex flex-col transition-all duration-300 ${isOpen ? 'h-64' : 'h-10'}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-green-500/10 border-b border-green-500/30 cursor-pointer" onClick={() => collapsible && setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          <Icon size={14} className={colorClass} />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {onAction && isOpen && (
            <button 
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              className="px-2 py-0.5 border border-green-500 text-green-500 text-[9px] hover:bg-green-500 hover:text-black"
            >
              {actionLabel}
            </button>
          )}
          {collapsible && (isOpen ? <Minimize2 size={12} /> : <Maximize2 size={12} />)}
        </div>
      </div>
      {isOpen && (
        <div className="flex-1 p-3 font-mono text-[10px] overflow-y-auto space-y-1 bg-black">
          {logs.length === 0 && <div className="text-green-900 italic opacity-50">// No buffer data...</div>}
          {logs.map(log => (
            <div key={log.id} className="border-l border-green-500/20 pl-2 py-0.5">
              <div className="flex justify-between text-[9px] text-green-700 mb-0.5">
                <span className={log.level === 'error' ? 'text-red-500 font-bold' : log.level === 'success' ? 'text-green-400' : 'text-green-600'}>
                  [{log.level.toUpperCase()}]
                </span>
                <span>{log.timestamp}</span>
              </div>
              <p className="text-green-500 leading-tight">{log.message}</p>
              {log.details && <pre className="mt-1 text-green-900 whitespace-pre-wrap text-[8px] bg-green-500/5 p-1 border border-green-500/10">{log.details}</pre>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [isChatDetached, setIsChatDetached] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'error' | 'idle'>('idle');
  
  // Vision Frame (Scanner) State
  const [isVisionDetached, setIsVisionDetached] = useState(false);
  const [visionPosition, setVisionPosition] = useState({ x: 100, y: 100 });
  const [visionSize, setVisionSize] = useState({ w: 500, h: 350 });
  const [isDraggingVision, setIsDraggingVision] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const [vfs, setVfs] = useState<VNode[]>([
    { name: 'root', path: '/', type: 'folder', children: [] }
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errors, setErrors] = useState<LogEntry[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  
  const [analysisTarget, setAnalysisTarget] = useState<string | null>(null);
  const [isWindowExpanded, setIsWindowExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'vision' | 'browser' | 'report'>('vision');
  
  const [automationPlan, setAutomationPlan] = useState<AutomationStep[]>([]);
  const [browserUrl, setBrowserUrl] = useState('https://github.com/login');
  const [browserStatus, setBrowserStatus] = useState('IDLE');

  const [manualCreds, setManualCreds] = useState<ManualCredentials>({ username: '', password: '' });
  const [showVault, setShowVault] = useState(false);
  const [currentReport, setCurrentReport] = useState<ErrorReport | null>(null);
  
  const [pilotConfig, setPilotConfig] = useState<PilotConfig>({
    web3Enabled: false,
    deploymentTarget: 'custom',
    backend: 'node'
  });

  const isInitialMount = useRef(true);

  // --- Persistence Logic ---

  useEffect(() => {
    const initSession = async () => {
      setCloudStatus('syncing');
      try {
        const session = await fetchLatestSession();
        if (session) {
          if (session.vfs_json) setVfs(session.vfs_json);
          if (session.pilot_config) setPilotConfig(session.pilot_config);
          setCloudStatus('connected');
        } else {
          setCloudStatus('connected');
        }
      } catch (err) {
        setCloudStatus('error');
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setCloudStatus('syncing');
      persistAppState(vfs, pilotConfig)
        .then(() => setCloudStatus('connected'))
        .catch(() => setCloudStatus('error'));
    }, 2000);
    return () => clearTimeout(timer);
  }, [vfs, pilotConfig]);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info', details?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      level,
      message,
      details
    };
    
    persistLog(newLog);

    if (level === 'error') {
      setErrors(prev => [newLog, ...prev]);
    } else {
      setLogs(prev => [newLog, ...prev]);
    }
  }, []);

  const handleAnalysis = useCallback(async (customContent?: string) => {
    const target = customContent || analysisTarget;
    if (!target) {
      addLog("SCANNER: TARGET BUFFER EMPTY.", "warn");
      return;
    }
    setAppState(AppState.ANALYZING);
    setIsScanning(true);
    addLog("SCANNER: INITIATING MULTIMODAL DECODE...", "info");
    try {
      const isImage = target.startsWith('data:image');
      const result = await analyzeContent(target, isImage);
      addLog("SCANNER: SIGNAL CAPTURED. ANALYZING STRUCTURE...", "success", result);
      
      // If we got a result, add it to chat history as well for context
      const assistantMsg: ChatMessage = { id: Date.now().toString(), role: 'assistant', content: `[VISUAL ANALYSIS RESULT]\n\n${result}` };
      setChatHistory(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      addLog("SCANNER: FAULT DETECTED", "error", err.message);
    } finally {
      setAppState(AppState.IDLE);
      setIsScanning(false);
    }
  }, [analysisTarget, addLog]);

  const captureAndAnalyze = async () => {
    addLog("VISION: TRIGGERING SCANNER ACTIVATION...", "info");
    try {
      // Prompt user to select 'This Tab' or 'Entire Screen'
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          cursor: "never",
          displaySurface: "browser"
        } as any 
      });
      
      setIsScanning(true);
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      
      // Calculate coordinates relative to the screen/tab
      // Note: This relies on the browser providing a consistent coordinate space for the tab
      const cropX = visionPosition.x * dpr;
      const cropY = (visionPosition.y + 32) * dpr; // Account for the scanner's title bar
      const cropW = visionSize.w * dpr;
      const cropH = (visionSize.h - 32) * dpr;

      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      
      // Attempt spatial crop from the display stream
      ctx?.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      
      const screenshot = canvas.toDataURL('image/jpeg', 0.9);
      setAnalysisTarget(screenshot);
      stream.getTracks().forEach(t => t.stop());
      
      addLog("VISION: TARGET ACQUIRED. PROCESSING...", "success");
      await handleAnalysis(screenshot);
    } catch (err: any) {
      addLog("VISION: SCANNER REJECTED.", "error", err.message);
      setIsScanning(false);
    }
  };

  const handleWebAutomationTask = async (instruction: string) => {
    setAppState(AppState.AUTOMATING);
    setActiveTab('browser');
    setBrowserStatus('PLANNING...');
    addLog(`NET: CALCULATING TRAJECTORY FOR "${instruction}"`, "info");
    
    try {
      const plan = await runWebAutomation(instruction, manualCreds.username ? manualCreds : undefined);
      setAutomationPlan(plan.steps.map((s: any) => ({ ...s, status: 'pending' })));
      
      if (plan.steps.some((s: any) => s.action === 'type' && (s.target?.toLowerCase().includes('pass') || s.target?.toLowerCase().includes('login')))) {
        setShowVault(true);
        addLog("NET: AUTHENTICATION FLOW DETECTED. OPENING VAULT.", "warn");
      }

      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        setAutomationPlan(current => {
          const updated = [...current];
          updated[i].status = 'running';
          return updated;
        });
        
        setBrowserStatus(`EXEC: ${step.action}`);
        addLog(`STEP ${i+1}: ${step.action} -> ${step.target || 'TARGET_LOCATED'}`, "info");
        await new Promise(r => setTimeout(r, 1000));
        if (step.action === 'navigate' && step.target) setBrowserUrl(step.target);

        setAutomationPlan(current => {
          const updated = [...current];
          updated[i].status = 'completed';
          return updated;
        });
      }
      
      setBrowserStatus('READY');
      addLog("NET: OPERATION FINALIZED.", "success");
    } catch (err: any) {
      addLog("NET: PROTOCOL FAULT", "error", err.message);
      setBrowserStatus('HALTED');
    } finally {
      setAppState(AppState.IDLE);
    }
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: `> ${command}` };
    setChatHistory(prev => [...prev, userMsg]);
    persistChat(userMsg);
    setUserInput('');

    const cmd = command.toLowerCase();
    if (cmd.includes('navigate') || cmd.includes('login') || cmd.includes('website')) {
      handleWebAutomationTask(command);
    } else if (cmd.includes('report') || cmd.includes('guide')) {
      generateErrorReport(logs, errors, JSON.stringify(vfs)).then(r => { setCurrentReport(r); setActiveTab('report'); });
    } else if (cmd.includes('scan') || cmd.includes('analyze')) {
      if (!isVisionDetached) setIsVisionDetached(true);
      addLog("CMD: SCAN REQUESTED. PLEASE ACTIVATE SCANNER MANUALLY.", "info");
    } else if (cmd.includes('create') || cmd.includes('script')) {
      setAppState(AppState.CODING);
      addLog(`CMD: ${command}`, 'info');
      runCodingPilot(command, JSON.stringify(vfs)).then(res => {
        const parsed = JSON.parse(res);
        if (parsed.files) {
          parsed.files.forEach((f: any) => addLog(`SHELL: FILE "${f.path}" COMMITTED.`, 'success'));
          setVfs(prev => {
            const nv = [...prev];
            parsed.files.forEach((f:any) => nv[0].children?.push({ name: f.path.split('/').pop() || f.path, path: f.path, type: 'file', content: f.content }));
            return nv;
          });
        }
        setAppState(AppState.IDLE);
      });
    } else {
      setAppState(AppState.ANALYZING);
      solveError(command, "KERNEL_CONTEXT").then(r => {
        const assistantMsg: ChatMessage = { id: Date.now().toString(), role: 'assistant', content: r.text };
        setChatHistory(prev => [...prev, assistantMsg]);
        persistChat(assistantMsg);
        setAppState(AppState.IDLE);
      });
    }
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDraggingVision) {
        setVisionPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
      if (isDraggingChat) {
        setChatPosition({ x: e.clientX - 200, y: e.clientY - 20 });
      }
    };
    const handleUp = () => { setIsDraggingVision(false); setIsDraggingChat(false); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDraggingVision, isDraggingChat]);

  return (
    <div className="h-screen w-screen bg-black flex flex-col p-4 gap-4 overflow-hidden relative font-mono text-green-500 select-none">
      
      {/* Detachable Vision Frame (The "Scanner" Window) */}
      {isVisionDetached && (
        <div 
          className="fixed z-[999] border-2 border-green-500 flex flex-col pointer-events-auto overflow-hidden"
          style={{ 
            left: visionPosition.x, top: visionPosition.y, 
            width: visionSize.w, height: visionSize.h,
            background: 'rgba(0, 20, 0, 0.8)',
            boxShadow: '0 0 50px rgba(0, 255, 65, 0.2), inset 0 0 20px rgba(0, 255, 65, 0.1)'
          }}
        >
          {/* Header */}
          <div 
            className="h-8 bg-green-500/20 border-b border-green-500 flex items-center justify-between px-3 cursor-move backdrop-blur-md"
            onMouseDown={(e) => { setIsDraggingVision(true); dragOffset.current = { x: e.clientX - visionPosition.x, y: e.clientY - visionPosition.y }; }}
          >
            <div className="flex items-center gap-2">
              <Crosshair size={12} className={isScanning ? "animate-spin" : "animate-pulse"} />
              <span className="text-[9px] font-bold tracking-[0.2em]">DE_FRAME_MAGNIFY_v1.0</span>
              {isScanning && <span className="text-[8px] bg-red-900 px-1 ml-2 animate-pulse">ACTIVE_SCAN</span>}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsVisionDetached(false)} className="hover:text-red-500 transition-all"><X size={14} /></button>
            </div>
          </div>

          {/* Scanner Viewport */}
          <div className="flex-1 relative flex items-center justify-center bg-black/40 group">
            {/* Grid Overlays */}
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-10 pointer-events-none">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-green-500/30"></div>
              ))}
            </div>

            {/* Scanning Logic UI */}
            {!isScanning ? (
              <div className="flex flex-col items-center gap-4 transition-all group-hover:scale-105">
                <div className="p-4 border border-green-500/30 bg-green-500/5 rounded-full">
                  <Scan size={40} className="text-green-500/40" />
                </div>
                <button 
                  onClick={captureAndAnalyze}
                  className="px-6 py-2 bg-green-500 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:shadow-[0_0_20px_white] active:scale-95"
                >
                  Activate Analysis
                </button>
                <p className="text-[8px] opacity-40 uppercase tracking-tighter">Analyzes what is within this window bounds</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] tracking-[0.4em] font-bold animate-pulse text-white">DECODING_BUFFER...</span>
                <div className="w-48 h-1 bg-green-900 overflow-hidden">
                  <div className="h-full bg-green-500 w-1/2 animate-[progress_1s_infinite_linear]"></div>
                </div>
              </div>
            )}

            {/* Visual Corner Brackets */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-green-500"></div>
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-green-500"></div>
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-green-500"></div>
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-green-500"></div>
            
            <div className="absolute bottom-2 right-4 text-[8px] opacity-50 flex items-center gap-2">
              <Activity size={10} /> POS: {Math.round(visionPosition.x)},{Math.round(visionPosition.y)}
            </div>
            
            {/* Scanline Effect in Window */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="w-full h-1 bg-green-500/20 animate-[scanline_2s_linear_infinite]"></div>
            </div>
          </div>

          {/* Resize Handle */}
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-green-500/20"
            onMouseDown={(e) => {
              e.stopPropagation();
              const startW = visionSize.w; const startH = visionSize.h;
              const startX = e.clientX; const startY = e.clientY;
              const move = (m: MouseEvent) => setVisionSize({ w: Math.max(200, startW + (m.clientX - startX)), h: Math.max(150, startH + (m.clientY - startY)) });
              const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
              window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
            }}
          ></div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 glass border-green-500/40 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-green-500 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,65,0.4)]">
            <Cpu size={24} />
          </div>
          <div>
            <h1 className="font-bold text-2xl tracking-[0.4em] uppercase">DeFrame</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase">
                <span className={`w-1.5 h-1.5 rounded-full ${appState === AppState.IDLE ? 'bg-green-500 shadow-[0_0_5px_green]' : 'bg-green-400 animate-ping'}`}></span>
                KERNEL: {appState}
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase transition-all">
                {cloudStatus === 'connected' ? <Cloud size={12} className="text-green-500" /> : 
                 cloudStatus === 'syncing' ? <CloudSync size={12} className="text-blue-400 animate-spin" /> : 
                 cloudStatus === 'error' ? <CloudOff size={12} className="text-red-500" /> : <Cloud size={12} className="opacity-20" />}
                CLOUD_SYNC: {cloudStatus.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsVisionDetached(!isVisionDetached)}
              className={`px-4 py-1.5 border flex items-center gap-2 text-[10px] font-bold tracking-widest transition-all ${isVisionDetached ? 'bg-green-500 text-black border-green-500' : 'border-green-500/20 text-green-800'}`}
            >
              <Scan size={14} /> {isVisionDetached ? 'DETACHED_SCANNER' : 'BOOT_SCANNER'}
            </button>
            <div className="h-6 w-px bg-green-900 mx-2"></div>
            <div className="flex items-center gap-2 text-[10px] text-green-800">
              <Globe size={14} /> <span>{pilotConfig.deploymentTarget.toUpperCase()}</span>
            </div>
          </div>
          <button className="text-green-800 hover:text-green-500 transition-all hover:rotate-90"><Settings size={20} /></button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
        
        {/* Workspace (Left 8 Units) */}
        <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
          <div className={`glass relative flex flex-col transition-all duration-500 overflow-hidden border-green-500/20 ${isWindowExpanded ? 'flex-1 z-20' : 'h-[60%]'}`}>
            <div className="flex items-center justify-between px-5 py-2 border-b border-green-500/20 bg-green-500/5">
              <div className="flex gap-8">
                {['vision', 'browser', 'report'].map(t => (
                  <button 
                    key={t} onClick={() => setActiveTab(t as any)}
                    className={`text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === t ? 'text-green-400' : 'text-green-900 hover:text-green-700'}`}
                  >
                    {t === 'vision' ? <Search size={14} /> : t === 'browser' ? <Monitor size={14} /> : <ClipboardList size={14} />}
                    {t}_mod
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsWindowExpanded(!isWindowExpanded)} className="text-green-900 hover:text-green-500 transition-all">
                  {isWindowExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-black overflow-hidden relative">
              {activeTab === 'vision' && (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  {!analysisTarget ? (
                    <div className="text-center opacity-30 animate-pulse">
                      <Radio size={64} className="mx-auto mb-4" />
                      <p className="text-[10px] tracking-[0.5em] uppercase mb-8">Awaiting Signal Acquisition</p>
                      <button 
                        onClick={() => setIsVisionDetached(true)}
                        className="px-8 py-3 border border-green-500 text-[11px] uppercase font-bold hover:bg-green-500 hover:text-black transition-all"
                      >
                        Deploy Magnification Window
                      </button>
                    </div>
                  ) : (
                    <div className="relative group max-h-full max-w-full">
                      <img src={analysisTarget} className="max-h-full rounded border border-green-900 shadow-2xl grayscale contrast-125 brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000" alt="Analytic Buffer" />
                      <button onClick={() => setAnalysisTarget(null)} className="absolute -top-4 -right-4 bg-black border border-red-900 text-red-900 p-1 hover:text-red-500 transition-all"><X size={16} /></button>
                      <div className="absolute bottom-4 left-4 bg-black/80 border border-green-900 p-2 text-[8px] tracking-widest uppercase">Buffer_Intercepted: {new Date().toLocaleTimeString()}</div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'browser' && (
                <div className="h-full flex flex-col">
                  {/* ... browser UI logic (unchanged) ... */}
                  <div className="px-4 py-2 border-b border-green-900 bg-green-900/10 flex items-center justify-between">
                    <div className="flex-1 bg-black border border-green-900 px-3 py-1 text-[10px] text-green-800 flex items-center gap-2 italic">
                      <Globe size={10} /> {browserUrl}
                    </div>
                    <button onClick={() => setShowVault(!showVault)} className={`ml-4 p-1.5 border transition-all ${showVault ? 'bg-green-500 text-black border-green-500' : 'border-green-900 text-green-900'}`}><Unlock size={14} /></button>
                  </div>
                  <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 m-4 border border-green-900 flex flex-col bg-[#050505] relative shadow-inner">
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Monitor size={80} className="opacity-10 mb-4" />
                        <span className="text-[10px] tracking-[0.3em] font-bold uppercase animate-pulse">{browserStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'report' && (
                <div className="h-full p-8 overflow-y-auto bg-[#020202]">
                  {/* ... report UI logic (unchanged) ... */}
                  {!currentReport ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-10 italic uppercase text-[10px] tracking-widest">Awaiting diagnostic compilation...</div>
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-8 pb-12">
                      <div className="border-l-2 border-green-500 pl-6 py-2 bg-green-500/5">
                        <h2 className="text-xl font-bold uppercase tracking-widest">Diagnostic Report</h2>
                        <p className="text-[10px] mt-2 opacity-60 italic">{currentReport.summary}</p>
                      </div>
                      {/* ... rest of report ... */}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Console */}
          <div className="flex-1 glass border-green-500/20 bg-black flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-green-900/40 bg-green-900/5 flex justify-between items-center">
              <div className="flex items-center gap-2 opacity-50 uppercase text-[9px] font-bold tracking-widest">
                <TerminalIcon size={12} /> Console_v0.92
              </div>
            </div>
            <div className="flex-1 p-4 font-mono text-[10px] overflow-y-auto space-y-1 custom-scrollbar">
              {logs.map(l => (
                <div key={l.id} className={`flex gap-3 ${l.level === 'error' ? 'text-red-500' : l.level === 'success' ? 'text-green-400' : 'opacity-70'}`}>
                  <span className="opacity-20">[{l.timestamp}]</span>
                  <span>{l.message}</span>
                </div>
              ))}
              <div className="flex gap-2 text-green-500 animate-pulse">> _</div>
            </div>
          </div>
        </div>

        {/* Neural Bridge (Right 4 Units) */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          <div className={`${isChatDetached ? 'fixed z-50 w-[400px] shadow-2xl' : 'flex-1 min-h-0'} glass border-green-500/30 bg-black flex flex-col`}
               style={isChatDetached ? { left: chatPosition.x, top: chatPosition.y } : {}}>
            <div className="px-4 py-3 border-b border-green-900 bg-green-900/10 flex justify-between items-center cursor-move"
                 onMouseDown={e => { if (isChatDetached) { setIsDraggingChat(true); dragOffset.current = { x: e.clientX - chatPosition.x, y: e.clientY - chatPosition.y }; } }}>
              <div className="flex items-center gap-2 text-green-400">
                <MessageSquare size={14} />
                <span className="text-[10px] font-bold tracking-widest uppercase">Neural_Bridge</span>
              </div>
              <button onClick={() => { setIsChatDetached(!isChatDetached); if (!isChatDetached) setChatPosition({ x: window.innerWidth - 440, y: 100 }); }} className="text-green-900 hover:text-green-500"><GripVertical size={14} /></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {chatHistory.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 border text-[10px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-green-900 bg-black text-green-700'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 m-2 border border-green-900 bg-black flex gap-2">
              <textarea 
                value={userInput} onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), executeCommand(userInput))}
                placeholder="Awaiting directive..."
                className="flex-1 bg-transparent border-none outline-none text-[10px] text-green-500 resize-none h-12 py-1"
              />
              <button onClick={() => executeCommand(userInput)} className="bg-green-500 text-black p-2 self-end hover:scale-110 active:scale-95 transition-all shadow-[0_0_10px_green]"><Zap size={18} /></button>
            </div>
          </div>

          <LogWindow 
            logs={errors} title="Fault_Registry" icon={Bug} colorClass="text-red-600"
            onAction={() => addLog("DEBUG: TRIGGERING SELF-HEALING...", "info")} actionLabel="HEAL"
          />
          <LogWindow logs={logs.slice(-20)} title="System_Registry" icon={Layers} colorClass="text-green-900" />
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default App;
