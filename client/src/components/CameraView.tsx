import React, { useRef, useEffect } from 'react';
import { Camera } from 'lucide-react';

interface CameraViewProps {
  stream: MediaStream | null;
  isInitializing: boolean;
  cameraError: string;
  isCameraHidden: boolean;
  isRecording: boolean;
  isPaused: boolean;
  onInitializeCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function CameraView({
  stream,
  isInitializing,
  cameraError,
  isCameraHidden,
  isRecording,
  isPaused,
  onInitializeCamera,
  videoRef,
  canvasRef
}: CameraViewProps) {
  const animationFrameRef = useRef<number | null>(null);

  // Canvas animation effect for recording
  useEffect(() => {
    if (!isRecording || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    if (!ctx) return;

    const drawFlippedFrame = () => {
      if (!isRecording) return;

      // Only draw when not paused
      if (!isPaused) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context state
        ctx.save();

        // Flip horizontally
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        // Draw flipped video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Restore context state
        ctx.restore();
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(drawFlippedFrame);
    };

    // Start animation
    animationFrameRef.current = requestAnimationFrame(drawFlippedFrame);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  // Set video source when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
        {/* Camera Video */}
        {stream && !cameraError ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{
                transform: 'scaleX(-1)',
                filter: isCameraHidden ? 'brightness(0)' : 'none'
              }}
            />
            {/* Hidden canvas for flipped recording */}
            <canvas
              ref={canvasRef}
              className="hidden"
              style={{ display: 'none' }}
            />
          </>
        ) : isInitializing ? (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Initializing camera...</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Camera not available</p>
              {cameraError && (
                <button
                  onClick={onInitializeCamera}
                  className="px-4 py-2 bg-gradient-button hover:bg-gradient-button-hover rounded transition-colors text-white"
                >
                  Retry Camera
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 