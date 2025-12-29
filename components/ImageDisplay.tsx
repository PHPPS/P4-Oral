
import React from 'react';

interface ImageDisplayProps {
  imageUrl: string | null;
  isLoading: boolean;
  hasStarted: boolean;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageUrl, isLoading, hasStarted }) => {
  return (
    <div className="relative w-full aspect-video bg-gray-200 rounded-2xl shadow-lg overflow-hidden border-4 border-white flex items-center justify-center">
      {isLoading && !imageUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10 animate-pulse">
          <svg className="w-16 h-16 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          <p className="mt-4 text-lg font-semibold text-gray-700">AI 正在努力画画中...</p>
        </div>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Generated scene for picture talk"
          className="w-full h-full object-contain transition-opacity duration-500"
        />
      )}
    </div>
  );
};
