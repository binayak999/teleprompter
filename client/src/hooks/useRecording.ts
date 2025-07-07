import { useState, useRef, useCallback } from 'react';
import RecordRTC from 'recordrtc';
import { apiService } from '../services/api';

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  recordedVideoUrl?: string;
  correctedVideoUrl?: string;
  error?: string;
}

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  const startRecordingTimer = useCallback(() => {
    recordingIntervalRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopRecordingTimer = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false
  });

  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      streamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Failed to access camera:', error);
      setState(prev => ({ ...prev, error: 'Failed to access camera' }));
      throw error;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!streamRef.current) {
      throw new Error('Camera not initialized');
    }

    try {
      const recorder = new RecordRTC(streamRef.current, {
        type: 'video',
        mimeType: 'video/mp4',
        recorderType: RecordRTC.MediaStreamRecorder,
        bitsPerSecond: 128000 * 8
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        error: undefined,
        recordedVideoUrl: undefined,
        correctedVideoUrl: undefined
      }));
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ ...prev, error: 'Failed to start recording' }));
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (eyeCorrectionEnabled: boolean = false) => {
    if (!recorderRef.current) return;

    setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

    return new Promise<void>((resolve, reject) => {
      recorderRef.current!.stopRecording(async () => {
        try {
          const blob = recorderRef.current!.getBlob();
          
          // Save the original recording
          const file = new File([blob], 'recording.mp4', { type: 'video/mp4' });
          const saveResponse = await apiService.saveVideo(file);
          const recordedUrl = `${window.location.origin}${saveResponse.url}`;
          
          setState(prev => ({ 
            ...prev, 
            recordedVideoUrl: recordedUrl,
            isProcessing: eyeCorrectionEnabled // Keep processing if eye correction needed
          }));

          // If eye correction is enabled, process the video
          if (eyeCorrectionEnabled) {
            try {
              const correctionResponse = await apiService.correctEyes(file);
              await pollJobStatus(correctionResponse.jobId);
            } catch (error) {
              console.error('Eye correction failed:', error);
              setState(prev => ({ 
                ...prev, 
                isProcessing: false,
                error: 'Eye correction failed'
              }));
            }
          } else {
            setState(prev => ({ ...prev, isProcessing: false }));
          }
          
          resolve();
        } catch (error) {
          console.error('Failed to process recording:', error);
          setState(prev => ({ 
            ...prev, 
            isProcessing: false,
            error: 'Failed to save recording'
          }));
          reject(error);
        }
      });
    });
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    const checkStatus = async () => {
      try {
        const data = await apiService.checkJobStatus(jobId);
        
        if (data.status === 'completed') {
          setState(prev => ({ 
            ...prev, 
            correctedVideoUrl: data.result?.output_video?.url,
            isProcessing: false 
          }));
        } else if (data.status === 'failed') {
          console.error('Eye correction failed:', data.error);
          setState(prev => ({ 
            ...prev, 
            isProcessing: false,
            error: 'Eye correction failed'
          }));
        } else {
          // Still processing, check again in 5 seconds
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Failed to check job status:', error);
        setState(prev => ({ 
          ...prev, 
          isProcessing: false,
          error: 'Failed to check processing status'
        }));
      }
    };
    
    checkStatus();
  }, []);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (recorderRef.current) {
      recorderRef.current.destroy();
    }
  }, []);

  const downloadVideo = useCallback((url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return {
    ...state,
    stream: streamRef.current,
    initializeCamera,
    startRecording,
    stopRecording,
    cleanup,
    downloadVideo,
    isRecording,
    isPaused,
    recordingTime,
    isProcessing,
    showSuccessMessage,
    recordedVideoUrl,
    mediaRecorderRef,
    recordedChunksRef,
    setIsRecording,
    setIsPaused,
    setRecordingTime,
    setIsProcessing,
    setShowSuccessMessage,
    setRecordedVideoUrl,
    startRecordingTimer,
    stopRecordingTimer
  };
}