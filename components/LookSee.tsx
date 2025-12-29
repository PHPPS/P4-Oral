import React, { useState, useEffect } from 'react';
import { getVocabularyForImage } from '../services/geminiService';
import type { VocabularyItem, Difficulty } from '../services/geminiService';

interface LookSeeProps {
    imageBase64: string | null;
    imageMimeType: string | null;
    difficulty: Difficulty;
    disabled: boolean;
}

const SpeakerIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6 8a1 1 0 00-1 1v2a1 1 0 001 1h1.586l2.707 2.707A1 1 0 0012 14V6a1 1 0 00-1.707-.707L7.586 8H6zM14.5 10a4.5 4.5 0 10-9 0 4.5 4.5 0 009 0z" />
    </svg>
);

export const LookSee: React.FC<LookSeeProps> = ({ imageBase64, imageMimeType, difficulty, disabled }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<VocabularyItem[] | null>(null);
    
    useEffect(() => {
        // Reset when a new image is loaded
        setData(null);
        setError(null);
        setIsExpanded(false); // Collapse on new image
    }, [imageBase64]);
    
    useEffect(() => {
        // Cleanup speech synthesis on unmount
        return () => {
            if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const handleFetch = async () => {
        if (!imageBase64 || !imageMimeType) return;
        
        setIsLoading(true);
        setError(null);
        setData(null);
        
        try {
            const result = await getVocabularyForImage(imageBase64, imageMimeType, difficulty);
            setData(result);
            if (!isExpanded) setIsExpanded(true); // Expand when data is loaded
        } catch (err) {
            console.error(err);
            setError('无法获取图片词汇，请稍后再试。');
        } finally {
            setIsLoading(false);
        }
    };
    
    const speakText = (text: string) => {
      if ('speechSynthesis' in window && text) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'zh-CN';
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
      }
    };

    return (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl shadow-sm">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-left p-4 flex justify-between items-center"
                aria-expanded={isExpanded}
                aria-controls="looksee-content"
                disabled={!data && disabled}
            >
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    看一看
                </h2>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isExpanded && (
                <div id="looksee-content" className="p-4 pt-0 text-gray-700">
                    {!data && !isLoading && (
                         <div className="text-center py-4">
                             <p className="mb-4 text-gray-600">点击按钮，AI会帮你找出图里的重点词汇和例句。</p>
                             <button onClick={handleFetch} disabled={disabled} className="px-5 py-2 bg-purple-600 text-white font-semibold rounded-full shadow-md hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-not-allowed">
                                 获取图片词汇
                             </button>
                         </div>
                    )}
                    {isLoading && (
                        <div className="flex justify-center items-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <p className="ml-3 text-purple-700">正在努力看图中...</p>
                        </div>
                    )}
                    {error && <p className="text-center text-red-500 py-4">{error}</p>}
                    {data && data.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {data.map((item, index) => (
                                <div key={index} className="bg-white p-4 rounded-lg shadow border border-purple-100 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-baseline gap-3">
                                            <h4 className="text-2xl font-bold text-purple-800">{item.word}</h4>
                                            <p className="text-md text-gray-500">{item.pinyin}</p>
                                        </div>
                                        <button 
                                            onClick={() => speakText(item.word)} 
                                            className="p-2 rounded-full hover:bg-purple-100 transition-colors"
                                            aria-label={`朗读词语: ${item.word}`}
                                        >
                                            <SpeakerIcon />
                                        </button>
                                    </div>
                                    <p className="text-sm font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full inline-block">{item.type}</p>
                                    <div className="flex justify-between items-center pt-2">
                                        <p className="flex-grow text-gray-700 text-sm italic">“{item.sentence}”</p>
                                        <button 
                                            onClick={() => speakText(item.sentence)} 
                                            className="flex-shrink-0 p-2 rounded-full hover:bg-purple-100 transition-colors"
                                            aria-label={`朗读例句: ${item.sentence}`}
                                        >
                                            <SpeakerIcon />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {data && data.length === 0 && !isLoading && (
                        <p className="text-center text-gray-500 py-4">未能从图片中提取到重点词汇。</p>
                    )}
                </div>
            )}
        </div>
    );
};
