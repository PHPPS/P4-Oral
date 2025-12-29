
import React from 'react';

interface HeaderProps {
  onShowHistoryClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onShowHistoryClick }) => {
  return (
    <header className="relative text-center bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-blue-600">
        看图说话练习
      </h1>
      <p className="mt-2 text-md sm:text-lg text-gray-600">
        新加坡小学三 / 四年级适用 (For Singapore Primary 3/4 Students)
      </p>
      <button 
        onClick={onShowHistoryClick}
        className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 font-semibold rounded-full shadow-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
        aria-label="查看练习历史"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        <span className="hidden sm:inline">练习历史</span>
      </button>
    </header>
  );
};
