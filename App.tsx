
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CameraHUD from './components/CameraHUD';
import { analyzeEvidence } from './services/geminiService';
import { SherlockAnalysis, Deduction, AnalysisConfig } from './types';

const PRIORITY_OPTIONS = [
  'DECEPTION', 'AGITATION', 'AFFLUENCE', 'FATIGUE', 'CRIMINAL_INTENT', 
  'PROFESSIONALISM', 'DOMINANCE', 'INSECURITY', 'SUBSTANCE_USE', 'ATHLETICISM'
];

const App: React.FC = () => {
  const sessionId = useMemo(() => `CASE-${uuidv4().substring(0, 6).toUpperCase()}`, []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<SherlockAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<string[]>([]);
  const [activeDeduction, setActiveDeduction] = useState<number | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const [config, setConfig] = useState<AnalysisConfig>({
    confidenceThreshold: 0.6,
    priorityFlags: ['DECEPTION', 'AFFLUENCE'],
    depthLevel: 'standard'
  });

  const handleCapture = useCallback(async (base64: string, mimeType: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setCurrentAnalysis(null); 
    
    try {
      const result = await analyzeEvidence(base64, mimeType, sessionId, config, memory);
      setCurrentAnalysis(result);
      
      if (result.session_memory) {
        setMemory(prev => [...new Set([...prev, ...result.session_memory])].slice(-10));
      }
    } catch (err: any) {
      setError("Logical failure in thinking palace. The subject's profile is too complex.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [sessionId, memory, isAnalyzing, config]);

  const togglePriorityFlag = (flag: string) => {
    setConfig(prev => ({
      ...prev,
      priorityFlags: prev.priorityFlags.includes(flag)
        ? prev.priorityFlags.filter(f => f !== flag)
        : [...prev.priorityFlags, flag]
    }));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 flex flex-col font-mono selection:bg-sky-500/30 overflow-x-hidden">
      <header className="px-6 py-4 border-b border-sky-900/30 flex justify-between items-center bg-black/90 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border border-sky-500/30 rounded-sm flex items-center justify-center bg-sky-500/10">
            <span className="text-sky-500 font-bold text-xl">S</span>
          </div>
          <div>
            <h1 className="text-xl font-bold italic font-['Playfair_Display'] text-sky-400 hud-glow tracking-tight">
              Sherlock <span className="text-gray-500 font-normal">OS</span>
            </h1>
            <p className="text-[7px] text-sky-500/50 tracking-[0.4em] uppercase font-bold">Deductive Engine v5.5</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`p-2 border rounded-sm transition-colors duration-200 group ${isConfigOpen ? 'border-sky-400 bg-sky-400/20' : 'border-sky-900/30 hover:border-sky-400/50'}`}
            title="Investigation Parameters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isConfigOpen ? 'rotate-90 text-sky-400' : 'text-sky-800 group-hover:text-sky-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          <div className="hidden md:flex flex-col items-end">
            <span className="text-[8px] text-sky-900 font-bold uppercase tracking-widest">Session_Identifier</span>
            <span className="text-xs font-bold text-sky-400">{sessionId}</span>
          </div>
          <div className={`px-4 py-1.5 border rounded-sm flex items-center gap-2 transition-colors ${
            isAnalyzing ? 'border-amber-500/50 bg-amber-500/10' : 'border-sky-500/20 bg-sky-500/10'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-amber-500 animate-pulse' : 'bg-sky-500'}`} />
            <span className={`text-[9px] font-bold tracking-widest uppercase ${isAnalyzing ? 'text-amber-500' : 'text-sky-400'}`}>
              {isAnalyzing ? 'DECONSTRUCTING...' : 'SYSTEM_READY'}
            </span>
          </div>
        </div>
      </header>

      {/* Investigation Parameters Sidebar - Pure Black for Ultimate Contrast */}
      <aside className={`fixed right-0 top-[73px] bottom-0 w-80 bg-black border-l border-sky-900/50 z-[100] transition-transform duration-300 ease-in-out transform ${isConfigOpen ? 'translate-x-0' : 'translate-x-full'} custom-scrollbar overflow-y-auto p-8 shadow-[0_0_60px_rgba(0,0,0,1)]`}>
        <div className="space-y-10">
          <div>
            <h3 className="text-sky-400 text-[11px] font-bold uppercase tracking-[0.25em] mb-6 flex items-center gap-3 text-shadow">
              <div className="w-2 h-2 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
              Logic Threshold
            </h3>
            <div className="space-y-4">
              <input 
                type="range" min="0" max="1" step="0.05" 
                value={config.confidenceThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                className="w-full accent-sky-500 h-1 bg-sky-950 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] text-sky-800 font-bold tracking-tight">SPECULATIVE</span>
                <span className="text-sm text-sky-200 font-bold bg-sky-500/10 px-2 py-0.5 rounded-sm">{(config.confidenceThreshold * 100).toFixed(0)}%</span>
                <span className="text-[9px] text-sky-800 font-bold tracking-tight">ABSOLUTE</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sky-400 text-[11px] font-bold uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
              <div className="w-2 h-2 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
              Priority Vectors
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {PRIORITY_OPTIONS.map(flag => (
                <button
                  key={flag}
                  onClick={() => togglePriorityFlag(flag)}
                  className={`px-3 py-1.5 border text-[9px] font-bold transition-all rounded-sm tracking-wider ${
                    config.priorityFlags.includes(flag) 
                      ? 'border-sky-400 bg-sky-400/20 text-sky-50 shadow-[0_0_15px_rgba(56,189,248,0.25)]' 
                      : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/60'
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sky-400 text-[11px] font-bold uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
              <div className="w-2 h-2 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
              Deductive Depth
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['fast', 'standard', 'exhaustive'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setConfig(prev => ({ ...prev, depthLevel: level }))}
                  className={`py-3 border text-[9px] font-bold transition-all rounded-sm uppercase tracking-widest ${
                    config.depthLevel === level 
                      ? 'border-amber-500 bg-amber-500/20 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                      : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[10px] text-white/40 italic leading-relaxed">Exhaustive mode maximizes visual reasoning depth, capturing micro-clues like fabric wear or brand logos.</p>
          </div>

          <div className="pt-10 border-t border-white/5">
            <button 
              onClick={() => setIsConfigOpen(false)}
              className="w-full py-4 bg-sky-500 text-black font-bold text-[11px] uppercase tracking-[0.3em] rounded-sm hover:bg-sky-400 transition-colors shadow-[0_10px_30px_rgba(56,189,248,0.2)]"
            >
              Commit Parameters
            </button>
          </div>
        </div>
      </aside>

      <main className={`flex-1 p-6 lg:p-10 w-full max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 transition-[margin-right] duration-300 ${isConfigOpen ? 'lg:mr-80' : ''}`}>
        
        {/* Left: Visualization Feed */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <CameraHUD 
            onCapture={handleCapture} 
            analysisResults={currentAnalysis} 
            isAnalyzing={isAnalyzing} 
            onReset={() => { setCurrentAnalysis(null); setError(null); }}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatBox label="INTENT_VECTOR" value={currentAnalysis?.scan_data?.intent_prediction} primary />
            <div className="md:col-span-2 bg-sky-500/5 border border-sky-500/20 p-5 rounded-sm flex flex-col h-[130px]">
              <div className="text-[9px] text-sky-700 font-bold uppercase mb-3 shrink-0 tracking-widest">Behavioral_Fingerprint</div>
              <div className="flex flex-wrap gap-2 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-2">
                {currentAnalysis?.scan_data?.behavioral_flags?.map((f, i) => (
                  <span key={i} className="text-[10px] bg-black/80 border border-sky-500/40 px-3 py-1.5 text-sky-400 uppercase tracking-widest font-bold">
                    {f}
                  </span>
                )) || <span className="text-[10px] text-sky-900/50 italic uppercase tracking-tighter">Scanning for markers...</span>}
              </div>
            </div>
          </div>

          {currentAnalysis && (
            <div className="bg-sky-950/20 border border-sky-500/40 p-8 rounded-sm animate-fadeIn relative overflow-hidden shadow-2xl">
              <h3 className="text-[10px] text-sky-500 font-bold uppercase tracking-[0.4em] mb-4">Mind Palace Synthesis</h3>
              <p className="text-xl lg:text-3xl font-['Playfair_Display'] italic text-sky-50 leading-relaxed">
                "{currentAnalysis.final_assessment}"
              </p>
            </div>
          )}
          {error && <div className="p-4 bg-red-500/10 border border-red-500/40 text-red-500 text-[10px] uppercase tracking-widest text-center animate-fadeIn font-bold">{error}</div>}
        </div>

        {/* Right: Data Feed & History */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="ATTENTION" value={currentAnalysis?.scan_data?.attention_score ? `${Math.round(currentAnalysis.scan_data.attention_score * 100)}%` : '--'} />
            <MiniStat label="POSTURE" value={currentAnalysis?.scan_data?.posture_score ? `${Math.round(currentAnalysis.scan_data.posture_score * 100)}%` : '--'} />
            <MiniStat label="ENVIRONMENT" value={currentAnalysis?.scan_data?.environment} />
            <MiniStat label="STANCE" value={currentAnalysis?.scan_data?.stance} />
          </div>

          <div className="flex-1 bg-black/80 border border-sky-900/40 rounded-sm flex flex-col min-h-[450px] shadow-2xl">
            <div className="px-6 py-4 border-b border-sky-900/30 flex justify-between items-center bg-black/90 sticky top-0 z-10">
              <span className="text-[11px] text-sky-400 font-bold tracking-[0.25em] uppercase">Observation_Vault</span>
              <span className="text-[9px] text-sky-800 font-bold tracking-widest uppercase">LOGS: {currentAnalysis?.deductions.length || 0}</span>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {!currentAnalysis && !isAnalyzing && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20 grayscale">
                  <div className="w-14 h-14 border border-sky-500/50 rounded-full flex items-center justify-center mb-6">
                    <span className="animate-ping absolute w-10 h-10 bg-sky-500 rounded-full opacity-30" />
                    <span className="text-sky-500 font-bold text-xl">?</span>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.4em] text-sky-900 font-bold">Awaiting Case Evidence</p>
                </div>
              )}

              {currentAnalysis?.deductions.map((d, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveDeduction(activeDeduction === i ? null : i)}
                  className={`p-5 border transition-all cursor-pointer rounded-sm group ${
                    activeDeduction === i ? 'bg-sky-500/10 border-sky-500/60' : 'bg-black/40 border-sky-900/20 hover:border-sky-500/40'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-sky-500 rounded-full shadow-[0_0_5px_rgba(56,189,248,1)]" />
                      <span className="text-sky-400 font-bold text-[12px] uppercase tracking-wide group-hover:text-sky-300">{d.title}</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[8px] text-sky-900 font-bold uppercase tracking-tighter">CONFIDENCE</span>
                       <div className="w-16 h-1 bg-sky-900/40 mt-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-400" style={{ width: `${(d.confidence || 0.8) * 100}%` }} />
                       </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono leading-relaxed">{d.detail}</p>
                  
                  {activeDeduction === i && (
                    <div className="mt-5 pt-5 border-t border-sky-900/40 space-y-5 animate-fadeIn">
                      <div>
                        <div className="text-[10px] text-sky-500/60 uppercase font-bold mb-3 tracking-widest">Logical Pathway</div>
                        {d.logic_steps.map((step, si) => (
                          <div key={si} className="text-[11px] text-sky-100/70 pl-4 border-l-2 border-sky-500/40 mb-3 py-1 leading-snug">{step}</div>
                        ))}
                      </div>
                      
                      {d.grounding && (
                        <div className="bg-amber-500/5 p-3 border border-amber-500/20 rounded-sm">
                          <div className="text-[10px] text-amber-500/60 uppercase font-bold mb-2 tracking-widest">Grounding_Sources (Verified)</div>
                          {d.grounding.map((g, gi) => (
                            <a key={gi} href={g.uri} target="_blank" rel="noreferrer" className="text-[10px] text-amber-500/90 hover:text-amber-300 hover:underline block mb-2 last:mb-0 truncate font-bold">
                              [EXTERNAL] {g.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatBox = ({ label, value, primary }: { label: string; value?: string; primary?: boolean }) => (
  <div className={`border p-5 rounded-sm flex flex-col h-[130px] transition-colors ${primary ? 'bg-sky-500/10 border-sky-500/50' : 'bg-black/60 border-sky-900/30'}`}>
    <div className={`text-[9px] font-bold uppercase mb-3 shrink-0 tracking-widest ${primary ? 'text-sky-400' : 'text-sky-900'}`}>{label}</div>
    <div className={`text-[12px] font-['Playfair_Display'] italic leading-relaxed overflow-y-auto custom-scrollbar flex-1 pr-1 break-words ${primary ? 'text-sky-50 font-bold' : 'text-gray-400'}`}>
      {value || '---'}
    </div>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value?: string }) => (
  <div className="bg-black/90 border border-sky-900/30 px-4 py-3 rounded-sm h-[85px] flex flex-col overflow-hidden shadow-inner">
    <div className="text-[8px] text-sky-800 font-bold uppercase mb-2 shrink-0 tracking-widest">{label}</div>
    <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest overflow-y-auto custom-scrollbar flex-1 pr-1 break-words leading-snug flex items-start">
      <span className="w-full h-fit">{value || '--'}</span>
    </div>
  </div>
);

export default App;
