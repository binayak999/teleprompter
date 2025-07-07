import React, { useState } from 'react';
import { ChevronDown, Video, Bug } from 'lucide-react';
import VideoList from './VideoList';
import { api } from '../services/api';

interface HeaderProps {
  scrollSpeed: number;
  onSpeedChange: (speed: number) => void;
  onScriptClick: () => void;
}

export default function Header({ scrollSpeed, onSpeedChange, onScriptClick }: HeaderProps) {
  const [isVideoListOpen, setIsVideoListOpen] = useState(false);

  const changeSpeed = (direction: 'increase' | 'decrease') => {
    const newSpeed = direction === 'increase'
      ? Math.min(200, scrollSpeed + 5)
      : Math.max(10, scrollSpeed - 5);
    onSpeedChange(newSpeed);
  };

  const handleDebugSession = async () => {
    try {
      const debugInfo = await api.debugSession();
      console.log('Debug session info:', debugInfo);
      alert('Check console for session debug info');
    } catch (error) {
      console.error('Debug session error:', error);
      alert('Debug session failed - check console');
    }
  };

  return (
    <header className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
          <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
        </div>
        <span className="text-gray-800 font-medium">AI District</span>
        <span className="text-gray-600 text-sm">HUMAN & AI LIVE</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Script Button */}
        <button
          onClick={onScriptClick}
          className="bg-gray-800 px-4 py-2 rounded-full text-white flex items-center gap-2 hover:bg-gray-700 transition-all shadow-lg"
        >
          <span>Script</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Videos Button */}
        <button
          onClick={() => setIsVideoListOpen(true)}
          className="bg-pink-500 px-4 py-2 rounded-full text-white flex items-center gap-2 hover:bg-pink-600 transition-all shadow-lg"
        >
          <Video className="w-4 h-4" />
          <span>Videos</span>
        </button>

     

        {/* Speed Control */}
        <div className="flex items-center gap-4">
          <span className="text-gray-800 font-medium">Speed</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeSpeed('decrease')}
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-all"
            >
              <span className="text-lg font-bold">−</span>
            </button>

            <div className="w-32 bg-gray-300 rounded-full h-2 relative">
              <input
                type="range"
                min="10"
                max="200"
                value={scrollSpeed}
                onChange={(e) => onSpeedChange(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${(scrollSpeed - 10) / 190 * 100}%` }}
              ></div>
              <div
                className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border border-gray-300"
                style={{ left: `${(scrollSpeed - 10) / 190 * 100}%`, marginLeft: '-8px' }}
              ></div>
            </div>

            <button
              onClick={() => changeSpeed('increase')}
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-all"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Video List Modal */}
      <VideoList 
        isOpen={isVideoListOpen} 
        onClose={() => setIsVideoListOpen(false)} 
      />
    </header>
  );
} 