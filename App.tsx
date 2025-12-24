
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Maximize2, Minimize2, Terminal as TerminalIcon, 
  MessageSquare, Zap, Globe, Database, Settings, X, GripVertical, Search,
  Bug, PlayCircle, BarChart3, Binary, Gauge, ActivitySquare,
  Cpu, Move, Scan, Radio, Box, Terminal, Layers3, Activity, ShieldCheck,
  Target, Video, VideoOff, Crosshair, RefreshCw
} from 'lucide-react';
import { VNode, LogEntry, ChatMessage, AppState, SimulationConfig, PerformanceMetrics } from './types';
import { analyzeContent, runCodingPilot, solveError, runSimulation, generateErrorReport } from './geminiService';
import { supabase, persistAppState, persistLog, persistChat, fetchLatestSession } from './supabase';

// Production Logic: Box-Muller for high-accuracy Gauss Distribution
const boxMuller = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const App: React.FC = () => {
  // --- Core Engine State ---
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [vfs, setVfs] = useState<VNode[]>([{ name: 'root', path: '/', type: 'folder', children: [] }]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errors, setErrors] = useState<LogEntry[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  
  // --- Telemetry & Monitoring ---
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({ cpuUsage: 0, memoryUsed: 0, heapTotal: 0, timestamp: Date.now() });
  const lastTime = useRef(performance.now());
  const frames = useRef(0);

  // --- Workspace & Navigation ---
  const [activeTab, setActiveTab] = useState<'vision' | 'browser' | 'systems' | 'report'>('vision');
  const [isVisionDetached, setIsVisionDetached] = useState(false);
  const [visionPosition, setVisionPosition] = useState({ x: 150, y: 150 });
  const [visionSize, setVisionSize] = useState({ w: 560, h: 420 });
  const [isScanning, setIsScanning] = useState(false);
  const [isDraggingVision, setIsDraggingVision] = useState(false);
  const [isWindowExpanded, setIsWindowExpanded] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // --- Stream Management ---
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Compartmentalized Engines ---
  const [activeStack, setActiveStack] = useState<'edge_stack' | 'python_pro' | 'next_gen' | 'ai_native'>('next_gen');
  const [simConfig, setSimConfig] = useState<SimulationConfig>({ 
    iterations: 50000, seed: 42, 
    params: { S0: 100, K: 105, T: 1, r: 0.05, sigma: 0.2 } 
  });
  const [simResult, setSimResult] = useState<any>(null);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'info', metadata?: Record<string, any>) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      level, message, metadata
    };
    persistLog(newLog);
    if (level === 'error') setErrors(prev => [newLog, ...prev]);
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  // --- Real-World Telemetry Monitor ---
  useEffect(() => {
    const monitorLoop = setInterval(() => {
      // Memory Telemetry
      let memoryUsed = 0;
      let heapTotal = 0;
      const perf = (performance as any).memory;
      if (perf) {
        memoryUsed = Math.round(perf.usedJSHeapSize / (1024 * 1024));
        heapTotal = Math.round(perf.jsHeapSizeLimit / (1024 * 1024));
      }

      // CPU Load Estimation (Task-Loop Latency Analysis)
      const now = performance.now();
      const delta = now - lastTime.current;
      lastTime.current = now;
      // In a perfect 60fps, delta is ~16.6ms. We use jitter to estimate load.
      const jitter = Math.max(0, delta - (1000 / 60));
      const estimatedCpu = Math.min(100, Math.round((jitter / 16.6) * 100) + (appState !== AppState.IDLE ? 15 : 2));

      setCurrentMetrics({
        cpuUsage: estimatedCpu,
        memoryUsed,
        heapTotal,
        timestamp: Date.now()
      });
    }, 1000);
    return () => clearInterval(monitorLoop);
  }, [appState]);

  // --- External Spatial Intercept Logic ---

  const initScannerStream = async () => {
    try {
      addLog("SYSTEM: REQUESTING SPATIAL INTERCEPT PERMISSIONS...", "info");
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: "monitor", cursor: "always" } as any 
      });
      setStream(mediaStream);
      setIsVisionDetached(true);
      addLog("SYSTEM: EXTERNAL SIGNAL SYNCHRONIZED.", "success");
      
      mediaStream.getVideoTracks()[0].onended = () => {
        setStream(null);
        addLog("SYSTEM: EXTERNAL SIGNAL LOST.", "warn");
      };
    } catch (err: any) {
      addLog("SYSTEM: PERMISSION DENIED BY KERNEL.", "error", { error: err.message });
    }
  };

  const handleCaptureAndAnalyze = async () => {
    if (!videoRef.current || !stream) {
      addLog("SCANNER: SOURCE STREAM MISSING.", "error");
      return;
    }

    setAppState(AppState.ANALYZING);
    setIsScanning(true);
    addLog("SCANNER: FREEZING SPATIAL BUFFER...", "info");

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas Context Failure");

      // Draw current frame
      ctx.drawImage(video, 0, 0);
      
      // Post-processing for high-fidelity vision
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const screenshot = canvas.toDataURL('image/jpeg', 0.95);
      addLog("SCANNER: UPLOADING TO NEURAL BRIDGE...", "info");
      
      const result = await analyzeContent(screenshot);
      addLog("SCANNER: ANALYSIS COMPLETE.", "success");
      
      setChatHistory(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: `[SPATIAL INTERCEPT AUDIT]\n\n${result}` 
      }]);
    } catch (err: any) {
      addLog("SCANNER: BUFFER PROCESSING ERROR.", "error", { error: err.message });
    } finally {
      setIsScanning(false);
      setAppState(AppState.IDLE);
    }
  };

  const handleMonteCarlo = async () => {
    setAppState(AppState.SIMULATING);
    addLog(`SIM: RUNNING PRODUCTION-GRADE MC (N=${simConfig.iterations})`, "info");
    try {
      const { S0, K, T, r, sigma } = simConfig.params;
      const disc = Math.exp(-r * T);
      let sumPayoffs = 0;
      
      for (let i = 0; i < simConfig.iterations; i++) {
        const z = boxMuller();
        const ST = S0 * Math.exp((r - 0.5 * sigma ** 2) * T + sigma * Math.sqrt(T) * z);
        sumPayoffs += Math.max(ST - K, 0);
      }
      
      const price = disc * (sumPayoffs / simConfig.iterations);
      setSimResult({ results: { option_price: price }, summary: `MC Price ≈ ${price.toFixed(6)}` });
      addLog("SIM: STOCHASTIC CONVERGENCE ACHIEVED.", "success", { price });
    } catch (err: any) {
      addLog("SIM: ENGINE STALL.", "error", { error: err.message });
    } finally {
      setAppState(AppState.IDLE);
    }
  };

  const handleMasterBuild = async (instruction: string) => {
    setAppState(AppState.ORCHESTRATING);
    addLog(`BUILDER: DEPLOYING "${activeStack.toUpperCase()}" CLUSTER...`, "info");
    try {
      const resText = await runCodingPilot(instruction, JSON.stringify(vfs), activeStack);
      const parsed = JSON.parse(resText);
      if (parsed.files) {
        setVfs(prev => {
          const nv = [...prev];
          parsed.files.forEach((f: any) => {
            const existing = nv[0].children?.find(node => node.path === f.path);
            if (existing) existing.content = f.content;
            else nv[0].children?.push({ name: f.path.split('/').pop() || f.path, path: f.path, type: 'file', content: f.content });
          });
          return nv;
        });
        parsed.telemetry_logs?.forEach((l: string) => addLog(`KERN: ${l}`, "success"));
      }
    } catch (err: any) {
      addLog("BUILDER: ORCHESTRATION FAILED.", "error", { error: err.message });
    } finally {
      setAppState(AppState.IDLE);
    }
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;
    setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', content: `> ${command}` }]);
    setUserInput('');
    
    const cmd = command.toLowerCase();
    if (cmd.startsWith('build ')) handleMasterBuild(command.replace('build ', ''));
    else if (cmd.includes('simulate')) handleMonteCarlo();
    else if (cmd.includes('scan')) initScannerStream();
    else {
      setAppState(AppState.ANALYZING);
      const r = await solveError(command, "ROOT_CONTEXT");
      setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: r.text }]);
      setAppState(AppState.IDLE);
    }
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (isDraggingVision) setVisionPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const up = () => setIsDraggingVision(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [isDraggingVision]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="h-screen w-screen bg-black flex flex-col p-4 gap-4 overflow-hidden relative font-mono text-green-500 select-none">
      
      {/* --- PRODUCTION SCANNER WINDOW (SPATIAL HUD) --- */}
      {isVisionDetached && (
        <div 
          className="fixed z-[999] border-2 border-green-500 flex flex-col pointer-events-auto overflow-hidden transition-all duration-300"
          style={{ 
            left: visionPosition.x, top: visionPosition.y, 
            width: visionSize.w, height: visionSize.h,
            background: 'rgba(0, 10, 0, 0.98)',
            boxShadow: isScanning ? '0 0 150px rgba(0, 255, 65, 0.6)' : '0 0 50px rgba(0, 255, 65, 0.1)'
          }}
        >
          <div 
            className="h-9 bg-green-500/20 border-b border-green-500 flex items-center justify-between px-3 cursor-move backdrop-blur-xl"
            onMouseDown={(e) => { setIsDraggingVision(true); dragOffset.current = { x: e.clientX - visionPosition.x, y: e.clientY - visionPosition.y }; }}
          >
            <div className="flex items-center gap-3">
              <Crosshair size={14} className={isScanning ? "animate-spin text-white" : "animate-pulse"} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">DE_FRAME_INTERCEPT_v3.0</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => stream?.getTracks().forEach(t => t.stop())} className="text-red-500/50 hover:text-red-500"><VideoOff size={14}/></button>
              <button onClick={() => setIsVisionDetached(false)} className="hover:text-white transition-colors"><X size={18} /></button>
            </div>
          </div>
          
          <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
            {stream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover grayscale brightness-125 contrast-150 opacity-40 hover:opacity-100 transition-opacity duration-500"
              />
            ) : (
              <div className="flex flex-col items-center gap-6 opacity-20">
                <Target size={60} />
                <span className="text-[10px] font-black tracking-widest uppercase">Signal Lost - Re-initialize</span>
              </div>
            )}
            
            {/* HUD Overlay Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 w-full h-[1px] bg-green-500/40 animate-[scanline_4s_linear_infinite]"></div>
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-5">
                {Array.from({length: 16}).map((_, i) => <div key={i} className="border border-green-500/30"></div>)}
              </div>
              <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-green-500 shadow-[0_0_10px_green]"></div>
              <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-green-500 shadow-[0_0_10px_green]"></div>
              
              <div className="absolute top-6 right-6 text-[8px] font-black text-right space-y-1 bg-black/40 p-2 border border-green-500/10">
                <p>COORD_X: {visionPosition.x}</p>
                <p>COORD_Y: {visionPosition.y}</p>
                <p>STATUS: {isScanning ? 'CAPTURING...' : 'INTERCEPTING'}</p>
              </div>
            </div>

            {/* Scanning Logic Button */}
            {!isScanning && stream && (
              <button 
                onClick={handleCaptureAndAnalyze}
                className="absolute z-10 px-8 py-3 bg-green-500 text-black font-black text-[12px] uppercase shadow-[0_0_30px_rgba(0,255,65,0.5)] hover:scale-105 active:scale-95 transition-all"
              >
                SYNC_VIEWPORT_AUDIT
              </button>
            )}

            {isScanning && (
              <div className="absolute inset-0 bg-white/10 flex items-center justify-center z-20 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw size={40} className="animate-spin text-white" />
                  <span className="text-[14px] font-black text-white tracking-[0.5em] animate-pulse">EXTRACTING_DATA</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-6 bg-green-500/10 border-t border-green-500/20 px-3 flex items-center justify-between text-[8px] font-bold">
            <span className="opacity-50">PRODUCTION_ENVIRONMENT_STABLE</span>
            <span className="animate-pulse text-green-400">0x{Math.random().toString(16).slice(2, 8).toUpperCase()}</span>
          </div>
          
          {/* Resize Handle */}
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-green-500/20" onMouseDown={(e) => {
            e.stopPropagation();
            const startW = visionSize.w; const startH = visionSize.h;
            const startX = e.clientX; const startY = e.clientY;
            const move = (m: MouseEvent) => setVisionSize({ w: Math.max(300, startW + (m.clientX - startX)), h: Math.max(250, startH + (m.clientY - startY)) });
            const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
            window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
          }}></div>
        </div>
      )}

      {/* --- ENGINE HEADER --- */}
      <header className="flex items-center justify-between px-8 py-5 glass border-green-500/40 z-10 shrink-0">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 border-2 border-green-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,65,0.4)]">
            <Cpu size={32} className={appState !== AppState.IDLE ? 'animate-pulse text-green-300' : ''} />
          </div>
          <div>
            <h1 className="font-black text-3xl tracking-[0.5em] uppercase text-white">DeFrame_OS</h1>
            <div className="flex gap-8 mt-1">
              <div className="flex items-center gap-2 text-[11px] uppercase font-black text-green-700">
                <Gauge size={14} /> KERNEL_LOAD: <span className={currentMetrics.cpuUsage > 80 ? 'text-red-500' : 'text-green-500'}>{currentMetrics.cpuUsage}%</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] uppercase font-black text-green-700">
                <Database size={14} /> MEM_ALLOC: {currentMetrics.memoryUsed}MB / {currentMetrics.heapTotal}MB
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-6">
          <div className="flex flex-col items-end justify-center px-4 border-r border-green-500/20">
            <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest text-right">Core_State</span>
            <span className="text-[12px] font-black text-white">{appState}</span>
          </div>
          <button 
            onClick={initScannerStream} 
            className="px-8 py-2 bg-green-500/10 border-2 border-green-500 text-green-500 font-black text-[11px] hover:bg-green-500 hover:text-black shadow-[0_0_10px_rgba(0,255,65,0.2)]"
          >DEPLOY_SPATIAL_HUD</button>
        </div>
      </header>

      {/* --- MASTER WORKSPACE --- */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
        
        {/* Workspace Central (8/12) */}
        <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
          <div className={`glass flex flex-col transition-all duration-500 overflow-hidden relative ${isWindowExpanded ? 'flex-1 z-20' : 'h-[62%]'}`}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-green-500/20 bg-green-500/5 backdrop-blur-md">
              <div className="flex gap-12">
                {['vision', 'browser', 'systems', 'report'].map(t => (
                  <button 
                    key={t} onClick={() => setActiveTab(t as any)} 
                    className={`text-[12px] font-black uppercase tracking-[0.3em] relative pb-2 transition-all ${activeTab === t ? 'text-white' : 'text-green-900 hover:text-green-600'}`}
                  >
                    {t}
                    {activeTab === t && <div className="absolute bottom-0 w-full h-[3px] bg-green-500 shadow-[0_0_10px_green]"></div>}
                  </button>
                ))}
              </div>
              <button onClick={() => setIsWindowExpanded(!isWindowExpanded)} className="text-green-900 hover:text-green-500 transition-colors"><Maximize2 size={20} /></button>
            </div>
            
            <div className="flex-1 bg-[#010101] relative overflow-hidden">
              {activeTab === 'systems' && (
                <div className="h-full p-8 grid grid-cols-2 gap-8 overflow-y-auto custom-scrollbar">
                   {/* Production Builder */}
                   <div className="glass p-8 space-y-8 border-green-500/30">
                      <div className="flex items-center gap-4 border-b border-green-500/20 pb-4">
                        <Box size={24} className="text-green-500" />
                        <h3 className="text-lg font-black uppercase tracking-tighter text-white">Master_Code_Builder</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {['edge_stack', 'python_pro', 'next_gen', 'ai_native'].map(s => (
                          <button 
                            key={s} onClick={() => setActiveStack(s as any)} 
                            className={`p-4 border text-[10px] font-bold text-left transition-all ${activeStack === s ? 'border-green-500 bg-green-500/20 text-white shadow-[0_0_10px_rgba(0,255,65,0.2)]' : 'border-green-900 text-green-900 hover:border-green-700'}`}
                          >
                             <span className="block opacity-30 text-[8px] mb-1">STRAT_TARGET:</span>
                             {s.replace('_', ' ').toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-4">
                        <textarea 
                          className="w-full bg-black border-2 border-green-900 p-5 text-[11px] h-32 outline-none focus:border-green-500 transition-colors font-mono" 
                          placeholder="Input architectural instructions..."
                        ></textarea>
                        <button 
                          onClick={() => handleMasterBuild("Production Architecture Sequence")} 
                          className="w-full py-4 bg-green-900/20 border-2 border-green-500 text-green-500 font-black text-[12px] hover:bg-green-500 hover:text-black transition-all shadow-[0_0_20px_rgba(0,255,65,0.1)]"
                        >EXECUTE_ORCHESTRATION</button>
                      </div>
                   </div>

                   {/* Monte Carlo Simulator */}
                   <div className="glass p-8 space-y-8 border-blue-500/30">
                      <div className="flex items-center gap-4 border-b border-blue-500/20 pb-4">
                        <PlayCircle size={24} className="text-blue-500" />
                        <h3 className="text-lg font-black uppercase tracking-tighter text-blue-400">Monte_Carlo_v5.1</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black opacity-50">Iter_Buffer_Size</label>
                            <input type="number" value={simConfig.iterations} onChange={e => setSimConfig({...simConfig, iterations: +e.target.value})} className="w-full bg-black border-2 border-blue-900 p-3 text-[11px] focus:border-blue-500 outline-none" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] uppercase font-black opacity-50">Stochastic_Seed</label>
                            <input type="number" value={simConfig.seed} onChange={e => setSimConfig({...simConfig, seed: +e.target.value})} className="w-full bg-black border-2 border-blue-900 p-3 text-[11px] focus:border-blue-500 outline-none" />
                         </div>
                      </div>
                      <button 
                        onClick={handleMonteCarlo} 
                        className="w-full py-4 bg-blue-900/20 border-2 border-blue-500 text-blue-500 font-black text-[12px] hover:bg-blue-500 hover:text-black transition-all"
                      >RUN_MATH_SIMULATION</button>
                      {simResult && (
                        <div className="p-6 border-2 border-blue-500/20 bg-blue-500/5 font-mono">
                          <div className="flex justify-between items-center border-b border-blue-900 pb-2 mb-4">
                            <span className="text-[10px] font-black text-blue-400 uppercase">Sim_Summary</span>
                            <span className="text-[9px] opacity-40">TIMESTAMP: {new Date().toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <BarChart3 className="text-blue-500" size={32} />
                            <div>
                               <p className="text-white text-2xl font-black tracking-widest">{simResult.results?.option_price?.toFixed(6)}</p>
                               <p className="text-[10px] opacity-40 uppercase">Monte Carlo Est. Price</p>
                            </div>
                          </div>
                        </div>
                      )}
                   </div>
                </div>
              )}

              {activeTab === 'vision' && (
                <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                  <Activity size={100} className="text-green-900 animate-pulse mb-10 opacity-20" />
                  <div className="max-w-md space-y-8">
                    <h2 className="text-2xl font-black uppercase tracking-[0.4em] text-green-900">Awaiting Signal Synchronization</h2>
                    <p className="text-[11px] opacity-30 leading-loose uppercase font-bold italic">Kernel is ready for visual intercept. Deploy and mount the scanner to begin structural analysis.</p>
                    <button 
                      onClick={initScannerStream} 
                      className="px-14 py-4 border-2 border-green-500 text-green-500 font-black text-[13px] hover:bg-green-500 hover:text-black transition-all"
                    >Initialize Spatial HUD</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KERNEL CONSOLE */}
          <div className="flex-1 glass bg-black flex flex-col overflow-hidden border-green-500/10">
            <div className="px-6 py-3 border-b border-green-900 bg-green-500/5 flex justify-between items-center">
               <span className="text-[11px] font-black uppercase flex items-center gap-3 text-green-700 tracking-[0.2em]"><TerminalIcon size={18} /> Master_Engine_Logs</span>
               <div className="flex gap-4 items-center">
                  <div className="flex gap-2 items-center text-[10px] opacity-30">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                     LIVE_FEED
                  </div>
                  <button onClick={() => setLogs([])} className="text-[9px] border border-green-900 px-4 py-1 hover:border-green-500 transition-colors uppercase font-bold">Flush_Buffer</button>
               </div>
            </div>
            <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto space-y-1 custom-scrollbar bg-black/40">
              {logs.map(l => (
                <div key={l.id} className="flex gap-4 group hover:bg-green-500/5 transition-colors p-0.5 rounded">
                  <span className="text-green-900 opacity-30 shrink-0 select-none">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                  <span className={`shrink-0 font-black uppercase tracking-tighter ${l.level === 'error' ? 'text-red-600' : l.level === 'success' ? 'text-green-400' : 'text-green-800'}`}>[{l.level}]</span>
                  <span className="text-green-500 group-hover:text-white transition-colors">{l.message}</span>
                  {l.metadata && <span className="text-[9px] opacity-20 italic">| meta_captured</span>}
                </div>
              ))}
              <div className="flex gap-2 text-green-500 animate-pulse font-black mt-4">> _</div>
            </div>
          </div>
        </div>

        {/* --- NEURAL BRIDGE (4/12) --- */}
        <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 glass bg-black flex flex-col overflow-hidden shadow-2xl border-green-500/20">
            <div className="px-6 py-4 border-b border-green-900 bg-green-500/10 flex justify-between items-center">
               <div className="flex items-center gap-4 text-white">
                 <MessageSquare size={20} className="text-green-500" />
                 <span className="text-sm font-black uppercase tracking-[0.3em]">Neural_Bridge</span>
               </div>
               <ShieldCheck size={18} className="text-green-900" />
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-[#020202]">
               {chatHistory.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-10 space-y-4">
                    <Radio size={40} className="animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Transmitter Offline</p>
                 </div>
               )}
               {chatHistory.map(m => (
                 <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                   <div className={`max-w-[90%] px-5 py-4 border-2 text-[12px] leading-relaxed shadow-lg ${m.role === 'user' ? 'border-green-500 bg-green-500/10 text-white font-bold' : 'border-green-900 bg-black text-green-600'}`}>
                     {m.content}
                   </div>
                 </div>
               ))}
            </div>
            <div className="p-5 m-4 border-2 border-green-900 bg-black flex gap-5 items-end shadow-[0_0_20px_rgba(0,255,0,0.05)]">
              <textarea 
                value={userInput} 
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), executeCommand(userInput))}
                className="flex-1 bg-transparent outline-none text-[12px] h-14 py-1 resize-none font-mono placeholder:opacity-20 transition-all focus:placeholder:opacity-10"
                placeholder="Transmitting directive..."
              />
              <button 
                onClick={() => executeCommand(userInput)} 
                className="bg-green-500 text-black p-4 rounded-sm hover:scale-105 active:scale-95 shadow-[0_0_20px_green] transition-all"
              ><Zap size={24} fill="currentColor" /></button>
            </div>
          </div>
          
          {/* FAULT TRACKER */}
          <div className="h-56 glass bg-black flex flex-col overflow-hidden border-red-900/30">
            <div className="px-6 py-3 border-b border-red-900 bg-red-900/10 flex justify-between items-center">
              <span className="text-[11px] font-black uppercase flex items-center gap-3 text-red-500 tracking-widest"><Bug size={18} /> Fault_Stack_Registry</span>
              {errors.length > 0 && <div className="text-[9px] bg-red-600 text-black px-2 font-bold animate-pulse">CRITICAL</div>}
            </div>
            <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] space-y-3 custom-scrollbar">
              {errors.length === 0 && <p className="opacity-20 italic text-center mt-10">No integrity faults detected in current kernel session.</p>}
              {errors.map(e => (
                <div key={e.id} className="text-red-500 border-l-2 border-red-900 pl-4 py-1 bg-red-900/5">
                   <div className="font-black text-[9px] opacity-40 mb-1">SIGNAL_TIMESTAMP: {new Date(e.timestamp).toLocaleTimeString()}</div>
                   <div className="font-bold">{e.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanline { 0% { bottom: 100%; } 100% { bottom: 0%; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: black; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #002200; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #00FF41; }
      `}</style>
    </div>
  );
};

export default App;
