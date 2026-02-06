
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CameraHUD from './components/CameraHUD';
import { analyzeEvidence } from './services/geminiService';
import { SherlockAnalysis, Deduction, AnalysisConfig } from './types';

const PRIORITY_OPTIONS = [
  'DECEPTION', 'AGITATION', 'AFFLUENCE', 'FATIGUE', 'CRIMINAL_INTENT', 
  'PROFESSIONALISM', 'DOMINANCE', 'INSECURITY', 'SUBSTANCE_USE', 'ATHLETICISM'
];

interface EventLogEntry extends Deduction {
  timestamp: string;
  id: string;
}

const App: React.FC = () => {
  const sessionId = useMemo(() => `CASE-${uuidv4().substring(0, 6).toUpperCase()}`, []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCCTVEnabled, setIsCCTVEnabled] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<SherlockAnalysis | null>(null);
  const [eventHistory, setEventHistory] = useState<EventLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<string[]>([]);
  const [activeDeductionId, setActiveDeductionId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const vaultEndRef = useRef<HTMLDivElement>(null);
  
  const [config, setConfig] = useState<AnalysisConfig>({
    confidenceThreshold: 0.5,
    priorityFlags: ['CRIMINAL_INTENT', 'AGITATION'],
    depthLevel: 'standard'
  });

  const handleCapture = useCallback(async (base64: string, mimeType: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeEvidence(base64, mimeType, sessionId, config, memory);
      setCurrentAnalysis(result);
      
      // Update Persistent Event Log for CCTV
      if (result.deductions && result.deductions.length > 0) {
        const newEntries: EventLogEntry[] = result.deductions.map(d => ({
          ...d,
          id: uuidv4(),
          timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }));
        
        setEventHistory(prev => {
          // Keep last 50 events for performance
          const combined = [...newEntries, ...prev];
          return combined.slice(0, 50);
        });
      }
      
      if (result.session_memory) {
        setMemory(prev => [...new Set([...prev, ...result.session_memory])].slice(-20));
      }
    } catch (err: any) {
      if (!isCCTVEnabled) {
        setError("Logical failure: Thinking palace overloaded.");
      }
      console.error("Deduction Stream Error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [sessionId, memory, isAnalyzing, config, isCCTVEnabled]);

  const clearDeductionData = useCallback(() => {
    setCurrentAnalysis(null);
    setEventHistory([]);
    setMemory([]);
  }, []);

  const toggleCCTVMode = () => {
    const nextState = !isCCTVEnabled;
    setIsCCTVEnabled(nextState);
    if (nextState) {
      clearDeductionData();
    }
  };

  // Auto-scroll vault when new events arrive
  useEffect(() => {
    if (isCCTVEnabled && vaultEndRef.current) {
      vaultEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [eventHistory, isCCTVEnabled]);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 flex flex-col font-mono selection:bg-sky-500/30 overflow-x-hidden">
      <header className="px-6 py-4 border-b border-sky-900/30 flex justify-between items-center bg-black/90 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-10 h-10 border border-sky-500/30 rounded-sm flex items-center justify-center bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.1)]">
              <span className="text-sky-500 font-bold text-xl">S</span>
            </div>
            {isCCTVEnabled && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold italic font-['Playfair_Display'] text-sky-400 hud-glow tracking-tight">
              Sherlock <span className="text-gray-500 font-normal">OS</span>
            </h1>
            <p className="text-[7px] text-sky-500/50 tracking-[0.4em] uppercase font-bold">Security_Interface v8.0.Live</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleCCTVMode}
            className={`px-6 py-2 border rounded-sm transition-all duration-300 flex items-center gap-4 group ${
              isCCTVEnabled 
                ? 'border-red-500 bg-red-600/10 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]' 
                : 'border-sky-900/30 bg-sky-500/5 text-sky-500 hover:border-sky-500/50'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isCCTVEnabled ? 'bg-red-600 animate-pulse' : 'bg-sky-900'}`} />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase">{isCCTVEnabled ? 'SYSTEM_LIVE' : 'ACTIVATE_CCTV'}</span>
          </button>

          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`p-2 border rounded-sm transition-colors duration-200 group ${isConfigOpen ? 'border-sky-400 bg-sky-400/20' : 'border-sky-900/30 hover:border-sky-400/50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isConfigOpen ? 'text-sky-400' : 'text-sky-800'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Configuration Sidebar */}
      <aside className={`fixed right-0 top-[73px] bottom-0 w-80 bg-[#080808] border-l border-sky-900/50 z-[100] transition-transform duration-300 ease-in-out transform ${isConfigOpen ? 'translate-x-0' : 'translate-x-full'} custom-scrollbar overflow-y-auto p-8 shadow-2xl`}>
        <div className="space-y-10">
          <div>
            <h3 className="text-sky-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
              Deduction Sensibility
            </h3>
            <input 
              type="range" min="0" max="1" step="0.05" 
              value={config.confidenceThreshold}
              onChange={(e) => setConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
              className="w-full accent-sky-500 h-1 bg-sky-950 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-3 text-[9px] text-sky-800 uppercase font-bold">
              <span>Hyper-Sensitive</span>
              <span>Filter: {(config.confidenceThreshold * 100).toFixed(0)}%</span>
              <span>Absolute</span>
            </div>
          </div>

          <div>
            <h3 className="text-sky-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
              Analytical Depth
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['fast', 'standard', 'exhaustive'] as const).map(depth => (
                <button
                  key={depth}
                  onClick={() => setConfig(prev => ({ ...prev, depthLevel: depth }))}
                  className={`py-2 border text-[8px] font-bold uppercase tracking-widest rounded-sm ${
                    config.depthLevel === depth ? 'border-sky-400 bg-sky-400/20 text-sky-200' : 'border-white/5 text-white/20'
                  }`}
                >
                  {depth}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sky-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
              Focus Traits
            </h3>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map(flag => (
                <button
                  key={flag}
                  onClick={() => {
                    setConfig(prev => ({
                      ...prev,
                      priorityFlags: prev.priorityFlags.includes(flag)
                        ? prev.priorityFlags.filter(f => f !== flag)
                        : [...prev.priorityFlags, flag]
                    }));
                  }}
                  className={`px-3 py-1.5 border text-[8px] font-bold transition-all rounded-sm tracking-wider ${
                    config.priorityFlags.includes(flag) 
                      ? 'border-sky-400 bg-sky-400/20 text-sky-100' 
                      : 'border-white/5 text-white/30 hover:border-white/20'
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setIsConfigOpen(false)}
            className="w-full py-4 bg-sky-600 text-black font-bold text-[10px] uppercase tracking-[0.4em] rounded-sm hover:bg-sky-500 transition-colors shadow-lg mt-10"
          >
            Apply Protocol
          </button>
        </div>
      </aside>

      <main className={`flex-1 p-6 lg:p-10 w-full max-w-[1900px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 transition-all duration-300 ${isConfigOpen ? 'lg:pr-[340px]' : ''}`}>
        
        {/* Left: Security Feed */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <CameraHUD 
            onCapture={handleCapture} 
            analysisResults={currentAnalysis} 
            isAnalyzing={isAnalyzing} 
            isCCTVActive={isCCTVEnabled}
            onReset={clearDeductionData}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatBox label="INTENT_VECTOR" value={currentAnalysis?.scan_data?.intent_prediction} primary />
            <div className="md:col-span-3 bg-black border border-sky-900/30 p-5 rounded-sm h-[130px] flex flex-col shadow-xl">
              <div className="text-[9px] text-sky-900 font-bold uppercase mb-3 tracking-[0.2em]">Telemetry_Log</div>
              <div className="flex flex-wrap gap-2 overflow-y-auto custom-scrollbar pr-2 pb-2">
                {currentAnalysis?.scan_data?.behavioral_flags?.map((f, i) => (
                  <span key={i} className="text-[10px] bg-sky-500/5 border border-sky-500/30 px-3 py-1.5 text-sky-400 uppercase tracking-widest font-bold animate-fadeIn">
                    {f}
                  </span>
                )) || <span className="text-[10px] text-sky-950 italic">Feed inactive...</span>}
              </div>
            </div>
          </div>

          <div className={`p-8 rounded-sm transition-all duration-700 relative overflow-hidden shadow-2xl border ${
            isCCTVEnabled ? 'bg-black border-red-900/40' : 'bg-sky-950/20 border-sky-500/40'
          }`}>
            <h3 className={`text-[10px] font-bold uppercase tracking-[0.4em] mb-4 ${isCCTVEnabled ? 'text-red-500' : 'text-sky-500'}`}>
              {isCCTVEnabled ? 'LIVE_SYNTHESIS' : 'FINAL_DEDUCTION'}
            </h3>
            <p className="text-xl lg:text-3xl font-['Playfair_Display'] italic text-gray-100 leading-relaxed min-h-[4rem]">
              {currentAnalysis ? `"${currentAnalysis.final_assessment}"` : "Awaiting input data..."}
            </p>
          </div>
        </div>

        {/* Right: Security Archive */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="ATTENTION" value={currentAnalysis?.scan_data?.attention_score ? `${Math.round(currentAnalysis.scan_data.attention_score * 100)}%` : '--'} />
            <MiniStat label="POSTURE" value={currentAnalysis?.scan_data?.posture_score ? `${Math.round(currentAnalysis.scan_data.posture_score * 100)}%` : '--'} />
            <MiniStat label="STANCE" value={currentAnalysis?.scan_data?.stance} />
            <MiniStat label="BALANCE" value={currentAnalysis?.scan_data?.balance} />
          </div>

          <div className={`flex-1 bg-black border rounded-sm flex flex-col min-h-[500px] shadow-2xl relative transition-colors ${
            isCCTVEnabled ? 'border-red-900/30' : 'border-sky-900/40'
          }`}>
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/80 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isCCTVEnabled ? 'bg-red-600 animate-pulse' : 'bg-sky-500'}`} />
                <span className="text-[11px] text-sky-400 font-bold tracking-[0.3em] uppercase">Observation_Vault</span>
              </div>
              <span className="text-[9px] text-sky-800 font-bold tracking-[0.2em] uppercase">ENTRIES: {eventHistory.length}</span>
            </div>
            
            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[600px]">
              {eventHistory.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                  <p className="text-[10px] uppercase tracking-[0.5em] text-sky-900 font-bold">Observation log empty</p>
                </div>
              )}

              {eventHistory.map((entry) => (
                <div 
                  key={entry.id} 
                  onClick={() => setActiveDeductionId(activeDeductionId === entry.id ? null : entry.id)}
                  className={`p-4 border transition-all cursor-pointer rounded-sm group animate-fadeIn ${
                    activeDeductionId === entry.id 
                      ? 'bg-sky-500/10 border-sky-400/50' 
                      : 'bg-[#030303] border-white/5 hover:border-sky-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-sky-900 font-bold bg-black px-1.5 py-0.5 rounded-sm border border-white/5">{entry.timestamp}</span>
                      <span className="text-sky-400 font-bold text-[10px] uppercase tracking-wider">{entry.title}</span>
                    </div>
                    <span className="text-[8px] text-sky-700 font-bold uppercase">{Math.round(entry.confidence * 100)}%</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono leading-relaxed truncate group-hover:whitespace-normal">{entry.detail}</p>
                  
                  {activeDeductionId === entry.id && (entry.logic_steps || entry.grounding) && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-fadeIn">
                      {entry.logic_steps && (
                        <div>
                          <div className="text-[8px] text-sky-500/60 uppercase font-bold mb-2 tracking-widest">Logic Trail</div>
                          {entry.logic_steps.map((step, si) => (
                            <div key={si} className="text-[10px] text-gray-400 pl-3 border-l border-sky-950 mb-2 py-0.5">{step}</div>
                          ))}
                        </div>
                      )}
                      
                      {entry.grounding && (
                        <div className="bg-amber-500/5 p-3 border border-amber-500/20 rounded-sm">
                          <div className="text-[8px] text-amber-500/60 uppercase font-bold mb-2 tracking-widest">Grounding_Context</div>
                          {entry.grounding.map((g, gi) => (
                            <a key={gi} href={g.uri} target="_blank" rel="noreferrer" className="text-[9px] text-amber-500/90 hover:text-amber-300 block mb-1 truncate underline decoration-amber-500/20">
                              {g.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={vaultEndRef} />
            </div>
          </div>
        </div>
      </main>
      
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-8 py-4 bg-red-950/90 border border-red-500 text-red-500 text-[10px] uppercase tracking-widest font-bold shadow-2xl backdrop-blur-md">
          {error}
        </div>
      )}
    </div>
  );
};

const StatBox = ({ label, value, primary }: { label: string; value?: string; primary?: boolean }) => (
  <div className={`border p-5 rounded-sm flex flex-col h-[130px] transition-all shadow-xl ${primary ? 'bg-sky-500/5 border-sky-500/40' : 'bg-black border-sky-900/30'}`}>
    <div className={`text-[9px] font-bold uppercase mb-3 shrink-0 tracking-widest ${primary ? 'text-sky-400' : 'text-sky-900'}`}>{label}</div>
    <div className={`text-[12px] italic leading-relaxed overflow-y-auto custom-scrollbar flex-1 pr-1 break-words font-['Playfair_Display'] ${primary ? 'text-sky-50' : 'text-gray-400'}`}>
      {value || '---'}
    </div>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value?: string }) => (
  <div className="bg-black border border-white/5 px-4 py-3 rounded-sm h-[80px] flex flex-col shadow-inner">
    <div className="text-[7px] text-sky-900 font-bold uppercase mb-2 tracking-[0.2em]">{label}</div>
    <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest overflow-hidden truncate">
      {value || '--'}
    </div>
  </div>
);

export default App;
