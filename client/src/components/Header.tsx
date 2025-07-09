import React, { useState } from 'react';
import { ChevronDown, Video, FileText } from 'lucide-react';
import VideoList from './VideoList';

interface HeaderProps {
  scrollSpeed: number;
  onSpeedChange: (speed: number) => void;
  onScriptClick: () => void;
}

export default function Header({ scrollSpeed, onSpeedChange, onScriptClick }: HeaderProps) {
  const [isVideoListOpen, setIsVideoListOpen] = useState(false);

  const changeSpeed = (direction: 'increase' | 'decrease') => {
    const newSpeed = direction === 'increase'
      ? Math.min(100, scrollSpeed + 2) // Reduced max speed and smaller increments
      : Math.max(5, scrollSpeed - 2);   // Lower minimum speed
    onSpeedChange(newSpeed);
  };



  return (
    <header className="flex items-center z-50 transition-all max-w-7xl mx-auto duration-300  py-2  justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className=" flex items-center justify-center ">
          <img src='/AI_Main_Banner.png' alt="AI District Logo" className="w-auto h-12" />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Script Button */}
        <button
          onClick={onScriptClick}
          className="bg-gray-800 px-4 py-2 rounded-full text-white flex items-center gap-2 hover:bg-gray-700 transition-all shadow-lg"
        >
          <FileText className="w-4 h-4" />
          <span>Script</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Videos Button */}
        <button
          onClick={() => setIsVideoListOpen(true)}
          className="bg-gradient-button px-4 py-2 rounded-full text-white flex items-center gap-2 hover:bg-gradient-button-hover transition-all shadow-lg"
        >
          <Video className="w-4 h-4" />
          <span>Videos</span>
        </button>

     

        {/* Speed Control */}
        <div className="flex items-center gap-4">
          <span className="text-white font-semibold ">Speed</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeSpeed('decrease')}
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-all"
            >
              <span className="text-lg font-bold">−</span>
            </button>

            <div className="w-32  bg-gray-300 rounded-full h-2 relative">
              <input
                type="range"
                min="5"
                max="100"
                value={scrollSpeed}
                onChange={(e) => onSpeedChange(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${(scrollSpeed - 5) / 95 * 100}%` }}
              ></div>
              <div
                className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border border-gray-300"
                style={{ left: `${(scrollSpeed - 5) / 95 * 100}%`, marginLeft: '-8px' }}
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