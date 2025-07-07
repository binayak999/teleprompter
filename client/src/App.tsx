import React, { useState, useRef, useEffect, useCallback } from "react";
import Header from "./components/Header";
import ScriptModal from "./components/ScriptModal";
import TeleprompterDisplay from "./components/TeleprompterDisplay";
import CameraView from "./components/CameraView";
import RecordingControls from "./components/RecordingControls";
import SuccessMessage from "./components/SuccessMessage";
import { useCamera } from "./hooks/useCamera";
import { useRecording } from "./hooks/useRecording";
import { useScript } from "./hooks/useScript";
import { api } from "./services/api";

export default function TeleprompterApp() {
  // State management
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [eyeCorrectionEnabled, setEyeCorrectionEnabled] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Custom hooks
  const {
    stream,
    isInitializing,
    cameraError,
    isCameraHidden,
    isMuted,
    initializeCamera,
    toggleMute,
    toggleCamera,
  } = useCamera();

  const {
    script,
    setScript,
    isGeneratingScript,
    scriptSettings,
    setScriptSettings,
    generateScript,
    currentScriptId,
    setCurrentScriptId,
  } = useScript();

  const {
    isRecording,
    isPaused,
    recordingTime,
    isProcessing,
    showSuccessMessage,
    mediaRecorderRef,
    recordedChunksRef,
    setIsRecording,
    setIsPaused,
    setRecordingTime,
    setIsProcessing,
    setShowSuccessMessage,
    startRecordingTimer,
    stopRecordingTimer,
  } = useRecording();

  // Debug logging
  useEffect(() => {
    console.log("App state:", {
      stream: !!stream,
      isInitializing,
      cameraError,
      isRecording,
      isPaused,
      recordingTime,
    });
  }, [
    stream,
    isInitializing,
    cameraError,
    isRecording,
    isPaused,
    recordingTime,
  ]);

  // Check server health on mount
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const health = await api.healthCheck();
        console.log("Server health check passed:", health);
      } catch (error) {
        console.error("Server health check failed:", error);
        alert("Warning: Cannot connect to server. Video uploads may not work.");
      }
    };

    checkServerHealth();
  }, []);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Recording timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      startRecordingTimer();
    } else {
      stopRecordingTimer();
    }
  }, [isRecording, isPaused, startRecordingTimer, stopRecordingTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      stopRecordingTimer();
    };
  }, [stopRecordingTimer]);

  // Create flipped canvas stream for recording
  const startCanvasRecording = useCallback(() => {
    console.log("startCanvasRecording called", {
      videoRef: !!videoRef.current,
      canvasRef: !!canvasRef.current,
      stream: !!stream,
      videoWidth: videoRef.current?.videoWidth,
      videoHeight: videoRef.current?.videoHeight,
    });

    if (!videoRef.current || !canvasRef.current || !stream) {
      console.log("Missing required elements for recording");
      return null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    console.log("Canvas size set to:", canvas.width, "x", canvas.height);

    // Get stream from canvas
    const canvasStream = canvas.captureStream(30); // 30 FPS

    // Add audio from original stream
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach((track) => {
      canvasStream.addTrack(track);
    });

    console.log(
      "Canvas stream created with tracks:",
      canvasStream.getTracks().length
    );
    return canvasStream;
  }, [stream]);

  // Recording functions
  const startRecording = useCallback(async () => {
    console.log("startRecording called, stream:", !!stream);
    if (!stream) {
      alert(
        "Camera not available. Please ensure camera permissions are granted."
      );
      return;
    }

    try {
      recordedChunksRef.current = [];

      // Wait for video to be ready
      if (videoRef.current && videoRef.current.readyState < 2) {
        await new Promise((resolve) => {
          videoRef.current!.addEventListener("loadeddata", resolve, {
            once: true,
          });
        });
      }

      // Create flipped stream for recording
      const flippedStream = startCanvasRecording();
      console.log("Flipped stream created:", !!flippedStream);
      if (!flippedStream) {
        console.error("Failed to create flipped stream");
        alert("Unable to create recording stream. Please try again.");
        return;
      }

      // Prioritize MP4 format for better compatibility
      let mimeType = "video/mp4";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=h264";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm;codecs=vp9";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "video/webm;codecs=vp8";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = "video/webm";
            }
          }
        }
      }

      console.log("Creating MediaRecorder with mimeType:", mimeType);
      const mediaRecorder = new MediaRecorder(flippedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });
      console.log("MediaRecorder created successfully");

      mediaRecorder.ondataavailable = (event) => {
        console.log("MediaRecorder data available:", event.data.size, "bytes");
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        alert("Recording error occurred. Please try again.");
      };

      mediaRecorder.onstop = async () => {
        console.log(
          "MediaRecorder onstop called, chunks:",
          recordedChunksRef.current.length
        );
        setIsProcessing(true);

        try {
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });

          // Create filename with timestamp
          const timestamp = new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/:/g, "-");
          const filename = `teleprompter-recording-${timestamp}.mp4`;

          // Upload to server with script information
          console.log("Uploading video to server...");
          const scriptInfo = currentScriptId ? {
            scriptId: currentScriptId,
            scriptTitle: scriptSettings.topic,
            scriptTopic: scriptSettings.topic
          } : undefined;
          const result = await api.saveVideo(blob, filename, scriptInfo);

          console.log("Video uploaded successfully:", result);

          // Also download locally for convenience
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Show success message
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 5000);

          console.log(
            "Recording saved locally and uploaded to server:",
            filename
          );
        } catch (error) {
          console.error("Error processing recording:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          alert(`Error saving recording: ${errorMessage}. Please try again.`);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Record in 1-second chunks

      setIsRecording(true);
      setIsPaused(false);
      setIsScrolling(true);
      setRecordingTime(0);

      console.log(`Recording started with format: ${mimeType}`);
    } catch (error) {
      console.error("Failed to start recording:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert("Failed to start recording: " + errorMessage);
    }
  }, [
    stream,
    startCanvasRecording,
    recordedChunksRef,
    mediaRecorderRef,
    setIsRecording,
    setIsPaused,
    setIsScrolling,
    setRecordingTime,
    setIsProcessing,
    setShowSuccessMessage,
  ]);

  const pauseRecording = useCallback(() => {
    console.log(
      "pauseRecording called, isRecording:",
      isRecording,
      "isPaused:",
      isPaused
    );
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        // Resume recording
        if (mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.resume();
        }
        setIsPaused(false);
        setIsScrolling(true);
        console.log("Recording resumed");
      } else {
        // Pause recording
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.pause();
        }
        setIsPaused(true);
        setIsScrolling(false);
        console.log("Recording paused");
      }
    }
  }, [mediaRecorderRef, isRecording, isPaused, setIsPaused, setIsScrolling]);

  const stopRecording = useCallback(() => {
    console.log("stopRecording called, isRecording:", isRecording);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setIsScrolling(false);
      setRecordingTime(0);
      console.log("Recording stopped");
    }
  }, [
    mediaRecorderRef,
    isRecording,
    setIsRecording,
    setIsPaused,
    setIsScrolling,
    setRecordingTime,
  ]);

  const toggleScrolling = useCallback(() => {
    setIsScrolling((prev) => {
      const newState = !prev;
      console.log("Manual scroll toggle:", newState);
      return newState;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScrollSpeed((prev) => Math.min(200, prev + 5));
      } else if (e.key === "ArrowDown" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScrollSpeed((prev) => Math.max(10, prev - 5));
      } else if (e.key === "") {
        e.preventDefault();
        if (isRecording) {
          pauseRecording();
        } else {
          toggleScrolling();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isRecording, pauseRecording, toggleScrolling]);

  return (
    <div className="min-h-screen relative p-6">
      {/* <div className="h-screen w-screen absolute inset-0  -z-10"/> */}
      <div className=" absolute top-0 left-0 right-0 bottom-0 bg-[url('/future.jpg')] bg-center bg-cover bg-no-repeat blur-xs -z-30 brightness-[0.85]" />
      {/* Success Message */}
      <SuccessMessage
        isVisible={showSuccessMessage}
        onClose={() => setShowSuccessMessage(false)}
      />

      {/* Header */}
      <Header
        scrollSpeed={scrollSpeed}
        onSpeedChange={setScrollSpeed}
        onScriptClick={() => setShowDropdown(true)}
      />

      {/* Script Modal */}
      <ScriptModal
        isOpen={showDropdown}
        onClose={() => setShowDropdown(false)}
        script={script}
        onScriptChange={setScript}
        scriptSettings={scriptSettings}
        onScriptSettingsChange={setScriptSettings}
        isGeneratingScript={isGeneratingScript}
        onGenerateScript={generateScript}
        currentScriptId={currentScriptId}
        onScriptIdChange={setCurrentScriptId}
      />

      {/* Teleprompter Text */}
      <TeleprompterDisplay
        script={script}
        isScrolling={isScrolling}
        scrollSpeed={scrollSpeed}
      />

      {/* Camera View */}
      <div className="relative max-w-7xl mx-auto">
        <CameraView
          stream={stream}
          isInitializing={isInitializing}
          cameraError={cameraError}
          isCameraHidden={isCameraHidden}
          isRecording={isRecording}
          isPaused={isPaused}
          onInitializeCamera={initializeCamera}
          videoRef={videoRef}
          canvasRef={canvasRef}
        />

        {/* Recording Controls Overlay */}
        <RecordingControls
          isRecording={isRecording}
          isPaused={isPaused}
          isProcessing={isProcessing}
          recordingTime={recordingTime}
          stream={stream}
          isCameraHidden={isCameraHidden}
          isMuted={isMuted}
          eyeCorrectionEnabled={eyeCorrectionEnabled}
          onStartRecording={() => {
            console.log("RecordingControls: startRecording button clicked");
            startRecording();
          }}
          onPauseRecording={() => {
            console.log("RecordingControls: pauseRecording button clicked");
            pauseRecording();
          }}
          onStopRecording={() => {
            console.log("RecordingControls: stopRecording button clicked");
            stopRecording();
          }}
          onToggleCamera={toggleCamera}
          onToggleMute={toggleMute}
          onToggleEyeCorrection={() =>
            setEyeCorrectionEnabled(!eyeCorrectionEnabled)
          }
        />
      </div>
    </div>
  );
}
