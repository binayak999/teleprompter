import React, { useEffect, useRef } from "react";
import type { ScriptSettings } from "../types";
import { WandSparklesIcon } from "lucide-react";

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
  onScriptChange: (script: string) => void;
  scriptSettings: ScriptSettings;
  onScriptSettingsChange: (settings: ScriptSettings) => void;
  isGeneratingScript: boolean;
  onGenerateScript: () => void;
}

export default function ScriptModal({
  isOpen,
  onClose,
  script,
  onScriptChange,
  scriptSettings,
  onScriptSettingsChange,
  isGeneratingScript,
  onGenerateScript,
}: ScriptModalProps) {
  if (!isOpen) return null;

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(()=>{
    if(script.length > 0){
      textAreaRef.current?.scrollBy(0, textAreaRef.current.scrollHeight);
    }
  },[script.length])

  return (
    <div className="fixed inset-0 bg-black/5 bg-opacity-70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/95 rounded-2xl w-full max-w-2xl  relative">
        {/* Modal Header */}
        <div className="flex items-center  p-5 py-4 justify-between ">
          <h2 className="text-base font-semibold text-white">Script</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all"
          >
            <span className="text-white text-lg">×</span>
          </button>
        </div>
        <div className="h-px w-full bg-gray-700" />
        {/* Content */}
        <div className="text-center flex-1 px-4 py-2">
          <div className="space-y-4">
            <div className="">
             
              <textarea
              ref={textAreaRef}
                value={script}
                onChange={(e) => onScriptChange(e.target.value)}
                className="w-full p-4 custom-thumb rounded-lg text-white min-h-80 resize-none outline-none leading-relaxed"
                placeholder={
                  isGeneratingScript
                    ? "Generating script... (you can still edit)"
                    : "Your script will appear here..."
                }
                disabled={false}
                onKeyDown={(e) => {
                  // Allow all key inputs including space, backspace, etc.
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const target = e.target as HTMLTextAreaElement;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const newValue =
                      script.substring(0, start) +
                      "    " +
                      script.substring(end);
                    onScriptChange(newValue);
                    // Set cursor position after the tab
                    setTimeout(() => {
                      target.selectionStart = target.selectionEnd = start + 4;
                    }, 0);
                  }
                }}
                style={{
                  fontFamily: "monospace",
                  fontSize: "14px",
                  lineHeight: "1.6",
                }}
              />
            </div>
          </div>
        </div>

        {/* Script Generation Input */}
        <div className="space-y-6  pt-3 p-5">
          <div
            className={`flex relative items-center gap-4 w-full  rounded-full p-[2px] bg-gradient-to-tr from-purple-700 to-pink-400 ${
              isGeneratingScript ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-center gap-4 bg-gray-800 rounded-full  pr-1 p-4 py-1 w-full">
              <div className="text-white">
                <WandSparklesIcon size={24} />
              </div>

              <input
                type="text"
                value={scriptSettings.topic}
                onChange={(e) =>
                  onScriptSettingsChange({
                    ...scriptSettings,
                    topic: e.target.value,
                  })
                }
                disabled={isGeneratingScript}
                className="flex-1 bg-transparent text-white placeholder-gray-400 text-lg outline-none disabled:cursor-not-allowed"
                placeholder="write script for"
              />

              <select
                value={scriptSettings.tone}
                onChange={(e) =>
                  onScriptSettingsChange({
                    ...scriptSettings,
                    tone: e.target.value as ScriptSettings["tone"],
                  })
                }
                disabled={isGeneratingScript}
                className="bg-transparent text-white text-lg outline-none cursor-pointer disabled:cursor-not-allowed"
              >
                <option value="casual" className="bg-gray-800">
                  Casual
                </option>
                <option value="professional" className="bg-gray-800">
                  Professional
                </option>
                <option value="enthusiastic" className="bg-gray-800">
                  Enthusiastic
                </option>
                <option value="informative" className="bg-gray-800">
                  Informative
                </option>
              </select>

              <button
                onClick={onGenerateScript}
                disabled={!scriptSettings.topic.trim() || isGeneratingScript}
                className="w-12 h-12 bg-gradient-button hover:bg-gradient-button-hover rotate-90  disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all"
              >
                {isGeneratingScript ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Edit existing script */}
        </div>
      </div>
    </div>
  );
}
