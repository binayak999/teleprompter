import { useState } from 'react';
import type { ScriptSettings } from '../types';
import { api } from '../services/api';

export function useScript() {
  const [script, setScript] = useState<string>('Our source, who prefers to remain anonymous, stated that the mines had some sort of on-going operational challenges that needed immediate attention from the management team. The situation required careful coordination between multiple departments to ensure safety protocols were maintained while addressing the technical issues that had emerged during the routine inspection process.');
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
      // Use the non-streaming API to get script ID
      const response = await api.generateScript(
        scriptSettings.topic,
        scriptSettings.duration,
        scriptSettings.tone
      );
      
      setScript(response.script);
      setCurrentScriptId(response.scriptId || '');
      setIsGeneratingScript(false);
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