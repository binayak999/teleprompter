export interface ScriptGenerationRequest {
    topic: string;
    duration: number; // in minutes
    tone: 'professional' | 'casual' | 'enthusiastic' | 'informative';
  }
  
  export interface ScriptGenerationResponse {
    script: string;
  }
  
  export interface EyeCorrectionRequest {
    video: File;
  }
  
  export interface EyeCorrectionResponse {
    jobId: string;
    status: 'processing' | 'completed' | 'failed';
    correctedVideoUrl?: string;
  }
  
  export interface JobStatusResponse {
    id: string;
    status: 'processing' | 'completed' | 'failed';
    result?: {
      output_video: {
        url: string;
      };
    };
    error?: string;
  }
  
  export interface VideoSaveResponse {
    message: string;
    filename: string;
    url: string;
  }
  
  export interface TeleprompterSettings {
    scrollSpeed: number; // pixels per second
    fontSize: number;
    eyeCorrectionEnabled: boolean;
  }
  
  export interface RecordingState {
    isRecording: boolean;
    isProcessing: boolean;
    recordedVideoUrl?: string;
    correctedVideoUrl?: string;
  }