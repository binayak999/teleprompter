import React from 'react';
import type { ScriptSettings } from '../types';

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
  onGenerateScript
}: ScriptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/5 bg-opacity-70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl p-8 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-white">Script</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all"
          >
            <span className="text-white text-lg">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="text-center mb-12">
          <div className="space-y-4">
            <div className="border-t border-gray-700 pt-6">
              <textarea
                value={script}
                onChange={(e) => onScriptChange(e.target.value)}
                className="w-full p-4 bg-gray-800 border border-gray-600 rounded-lg text-white h-48 resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent leading-relaxed"
                placeholder={isGeneratingScript ? "Generating script... (you can still edit)" : "Your script will appear here..."}
                disabled={false}
                onKeyDown={(e) => {
                  // Allow all key inputs including space, backspace, etc.
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const target = e.target as HTMLTextAreaElement;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const newValue = script.substring(0, start) + '    ' + script.substring(end);
                    onScriptChange(newValue);
                    // Set cursor position after the tab
                    setTimeout(() => {
                      target.selectionStart = target.selectionEnd = start + 4;
                    }, 0);
                  }
                }}
                style={{ 
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              />
              {isGeneratingScript && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-pink-400 text-sm">Generating script...</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Script Generation Input */}
        <div className="space-y-6">
          <div className={`flex items-center gap-4 bg-gray-800 rounded-full p-4 ${isGeneratingScript ? 'opacity-50' : ''}`}>
            <div className="text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>

            <input
              type="text"
              value={scriptSettings.topic}
              onChange={(e) => onScriptSettingsChange({ ...scriptSettings, topic: e.target.value })}
              disabled={isGeneratingScript}
              className="flex-1 bg-transparent text-white placeholder-gray-400 text-lg outline-none disabled:cursor-not-allowed"
              placeholder="write script for"
            />

            <select
              value={scriptSettings.tone}
              onChange={(e) => onScriptSettingsChange({ ...scriptSettings, tone: e.target.value as ScriptSettings['tone'] })}
              disabled={isGeneratingScript}
              className="bg-transparent text-white text-lg outline-none cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="casual" className="bg-gray-800">Casual</option>
              <option value="professional" className="bg-gray-800">Professional</option>
              <option value="enthusiastic" className="bg-gray-800">Enthusiastic</option>
              <option value="informative" className="bg-gray-800">Informative</option>
            </select>

            <button
              onClick={onGenerateScript}
              disabled={!scriptSettings.topic.trim() || isGeneratingScript}
              className="w-12 h-12 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all"
            >
              {isGeneratingScript ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>

          {/* Duration Setting */}
          <div className="flex items-center justify-center gap-4">
            <span className="text-gray-400">Duration:</span>
            <select
              value={scriptSettings.duration}
              onChange={(e) => onScriptSettingsChange({ ...scriptSettings, duration: parseInt(e.target.value) })}
              disabled={isGeneratingScript}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={1}>1 minute</option>
              <option value={2}>2 minutes</option>
              <option value={3}>3 minutes</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
            </select>
          </div>

          {/* Edit existing script */}
         
        </div>
      </div>
    </div>
  );
} 