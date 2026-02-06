
export interface Evidence {
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Deduction {
  title: string;
  detail: string;
  confidence: number; // 0.0 to 1.0
  evidence: Evidence[];
  logic_steps: string[]; 
  grounding?: GroundingSource[];
}

export interface ScanData {
  gender: string;
  age_range: string;
  environment: string;
  attention_score: number;
  posture_score: number;
  stance: string;
  balance: string;
  intent_prediction: string; 
  behavioral_flags: string[];
}

export interface AnalysisConfig {
  confidenceThreshold: number;
  priorityFlags: string[];
  depthLevel: 'fast' | 'standard' | 'exhaustive';
}

export interface SherlockAnalysis {
  session_id: string;
  scan_data: ScanData;
  deductions: Deduction[];
  final_assessment: string;
  session_memory: string[];
}
