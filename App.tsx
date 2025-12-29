import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageDisplay } from './components/ImageDisplay';
import { GuidingQuestions } from './components/GuidingQuestions';
import { AudioRecorder } from './components/AudioRecorder';
import { generatePictureAndQuestions, generateQuestionsForImage } from './services/geminiService';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Tips } from './components/Tips';
import { LookSee } from './components/LookSee';
import { PastSessionsModal } from './components/PastSessionsModal';
import { getSessions } from './services/storageService';
import { createVideoFromImageAndText } from './services/videoService';
import type { PracticeSession } from './types';
import type { Difficulty } from './services/geminiService';

const DifficultySelector: React.FC<{
  currentDifficulty: Difficulty;
  onSelectDifficulty: (level: Difficulty) => void;
  disabled?: boolean;
}> = ({ currentDifficulty, onSelectDifficulty, disabled }) => {
    const difficulties: { level: Difficulty; label: string; baseColor: string; hoverColor: string; }[] = [
        { level: 'Easy', label: '简单', baseColor: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
        { level: 'Medium', label: '中等', baseColor: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
        { level: 'Hard', label: '困难', baseColor: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
    ];

    return (
        <div className="flex justify-center gap-3" role="group" aria-label="Difficulty level">
        {difficulties.map(({ level, label, baseColor, hoverColor }) => (
            <button
                key={level}
                onClick={() => onSelectDifficulty(level)}
                disabled={disabled}
                className={`px-5 py-2 text-md font-bold rounded-full transition-all duration-300 transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    ${currentDifficulty === level
                        ? `${baseColor} text-white ring-2 ring-offset-2 ring-white`
                        : `bg-gray-200 text-gray-700 hover:bg-gray-300`
                    }
                `}
                aria-pressed={currentDifficulty === level}
            >
                {label}
            </button>
        ))}
        </div>
    );
};


const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [guidingQuestions, setGuidingQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [showSessionsModal, setShowSessionsModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleSessionUpdate = () => {
    setSessions(getSessions());
  };

  // Clean up blob URL on unmount or when imageUrl changes
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleGenerateContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setImageUrl(null); // Clear previous image to show loader
    setImageBase64(null);
    setImageMimeType(null);
    setGuidingQuestions([]);
    if (!hasStarted) setHasStarted(true);

    try {
      const result = await generatePictureAndQuestions(difficulty);
      setImageUrl(result.imageUrl);
      setImageBase64(result.base64Image);
      setImageMimeType(result.mimeType);
      setGuidingQuestions(result.questions);
    } catch (err) {
      console.error(err);
      setError('生成内容时出现问题，请稍后再试。');
    } finally {
      setIsLoading(false);
    }
  }, [hasStarted, difficulty]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!hasStarted) setHasStarted(true);
    
    if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
    }
    
    setImageUrl(URL.createObjectURL(file));
    setGuidingQuestions([]);
    setIsLoading(true); // Shows loading state in questions component
    setError(null);

    try {
        const { base64, mimeType, questions } = await generateQuestionsForImage(file, difficulty);
        setImageBase64(base64);
        setImageMimeType(mimeType);
        setGuidingQuestions(questions);
    } catch (err) {
        console.error(err);
        setError('根据您的图片生成问题时出现问题，请稍后再试。');
        setImageUrl(null); // Clear image on error
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleExport = useCallback(async () => {
    if (!imageUrl || guidingQuestions.length === 0) {
        setError("没有图片或问题可供导出。");
        return;
    }
    setIsExporting(true);
    setError(null);
    try {
        await createVideoFromImageAndText(imageUrl, guidingQuestions);
    } catch (err) {
        console.error("Failed to export video", err);
        const errorMessage = err instanceof Error ? err.message : '请稍后再试。';
        setError(`导出视频失败: ${errorMessage}`);
    } finally {
        setIsExporting(false);
    }
  }, [imageUrl, guidingQuestions]);


  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
      />
      {showSessionsModal && (
        <PastSessionsModal 
            sessions={sessions}
            onClose={() => setShowSessionsModal(false)}
            onSessionsUpdate={handleSessionUpdate}
        />
      )}
      <div className="w-full max-w-6xl mx-auto">
        <Header onShowHistoryClick={() => setShowSessionsModal(true)} />
        <main className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col space-y-6">
              <ImageDisplay imageUrl={imageUrl} isLoading={isLoading} hasStarted={hasStarted} />
              {!hasStarted && <WelcomeScreen onGenerateClick={handleGenerateContent} onUploadClick={handleUploadClick} difficulty={difficulty} onDifficultyChange={setDifficulty} />}
            </div>
            <div className="flex flex-col space-y-6 bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              {hasStarted && <Tips />}
              {hasStarted && (
                <LookSee 
                    imageBase64={imageBase64}
                    imageMimeType={imageMimeType}
                    difficulty={difficulty}
                    disabled={isLoading || isExporting}
                />
              )}
              <GuidingQuestions questions={guidingQuestions} isLoading={isLoading} />
              <div className="border-t border-gray-200 pt-6">
                 <AudioRecorder 
                    disabled={!hasStarted || isLoading || isExporting} 
                    questions={guidingQuestions} 
                    imageBase64={imageBase64}
                    imageMimeType={imageMimeType}
                    onSessionSaved={handleSessionUpdate}
                    difficulty={difficulty}
                 />
              </div>
            </div>
          </div>
          {hasStarted && (
            <div className="mt-8 text-center flex flex-col justify-center items-center gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">更改下次生成的难度</h3>
                     <DifficultySelector
                        currentDifficulty={difficulty}
                        onSelectDifficulty={setDifficulty}
                        disabled={isLoading || isExporting}
                    />
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 w-full">
                    <button
                    onClick={handleGenerateContent}
                    disabled={isLoading || isExporting}
                    className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform transform hover:scale-105 disabled:bg-blue-400 disabled:cursor-not-allowed disabled:transform-none"
                    >
                    {isLoading ? '正在生成...' : '换一张AI图'}
                    </button>
                    <button
                    onClick={handleUploadClick}
                    disabled={isLoading || isExporting}
                    className="w-full sm:w-auto px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-transform transform hover:scale-105 disabled:bg-green-400 disabled:cursor-not-allowed disabled:transform-none"
                    >
                    上传我的图片
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isLoading || isExporting || !imageUrl || guidingQuestions.length === 0}
                        className="w-full sm:w-auto px-8 py-4 bg-purple-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-transform transform hover:scale-105 disabled:bg-purple-400 disabled:cursor-not-allowed disabled:transform-none"
                        aria-live="polite"
                    >
                        {isExporting ? '正在导出...' : '导出为视频'}
                    </button>
                </div>
            </div>
           )}
          {error && <p className="mt-4 text-center text-red-500">{error}</p>}
        </main>
      </div>
    </div>
  );
};

export default App;