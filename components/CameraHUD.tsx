
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SherlockAnalysis } from '../types';

interface CameraHUDProps {
  onCapture: (base64: string, mimeType: string) => void;
  analysisResults: SherlockAnalysis | null;
  isAnalyzing: boolean;
  onReset: () => void;
}

const CameraHUD: React.FC<CameraHUDProps> = ({ onCapture, analysisResults, isAnalyzing, onReset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<any>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video' | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [flash, setFlash] = useState(false);

  const clearResources = useCallback(() => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const stopCamera = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        videoRef.current.srcObject = null;
      }
    }
    setIsActive(false);
  }, []);

  const setupCamera = useCallback(async () => {
    setPermissionError(null);
    setIsInitializing(true);
    clearResources();
    setPreviewUrl(null);
    setPreviewType(null);
    onReset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setIsActive(true);
          setIsInitializing(false);
        };
      }
    } catch (err: any) {
      setIsInitializing(false);
      setPermissionError(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Hardware Failure');
      setIsActive(false);
    }
  }, [onReset, clearResources]);

  const handleScan = useCallback(() => {
    if (isAnalyzing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let source: HTMLVideoElement | HTMLImageElement | null = null;
    let mimeType = 'image/jpeg';

    if (isActive && videoRef.current) {
      source = videoRef.current;
    } else if (previewType === 'video' && previewVideoRef.current) {
      source = previewVideoRef.current;
    } else if (previewType === 'image') {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        onCapture(canvas.toDataURL('image/jpeg', 0.9).split(',')[1], 'image/jpeg');
      };
      if (previewUrl) img.src = previewUrl;
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      return;
    }

    if (source instanceof HTMLVideoElement) {
      const v = source as HTMLVideoElement;
      setFlash(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setFlash(false), 150);

      const maxWidth = 1024;
      const scale = v.videoWidth > maxWidth ? maxWidth / v.videoWidth : 1;
      canvas.width = v.videoWidth * scale;
      canvas.height = v.videoHeight * scale;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL(mimeType, 0.9);
      
      if (isActive) {
        const staticPreview = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewUrl(staticPreview);
        setPreviewType('image');
        stopCamera();
      }

      onCapture(dataUrl.split(',')[1], mimeType);
    }
  }, [onCapture, isActive, isAnalyzing, previewUrl, previewType, stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    onReset();
    clearResources();
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewType(type);
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const handleFullReset = () => {
    stopCamera();
    clearResources();
    setPreviewUrl(null);
    setPreviewType(null);
    onReset();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearResources();
      stopCamera();
    };
  }, [stopCamera, clearResources]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg border border-sky-900/50 overflow-hidden shadow-2xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {previewUrl && previewType === 'image' && (
        <img 
          src={previewUrl} 
          className="absolute inset-0 w-full h-full object-contain bg-black/20 animate-fadeIn" 
          alt="Evidence Preview" 
        />
      )}

      {previewUrl && previewType === 'video' && (
        <video 
          key={previewUrl}
          ref={previewVideoRef}
          src={previewUrl} 
          controls
          className="absolute inset-0 w-full h-full object-contain bg-black/20 animate-fadeIn" 
        />
      )}

      {flash && <div className="absolute inset-0 bg-white z-50 animate-pulse opacity-60 pointer-events-none" />}

      {(!isActive && !previewUrl && !permissionError) && (
        <div className="absolute inset-0 z-40 bg-black/80 flex flex-col items-center justify-center p-6 text-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-sky-400 font-bold tracking-[0.3em] uppercase text-xs">Awaiting Optical Input</h2>
            <p className="text-[9px] text-sky-700 font-mono italic">"The game is afoot. Select your method of observation."</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={setupCamera}
              disabled={isInitializing}
              className="px-8 py-3 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-bold tracking-widest hover:bg-sky-500 hover:text-white transition-all rounded-sm disabled:opacity-50"
            >
              {isInitializing ? 'INITIALIZING...' : 'START CAMERA FEED'}
            </button>
            <button 
              onClick={triggerFileUpload}
              className="px-8 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold tracking-widest hover:bg-amber-500 hover:text-white transition-all rounded-sm"
            >
              LOAD EVIDENCE (ASSET)
            </button>
          </div>
        </div>
      )}

      {permissionError && (
        <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-red-500 font-bold uppercase text-[10px] tracking-widest mb-2">[HARDWARE_FAILURE]</div>
          <button onClick={setupCamera} className="text-sky-500 text-[9px] underline uppercase tracking-widest">Retry Connection</button>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 pointer-events-none z-20">
        {(isActive || isAnalyzing) && <div className="scanline" />}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-sky-500/40" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-sky-500/40" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-sky-500/40" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-sky-500/40" />

        {previewUrl && analysisResults?.deductions?.map((d, i) => (
          d.evidence?.map((ev, ei) => (
            <div 
              key={`${i}-${ei}`}
              className="absolute border border-sky-400/80 bg-sky-400/10 transition-all duration-1000 animate-fadeIn"
              style={{
                left: `${(ev.x / 1000) * 100}%`,
                top: `${(ev.y / 1000) * 100}%`,
                width: `${(ev.width / 1000) * 100}%`,
                height: `${(ev.height / 1000) * 100}%`,
              }}
            >
              <div className="absolute -top-5 left-0 text-[7px] text-sky-300 font-bold font-mono bg-black/90 px-2 py-0.5 border border-sky-500/30 whitespace-nowrap">
                EVIDENCE_{ev.description.toUpperCase().slice(0, 20)}
              </div>
            </div>
          ))
        ))}
      </div>

      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-3">
        {(previewUrl || analysisResults) && (
          <button
            onClick={handleFullReset}
            className="px-6 py-2 rounded-sm border border-red-500/30 bg-black/90 hover:bg-red-500/30 transition-all pointer-events-auto"
          >
            <span className="text-[10px] text-red-500 uppercase tracking-widest font-bold">Clear</span>
          </button>
        )}
        
        {(isActive || (previewUrl && !analysisResults)) && (
          <button
            onClick={handleScan}
            disabled={isAnalyzing}
            className="px-6 py-2 bg-sky-500 hover:bg-sky-400 text-black font-bold text-[10px] tracking-[0.2em] uppercase rounded-sm transition-all shadow-[0_0_15px_rgba(56,189,248,0.4)] disabled:opacity-50 pointer-events-auto"
          >
            {isAnalyzing ? "ANALYZING..." : (isActive ? 'CAPTURE & ANALYZE' : 'ANALYZE SUBJECT')}
          </button>
        )}
      </div>

      {(isActive || (previewUrl && isAnalyzing)) && (
        <div className="absolute top-4 left-4 z-30 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[8px] font-bold font-mono text-white tracking-widest uppercase shadow-sm">
              {isActive ? 'FEED_LIVE' : isAnalyzing ? 'ANALYZING_FRAME' : `EVIDENCE_${previewType?.toUpperCase()}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraHUD;
