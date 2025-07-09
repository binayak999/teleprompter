import { useState } from 'react';
import type { ScriptSettings } from '../types';
import { api } from '../services/api';

export function useScript() {
  const [script, setScript] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptSettings, setScriptSettings] = useState<ScriptSettings>({
    topic: '',
    duration: 2,
    tone: 'professional'
  });
  const [currentScriptId, setCurrentScriptId] = useState<string>('');

  const generateScript = async () => {
    if (!scriptSettings.topic) return;

    setIsGeneratingScript(true);
    setScript(''); // Clear previous script
    
    try {
      // Use the streaming API for better user experience
      await api.generateScriptStream(
        scriptSettings.topic,
        scriptSettings.duration,
        scriptSettings.tone,
        // onChunk - append new content to script
        (content: string) => {
          setScript(prev => prev + content);
        },
        // onStatus - show status messages (optional)
        (message: string) => {
          console.log('Script generation status:', message);
        },
        // onComplete - final script is ready with script ID
        (fullScript: string, scriptId: string, title: string) => {
          console.log('Script generation completed - Script ID:', scriptId);
          console.log('Script generation completed - Title:', title);
          setScript(fullScript);
          setCurrentScriptId(scriptId);
          setIsGeneratingScript(false);
        },
        // onError - handle errors
        (error: string) => {
          console.error('Script generation failed:', error);
          alert(`Failed to generate script: ${error}`);
          setIsGeneratingScript(false);
        }
      );
    } catch (error) {
      console.error('Script generation failed:', error);
      alert('Failed to generate script. Please try again.');
      setIsGeneratingScript(false);
    }
  };

  return {
    script,
    setScript,
    isGeneratingScript,
    scriptSettings,
    setScriptSettings,
    generateScript,
    currentScriptId,
    setCurrentScriptId
  };
} 