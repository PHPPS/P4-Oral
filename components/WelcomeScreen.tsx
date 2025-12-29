import React from 'react';
import type { Difficulty } from '../services/geminiService';

interface WelcomeScreenProps {
    onGenerateClick: () => void;
    onUploadClick: () => void;
    difficulty: Difficulty;
    onDifficultyChange: (level: Difficulty) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGenerateClick, onUploadClick, difficulty, onDifficultyChange }) => {
    const difficulties: { level: Difficulty; label: string; baseColor: string; hoverColor: string; }[] = [
        { level: 'Easy', label: '简单', baseColor: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
        { level: 'Medium', label: '中等', baseColor: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
        { level: 'Hard', label: '困难', baseColor: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
    ];
  
  return (
    <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800">欢迎来到“看图说话”练习！</h2>
      <p className="mt-4 text-gray-600">
        首先，请选择一个难度等级，然后开始你的口语练习。
      </p>

      <div className="my-6">
        <div className="flex justify-center gap-3" role="group" aria-label="Difficulty level">
            {difficulties.map(({ level, label, baseColor }) => (
                <button
                    key={level}
                    onClick={() => onDifficultyChange(level)}
                    className={`px-5 py-2 text-md font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-md
                        ${difficulty === level
                            ? `${baseColor} text-white ring-2 ring-offset-2 ring-white`
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }
                    `}
                    aria-pressed={difficulty === level}
                >
                    {label}
                </button>
            ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={onGenerateClick}
          className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform transform hover:scale-105"
        >
          使用 AI 图片
        </button>
        <button
          onClick={onUploadClick}
          className="px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-transform transform hover:scale-105"
        >
          上传我的图片
        </button>
      </div>
    </div>
  );
};