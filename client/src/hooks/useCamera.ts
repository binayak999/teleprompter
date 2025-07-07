import { useState, useCallback, useEffect } from 'react';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string>('');
  const [isCameraHidden, setIsCameraHidden] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError('');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        },
        audio: true
      });

      setStream(mediaStream);
      setIsInitializing(false);
    } catch (error) {
      console.error('Failed to access camera:', error);
      setIsInitializing(false);
      setCameraError('Camera access failed');
    }
  }, []);

  // Cleanup camera
  const cleanupCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Initialize camera on mount
  useEffect(() => {
    initializeCamera();
    return () => {
      cleanupCamera();
    };
  }, []); // Empty dependency array to run only once on mount

  const toggleMute = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  }, [stream, isMuted]);

  const toggleCamera = useCallback(() => {
    setIsCameraHidden(!isCameraHidden);
  }, [isCameraHidden]);

  return {
    stream,
    isInitializing,
    cameraError,
    isCameraHidden,
    isMuted,
    initializeCamera,
    cleanupCamera,
    toggleMute,
    toggleCamera
  };
} 