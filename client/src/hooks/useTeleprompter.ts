import { useState, useRef, useCallback, useEffect } from 'react';

interface TeleprompterState {
  isScrolling: boolean;
  scrollPosition: number;
}

export function useTeleprompter(scrollSpeed: number = 50) {
  const [state, setState] = useState<TeleprompterState>({
    isScrolling: false,
    scrollPosition: 0
  });

  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const startScrolling = useCallback(() => {
    if (state.isScrolling) return;

    setState(prev => ({ ...prev, isScrolling: true }));
    
    scrollIntervalRef.current = setInterval(() => {
      if (containerRef.current) {
        const newScrollTop = containerRef.current.scrollTop + scrollSpeed / 60;
        containerRef.current.scrollTop = newScrollTop;
        
        setState(prev => ({ ...prev, scrollPosition: newScrollTop }));
        
        // Check if we've reached the bottom
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          // Auto-stop when reaching the end
          stopScrolling();
        }
      }
    }, 16); // ~60fps
  }, [state.isScrolling, scrollSpeed]);

  const stopScrolling = useCallback(() => {
    setState(prev => ({ ...prev, isScrolling: false }));
    
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const resetScroll = useCallback(() => {
    stopScrolling();
    
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    
    setState(prev => ({ ...prev, scrollPosition: 0 }));
  }, [stopScrolling]);

  const jumpToPosition = useCallback((position: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = position;
      setState(prev => ({ ...prev, scrollPosition: position }));
    }
  }, []);

  const toggleScrolling = useCallback(() => {
    if (state.isScrolling) {
      stopScrolling();
    } else {
      startScrolling();
    }
  }, [state.isScrolling, startScrolling, stopScrolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // Update scroll speed when it changes
  useEffect(() => {
    if (state.isScrolling) {
      stopScrolling();
      startScrolling();
    }
  }, [scrollSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    containerRef,
    startScrolling,
    stopScrolling,
    resetScroll,
    jumpToPosition,
    toggleScrolling
  };
}