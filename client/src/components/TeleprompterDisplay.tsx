import React, { useRef, useEffect } from 'react';

interface TeleprompterDisplayProps {
  script: string;
  isScrolling: boolean;
  scrollSpeed: number;
}

export default function TeleprompterDisplay({ script, isScrolling, scrollSpeed }: TeleprompterDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // Teleprompter scrolling
  useEffect(() => {
    if (isScrolling && containerRef.current) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop += scrollSpeed / 10;
          if (containerRef.current.scrollTop >= containerRef.current.scrollHeight - containerRef.current.clientHeight) {
            // Stop scrolling when reaching the end
            return;
          }
        }
      }, 100);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isScrolling, scrollSpeed]);

  return (
    <div className="mb-4">
      <div
        ref={containerRef}
        className="bg-white rounded-2xl p-6 shadow-xl max-w-7xl mx-auto overflow-hidden relative"
        style={{ height: '200px', overflowY: 'auto' }}
      >
        <div className="text-gray-900 text-2xl leading-relaxed font-medium select-none text-center">
          {script}
        </div>
      </div>
    </div>
  );
} 