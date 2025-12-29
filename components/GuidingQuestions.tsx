import React, { useEffect } from 'react';

interface GuidingQuestionsProps {
  questions: string[];
  isLoading: boolean;
}

export const GuidingQuestions: React.FC<GuidingQuestionsProps> = ({ questions, isLoading }) => {
  const speakText = (text: string) => {
      if ('speechSynthesis' in window && text) {
          window.speechSynthesis.cancel(); // Stop any previous speech
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'zh-CN';
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
      }
  };

  useEffect(() => {
    // Cleanup function to stop any speech when the component unmounts
    return () => {
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    };
  }, []);

  const SpeakerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-600" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6 8a1 1 0 00-1 1v2a1 1 0 001 1h1.586l2.707 2.707A1 1 0 0012 14V6a1 1 0 00-1.707-.707L7.586 8H6zM14.5 10a4.5 4.5 0 10-9 0 4.5 4.5 0 009 0z" />
    </svg>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0110 5a3 3 0 012.598 4.5H13a1 1 0 110 2h-1.402A3.001 3.001 0 017 10a1 1 0 112 0 1 1 0 001 1h.098a1.001 1.001 0 00.867-.5 1 1 0 111.731 1A3 3 0 0110 15a3 3 0 01-2.598-4.5H6a1 1 0 110-2h1.402A3.001 3.001 0 0110 7z" clipRule="evenodd" />
        </svg>
        引导问题
      </h2>
      <div className="space-y-3 text-lg text-gray-700">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="w-full h-6 bg-gray-200 rounded-lg animate-pulse"></div>
          ))
        ) : questions.length > 0 ? (
          <ul className="list-none space-y-3">
            {questions.map((q, index) => (
              <li key={index} className="p-3 bg-sky-50 rounded-lg border-l-4 border-sky-300 flex items-center justify-between gap-2">
                <span className="flex-grow">{q}</span>
                <button
                    onClick={() => speakText(q)}
                    className="flex-shrink-0 p-2 rounded-full hover:bg-sky-200 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400"
                    title="朗读问题"
                    aria-label={`朗读问题: ${q}`}
                >
                    <SpeakerIcon />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">这里会显示引导问题来帮助你开始。</p>
        )}
      </div>
    </div>
  );
};