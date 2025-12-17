export interface AnalysisResult {
  observations: {
    sound: string;
    body: string;
  };
  emotionalSpectrum: {
    dominantEmotion: string;
    stressLevel: 'Low' | 'Medium' | 'Critical';
  };
  translation: string;
  recommendations: {
    do: string;
    dont: string;
  };
}

export interface HistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
}

export enum AppState {
  HOME = 'HOME',
  RECORDING = 'RECORDING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  HISTORY = 'HISTORY',
}

export interface AudioState {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
}
