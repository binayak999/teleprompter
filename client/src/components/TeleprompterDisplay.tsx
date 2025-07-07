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
      // Scroll to top before starting
      containerRef.current.scrollTop = 0;
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
        className="bg-white rounded-md p-6 px-7 shadow-xl max-w-7xl mx-auto overflow-hidden relative"
        style={{ height: '150px', overflowY: 'auto' }}
      >
        <div className="text-gray-900 text-4xl leading-relaxed font-semibold select-none text-center">
          {script}
        </div>
      </div>
    </div>
  );
} 