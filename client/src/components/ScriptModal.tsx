import React, { useEffect, useRef, useState } from "react";
import type { ScriptSettings } from "../types";
import { WandSparklesIcon, History, Trash2 } from "lucide-react";
import { api, type Script } from "../services/api";

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
  onScriptChange: (script: string) => void;
  scriptSettings: ScriptSettings;
  onScriptSettingsChange: (settings: ScriptSettings) => void;
  isGeneratingScript: boolean;
  onGenerateScript: () => void;
  currentScriptId?: string;
  onScriptIdChange?: (scriptId: string) => void;
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
  currentScriptId,
  onScriptIdChange,
}: ScriptModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [scriptHistory, setScriptHistory] = useState<Script[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState<string | undefined>(currentScriptId);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadScriptHistory();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (script.length > 0) {
      textAreaRef.current?.scrollBy(0, textAreaRef.current.scrollHeight);
    }
  }, [script.length]);

  const loadScriptHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.getUserScripts(1, 50);
      setScriptHistory(response.scripts);
    } catch (error) {
      console.error('Failed to load script history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleScriptSelect = async (scriptId: string) => {
    try {
      console.log('Selecting script from history - Script ID:', scriptId);
      const selectedScript = await api.getScriptById(scriptId);
      onScriptChange(selectedScript.content || '');
      onScriptSettingsChange({
        topic: selectedScript.topic,
        duration: selectedScript.duration,
        tone: selectedScript.tone,
      });
      setSelectedScriptId(scriptId);
      if (onScriptIdChange) {
        console.log('Setting current script ID to:', scriptId);
        onScriptIdChange(scriptId);
      }
      setActiveTab('editor');
    } catch (error) {
      console.error('Failed to load script:', error);
    }
  };

  const handleDeleteScript = async (scriptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this script?')) {
      try {
        await api.deleteScript(scriptId);
        await loadScriptHistory();
        if (selectedScriptId === scriptId) {
          setSelectedScriptId(undefined);
          if (onScriptIdChange) {
            onScriptIdChange('');
          }
        }
      } catch (error) {
        console.error('Failed to delete script:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/5 bg-opacity-70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/95 rounded-2xl w-full max-w-4xl max-h-[90vh] relative flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center p-5 py-4 justify-between">
          <h2 className="text-base font-semibold text-white">Script</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all"
          >
            <span className="text-white text-lg">×</span>
          </button>
        </div>
        <div className="h-px w-full bg-gray-700" />

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'editor'
                ? 'text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History size={16} />
            History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'editor' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 px-4 py-2">
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
              <div className="space-y-6 pt-3 p-5">
                <div
                  className={`flex relative items-center gap-4 w-full rounded-full p-[2px] bg-gradient-to-tr from-purple-700 to-pink-400 ${
                    isGeneratingScript ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 bg-gray-800 rounded-full pr-1 p-4 py-1 w-full">
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
                      className="w-12 h-12 bg-gradient-button hover:bg-gradient-button-hover rotate-90 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all"
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
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="h-full overflow-y-auto p-4">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : scriptHistory.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <History size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No scripts found</p>
                  <p className="text-sm">Generate your first script to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scriptHistory.map((scriptItem) => (
                    <div
                      key={scriptItem.scriptId}
                      onClick={() => handleScriptSelect(scriptItem.scriptId)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-gray-800 ${
                        selectedScriptId === scriptItem.scriptId
                          ? 'border-purple-500 bg-gray-800'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-1">
                            {scriptItem.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-2">
                            {scriptItem.topic} • {scriptItem.duration}min • {scriptItem.tone}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {new Date(scriptItem.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteScript(scriptItem.scriptId, e)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
