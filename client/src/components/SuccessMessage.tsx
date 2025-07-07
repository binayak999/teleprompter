import React from 'react';

interface SuccessMessageProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function SuccessMessage({ isVisible, onClose }: SuccessMessageProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="font-medium">Video uploaded to server and downloaded locally!</span>
      <button
        onClick={onClose}
        className="ml-2 hover:bg-green-600 rounded-full p-1 transition-colors"
      >
        <span className="text-sm">×</span>
      </button>
    </div>
  );
} 