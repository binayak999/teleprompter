import React from 'react';
import { Play, Pause, Square, Camera, Mic, MicOff, Eye, EyeOff, CameraOff } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  recordingTime: number;
  stream: MediaStream | null;
  isCameraHidden: boolean;
  isMuted: boolean;
  eyeCorrectionEnabled: boolean;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onStopRecording: () => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onToggleEyeCorrection: () => void;
}

export default function RecordingControls({
  isRecording,
  isPaused,
  isProcessing,
  recordingTime,
  stream,
  isCameraHidden,
  isMuted,
  eyeCorrectionEnabled,
  onStartRecording,
  onPauseRecording,
  onStopRecording,
  onToggleCamera,
  onToggleMute,
  onToggleEyeCorrection
}: RecordingControlsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-4 left-4 right-4">
      <div className="bg-white/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {/* Left Controls */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <button
                onClick={onToggleCamera}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-pink-500 hover:bg-pink-600"
              >
                {isCameraHidden ? <CameraOff className="w-6 h-6 text-white" /> : <Camera className="w-6 h-6 text-white" />}
              </button>
              <span className="text-xs text-gray-700 mt-2 font-medium">Hide Cam</span>
            </div>

            <div className="flex flex-col items-center">
              <button
                onClick={onToggleMute}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-pink-500 hover:bg-pink-600"
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </button>
              <span className="text-xs text-gray-700 mt-2 font-medium">Mute Mic</span>
            </div>

            <div className="flex flex-col items-center">
              <button
                onClick={onToggleEyeCorrection}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-pink-500 hover:bg-pink-600"
              >
                {eyeCorrectionEnabled ? <Eye className="w-6 h-6 text-white" /> : <EyeOff className="w-6 h-6 text-white" />}
              </button>
              <span className="text-xs text-gray-700 mt-2 font-medium">Eye Correction On</span>
            </div>
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-6">
            {/* Recording Indicator and Timer */}
            <div className="flex items-center gap-4">
              {isRecording && (
                <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
              )}
              {isProcessing && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-600 font-medium">Processing...</span>
                </div>
              )}
              <span className="text-gray-900 font-mono text-xl font-medium">
                {formatTime(recordingTime)}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button
                  onClick={onStartRecording}
                  disabled={!stream}
                  className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg"
                  title="Start Recording"
                >
                  <Play className="w-7 h-7 ml-1 text-white" />
                </button>
              ) : (
                <>
                  <button
                    onClick={onPauseRecording}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-8 h-12 rounded-full flex items-center justify-center transition-all font-medium text-sm border border-gray-300 shadow-lg"
                    title={isPaused ? "Resume Recording" : "Pause Recording"}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={onStopRecording}
                    className="bg-red-500 hover:bg-red-600 text-white px-8 h-12 rounded-full flex items-center justify-center transition-all font-medium text-sm shadow-lg"
                    title="Stop Recording"
                  >
                    <Square className="w-4 h-4 mr-2 fill-current" />
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Side - Audio Visualizer */}
          <div className="flex items-end gap-1 h-16">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-gray-400 rounded-full transition-all duration-200"
                style={{
                  height: `${Math.random() * 40 + 8}px`,
                  opacity: isRecording && !isPaused ? Math.random() * 0.9 + 0.3 : 0.4,
                  backgroundColor: isRecording && !isPaused ? '#10b981' : '#9ca3af',
                  transform: isRecording && !isPaused ? `scaleY(${Math.random() * 0.5 + 0.5})` : 'scaleY(0.3)'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 