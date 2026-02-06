
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SherlockAnalysis } from '../types';

interface CameraHUDProps {
  onCapture: (base64: string, mimeType: string) => void;
  analysisResults: SherlockAnalysis | null;
  isAnalyzing: boolean;
  isCCTVActive: boolean;
  onReset: () => void;
}

const CameraHUD: React.FC<CameraHUDProps> = ({ onCapture, analysisResults, isAnalyzing, isCCTVActive, onReset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString([], { hour12: false }));
  
  const [isActive, setIsActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video' | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [flash, setFlash] = useState(false);

  // Digital clock update
  useEffect(() => {
    const timer = setInterval(() => setTimestamp(new Date().toLocaleTimeString([], { hour12: false })), 1000);
    return () => clearInterval(timer);
  }, []);

  const clearResources = useCallback(() => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const stopCamera = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
        });
        videoRef.current.srcObject = null;
      }
    }
    setIsActive(false);
  }, []);

  const setupCamera = useCallback(async () => {
    if (isInitializing) return;
    setPermissionError(null);
    setIsInitializing(true);
    clearResources();
    setPreviewUrl(null);
    setPreviewType(null);
    
    // Clear old data before starting new feed
    onReset();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsActive(true);
        setIsInitializing(false);
      }
    } catch (err: any) {
      console.error("Camera Init Error:", err);
      setIsInitializing(false);
      setPermissionError(err.name === 'NotAllowedError' ? 'Access Denied' : 'HW Error');
      setIsActive(false);
    }
  }, [onReset, clearResources, isInitializing]);

  // CCTV FEED MANAGEMENT
  useEffect(() => {
    if (isCCTVActive && !isActive && !previewUrl && !isInitializing && !permissionError) {
      setupCamera();
    }
  }, [isCCTVActive, isActive, previewUrl, setupCamera, isInitializing, permissionError]);

  const captureFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let source: HTMLVideoElement | null = null;
    if (isActive && videoRef.current) {
      source = videoRef.current;
    } else if (previewType === 'video' && previewVideoRef.current) {
      source = previewVideoRef.current;
    }

    if (source) {
      if (source.readyState < 2) return;
      // Don't capture if video file is paused in CCTV mode
      if (previewType === 'video' && source.paused) return;

      const maxWidth = 1024;
      const scale = source.videoWidth > maxWidth ? maxWidth / source.videoWidth : 1;
      canvas.width = source.videoWidth * scale;
      canvas.height = source.videoHeight * scale;
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(dataUrl.split(',')[1], 'image/jpeg');
      
      if (!isCCTVActive) {
        setFlash(true);
        setTimeout(() => setFlash(false), 100);
      }
    } else if (previewType === 'image' && previewUrl) {
      onCapture(previewUrl.split(',')[1], 'image/jpeg');
    }
  }, [isActive, previewType, previewUrl, isCCTVActive, onCapture]);

  // STABLE POLL LOOP
  useEffect(() => {
    if (!isCCTVActive) return;
    
    const interval = setInterval(() => {
      // Only capture if we aren't already waiting for an analysis
      if (!isAnalyzing) {
        captureFrame();
      }
    }, 2500); 
    
    return () => clearInterval(interval);
  }, [isCCTVActive, isAnalyzing, captureFrame]);

  const handleManualCapture = () => {
    if (isAnalyzing) return;
    captureFrame();
    if (isActive) {
      const canvas = canvasRef.current;
      if (canvas) {
        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
        setPreviewType('image');
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    onReset();
    clearResources();
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setPreviewUrl(URL.createObjectURL(file));
    setPreviewType(type);
  };

  const handleFullReset = () => {
    stopCamera();
    clearResources();
    setPreviewUrl(null);
    setPreviewType(null);
    onReset();
  };

  return (
    <div className={`relative w-full aspect-video bg-black rounded-sm border overflow-hidden shadow-2xl transition-all duration-500 ${
      isCCTVActive ? 'border-red-900/60' : 'border-sky-900/40'
    }`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {previewUrl && previewType === 'image' && (
        <img 
          src={previewUrl} 
          className="absolute inset-0 w-full h-full object-contain bg-black/20 animate-fadeIn" 
          alt="Asset Preview" 
        />
      )}

      {previewUrl && previewType === 'video' && (
        <video 
          key={previewUrl}
          ref={previewVideoRef}
          src={previewUrl} 
          controls
          className="absolute inset-0 w-full h-full object-contain bg-black/40 animate-fadeIn z-10" 
        />
      )}

      {flash && <div className="absolute inset-0 bg-white z-50 animate-pulse opacity-20 pointer-events-none" />}

      {/* SECURITY HUD OVERLAY */}
      {(isActive || isInitializing || (previewType === 'video' && isCCTVActive)) && (
        <>
          <div className="absolute top-6 left-6 z-30 flex flex-col gap-1 pointer-events-none drop-shadow-xl">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isCCTVActive ? 'bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]'}`} />
              <span className={`text-[10px] font-bold tracking-[0.4em] uppercase ${isCCTVActive ? 'text-red-500' : 'text-sky-400'}`}>
                {isInitializing ? 'INITIALIZING_FEED' : isCCTVActive ? 'LIVE_SURVEILLANCE' : 'ASSET_PREVIEW'}
              </span>
            </div>
            <span className="text-[12px] text-white font-mono tracking-widest">{timestamp}</span>
          </div>

          <div className="absolute top-6 right-6 z-30 text-right pointer-events-none drop-shadow-xl">
            <div className="text-[9px] text-sky-700 font-bold uppercase tracking-widest mb-1">Deductive_Load</div>
            <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full bg-sky-400 transition-all duration-300 ${isAnalyzing ? 'w-full animate-pulse' : 'w-0'}`} />
            </div>
            {isAnalyzing && <span className="text-[7px] text-sky-500 uppercase mt-1 block tracking-widest font-bold">Scanning_Frame...</span>}
          </div>
        </>
      )}

      {/* INITIALIZATION / EMPTY STATE */}
      {(!isActive && !previewUrl && !permissionError && !isInitializing) && (
        <div className="absolute inset-0 z-40 bg-[#020202] flex flex-col items-center justify-center p-6 text-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border border-sky-500/20 rounded-full flex items-center justify-center relative">
               <div className="w-10 h-10 border border-sky-500/10 rounded-full animate-ping absolute" />
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
               </svg>
            </div>
            <h2 className="text-sky-600 font-bold tracking-[0.5em] uppercase text-[10px]">Security Feed Offline</h2>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={setupCamera}
              className="px-8 py-3 bg-sky-500/5 border border-sky-500/30 text-sky-400 text-[10px] font-bold tracking-widest hover:bg-sky-500 hover:text-black transition-all rounded-sm"
            >
              START LIVE FEED
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-3 bg-amber-500/5 border border-amber-500/30 text-amber-500 text-[10px] font-bold tracking-widest hover:bg-amber-500 hover:text-black transition-all rounded-sm"
            >
              LOAD ASSET
            </button>
          </div>
        </div>
      )}

      {permissionError && (
        <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center p-6 text-center">
          <span className="text-red-500 font-bold uppercase text-[9px] tracking-[0.3em] mb-4">!! Feed Failure !!</span>
          <p className="text-[10px] text-red-900 mb-6 font-mono">{permissionError}</p>
          <button onClick={setupCamera} className="px-6 py-2 border border-red-950 text-red-800 text-[9px] uppercase tracking-widest hover:bg-red-950/20 transition-colors">Retry</button>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
      <canvas ref={canvasRef} className="hidden" />

      {/* EVIDENCE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {(isActive || isAnalyzing || (previewType === 'video' && isCCTVActive)) && (
          <div className="absolute inset-0 overflow-hidden opacity-50">
             <div className="scanline" />
             <div className="absolute w-full h-[1px] bg-sky-500/20 top-0 animate-[scanline_8s_linear_infinite]" />
          </div>
        )}
        
        {/* HUD Frame Corners */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l border-t border-white/20" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r border-t border-white/20" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b border-white/20" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b border-white/20" />

        {analysisResults?.deductions?.map((d, i) => (
          d.evidence?.map((ev, ei) => (
            <div 
              key={`${i}-${ei}`}
              className="absolute border border-sky-400/60 bg-sky-400/5 transition-all duration-500 animate-fadeIn"
              style={{
                left: `${(ev.x / 1000) * 100}%`,
                top: `${(ev.y / 1000) * 100}%`,
                width: `${(ev.width / 1000) * 100}%`,
                height: `${(ev.height / 1000) * 100}%`,
              }}
            >
              <div className="absolute -top-5 left-0 text-[7px] text-sky-200 font-bold font-mono bg-black/80 px-1.5 py-0.5 border border-sky-400/30 whitespace-nowrap uppercase tracking-tighter">
                {ev.description.slice(0, 20)}
              </div>
            </div>
          ))
        ))}
      </div>

      <div className="absolute bottom-6 left-6 right-6 z-30 flex justify-between items-end">
        {(previewUrl || analysisResults) && !isActive && (
          <button
            onClick={handleFullReset}
            className="px-5 py-2 rounded-sm border border-white/10 bg-black/80 hover:bg-white hover:text-black transition-all text-[9px] uppercase tracking-widest font-bold text-gray-500 pointer-events-auto"
          >
            Clear_Interface
          </button>
        )}
        
        {isActive && (
          <button
            onClick={handleManualCapture}
            disabled={isAnalyzing}
            className="ml-auto px-8 py-3 bg-black/90 border border-sky-500/30 hover:border-sky-500 text-sky-400 font-bold text-[10px] tracking-[0.2em] uppercase rounded-sm transition-all disabled:opacity-50 pointer-events-auto shadow-2xl backdrop-blur-md"
          >
            {isAnalyzing ? 'Thinking...' : 'Freeze & Deduce'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraHUD;
