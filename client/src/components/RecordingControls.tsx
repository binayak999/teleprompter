import React from "react";
import {
  Play,
  Pause,
  Square,
  Camera,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  CameraOff,
} from "lucide-react";

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  recordingTime: number;
  stream: MediaStream | null;
  isCameraHidden: boolean;
  isMuted: boolean;
  eyeCorrectionEnabled: boolean;
  script: string;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onStopRecording: () => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onToggleEyeCorrection: () => void;
  onOpenScriptModal: () => void;
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
  script,
  onStartRecording,
  onPauseRecording,
  onStopRecording,
  onToggleCamera,
  onToggleMute,
  onToggleEyeCorrection,
  onOpenScriptModal,
}: RecordingControlsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full  mx-auto">
      <div className="bg-white/80 backdrop-blur-2xl border border-gray-200 rounded-2xl max-w-3xl mx-auto  px-6  py-3 shadow-xl">
        <div className="flex items-center justify-between  ">
          {/* Left Controls */}
          <div className="flex items-center gap-9">
            <div className="flex flex-col items-center justify-center ">
              <button
                onClick={onToggleCamera}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-gradient-button hover:bg-gradient-button-hover"
              >
                {isCameraHidden ? (
                  <CameraOff className="w-6 h-6 text-white" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              <span className="text-xs text-gray-700 mt-2 font-medium">
                Hide Cam
              </span>
            </div>

            <div className="flex flex-col items-center justify-center ">
              <button
                onClick={onToggleMute}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-gradient-button hover:bg-gradient-button-hover"
              >
                {isMuted ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </button>
              <span className="text-xs text-gray-700 mt-2 font-medium">
                Mute Mic
              </span>
            </div>

            <div className="flex flex-col items-center justify-center ">
              <button
                onClick={onToggleEyeCorrection}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-gradient-button hover:bg-gradient-button-hover "
              >
                {eyeCorrectionEnabled ? (
                  <Eye className="w-6 h-6 text-white" />
                ) : (
                  <EyeOff className="w-6 h-6 text-white" />
                )}
              </button>
              <span className="text-xs text-gray-700 mt-2 font-medium">
                {eyeCorrectionEnabled ? "Eye Correction On" : "Eye Correction Off"}
              </span>
            </div>
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-6">
            {/* Recording Indicator and Timer */}
            <div className="flex items-center gap-4">
              {isRecording && (
                <div
                  className={`w-3 h-3 rounded-full ${
                    isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                  }`}
                ></div>
              )}
              {isProcessing && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-600 font-medium">
                    Processing...
                  </span>
                </div>
              )}
              {isRecording && (
                <div className="text-red-500 font-mono text-xl font-medium flex items-center gap-2">
                  {formatTime(recordingTime)}
                </div>
              )}
            </div>
            {/* Control Buttons */}
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button
                  onClick={!script.trim() ? onOpenScriptModal : onStartRecording}
                  disabled={!stream}
                  className="bg-red-500 rounded-full hover:bg-red-600  disabled:bg-gray-400 disabled:cursor-not-allowed max-w-max px-6 py-3 flex items-center justify-center transition-all  shadow-lg gap-2"
                  title={!script.trim() ? "Click to add a script" : "Start Recording"}
                >
                  <span className="size-5 bg-white rounded-full" />
                  <span className="font-semibold text-white">
                    {!script.trim() ? "Add Script First" : "Record"}
                  </span>
                </button>
              ) : (
                <>
                  <button
                    onClick={onPauseRecording}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-8 h-12 flex items-center justify-center transition-all font-medium text-sm border border-gray-300 shadow-lg rounded-full"
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
                    className="bg-red-500 hover:bg-red-600 text-white px-8 h-12  flex items-center justify-center transition-all font-medium text-sm shadow-lg rounded-full"
                    title="Stop Recording"
                  >
                    <Square className="w-4 h-4 mr-2 fill-current" />
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
