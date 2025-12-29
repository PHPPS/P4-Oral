
import React, { useState, useMemo, useCallback } from 'react';
import type { PracticeSession } from '../types';
import { deleteSession } from '../services/storageService';

interface PastSessionsModalProps {
    sessions: PracticeSession[];
    onClose: () => void;
    onSessionsUpdate: () => void;
}

const SpeakerIcon: React.FC<{className?: string}> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M6 8a1 1 0 00-1 1v2a1 1 0 001 1h1.586l2.707 2.707A1 1 0 0012 14V6a1 1 0 00-1.707-.707L7.586 8H6zM14.5 10a4.5 4.5 0 10-9 0 4.5 4.5 0 009 0z" />
    </svg>
);

const StopIconSmall = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 8a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1V8z" clipRule="evenodd" />
    </svg>
);

const SessionDetailView: React.FC<{ session: PracticeSession, onBack: () => void }> = ({ session, onBack }) => {
    const [isSpeakingSample, setIsSpeakingSample] = useState(false);
    
    const imageUrl = `data:${session.imageMimeType};base64,${session.imageBase64}`;
    const audioUrl = useMemo(() => {
        if (session.audioBase64 && session.audioMimeType) {
            const byteCharacters = atob(session.audioBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: session.audioMimeType});
            return URL.createObjectURL(blob);
        }
        return null;
    }, [session.audioBase64, session.audioMimeType]);
    
    React.useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            window.speechSynthesis.cancel();
        };
    }, [audioUrl]);
    
    const speakText = (text: string) => {
      if ('speechSynthesis' in window && text) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'zh-CN';
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
      }
    };

    const handleSpeakSample = (text: string) => {
        if (isSpeakingSample) {
            window.speechSynthesis.cancel();
            setIsSpeakingSample(false);
        } else {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.9;
            utterance.onend = () => setIsSpeakingSample(false);
            utterance.onerror = () => setIsSpeakingSample(false);
            setIsSpeakingSample(true);
            window.speechSynthesis.speak(utterance);
        }
    };

    const highlightSpecialPhrases = useCallback((text: string) => {
        const phrases = ["这幅图描绘的是", "总的来说"];
        const regex = new RegExp(`(${phrases.join('|')})`, 'g');
        const parts = text.split(regex);
        return parts.map((part, i) => {
          if (phrases.includes(part)) {
            return <span key={i} className="text-red-600 text-2xl font-bold">{part}</span>;
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        });
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
                 <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-full shadow-sm hover:bg-gray-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    返回列表
                </button>
                <h2 className="text-2xl font-bold text-gray-800">练习详情</h2>
                <div className="w-28 text-right"> {/* Spacer */} </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <img src={imageUrl} alt="Practice scene" className="rounded-lg shadow-md w-full object-contain" />
                    {audioUrl && (
                         <div>
                            <h3 className="text-lg font-bold text-gray-700 mb-2">我的录音</h3>
                            <audio src={audioUrl} controls className="w-full" />
                         </div>
                    )}
                </div>
                <div className="space-y-4">
                    <div className="p-4 bg-sky-50 border-l-4 border-sky-400 rounded-r-lg">
                        <h3 className="text-lg font-bold text-sky-800 flex justify-between items-center">
                           <span>引导问题</span>
                           <button onClick={() => speakText(session.questions.join('。 '))} className="flex items-center gap-1 px-3 py-1 bg-sky-100 text-sky-800 font-bold rounded-full hover:bg-sky-200 text-sm" title="朗读所有问题" aria-label="朗读所有引导问题">
                               朗读 <SpeakerIcon className="h-5 w-5 text-sky-600"/>
                           </button>
                        </h3>
                        <ul className="mt-2 space-y-2">
                        {session.questions.map((q, i) => (
                            <li key={i} className="text-gray-800">
                               {q}
                            </li>
                        ))}
                        </ul>
                    </div>
                    {session.transcription && (
                        <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                           <h3 className="text-lg font-bold text-amber-800">文字稿</h3>
                           <p className="mt-2 text-gray-800 whitespace-pre-wrap">{session.transcription}</p>
                           {session.pinyin && (
                            <p className="mt-2 text-gray-500 whitespace-pre-wrap">{session.pinyin}</p>
                           )}
                        </div>
                    )}
                    {session.grammarFeedback && session.grammarFeedback.corrections.length > 0 && (
                         <div className="p-4 bg-rose-50 border-l-4 border-rose-400 rounded-r-lg">
                             <h3 className="text-lg font-bold text-rose-800">语法与词汇分析</h3>
                             <ul className="mt-2 space-y-2 list-none">
                                {session.grammarFeedback.corrections.map((item, index) => (
                                    <li key={index}>
                                        <p className="text-gray-600">原文: <span className="line-through text-red-600">{item.original}</span></p>
                                        <p className="text-gray-800">建议: <span className="font-semibold text-green-700">{item.corrected}</span></p>
                                        <p className="text-sm text-gray-500 mt-1">说明: {item.explanation}</p>
                                    </li>
                                ))}
                            </ul>
                         </div>
                    )}
                     {session.feedback && (
                        <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
                           <h3 className="text-lg font-bold text-green-800">AI 老师反馈</h3>
                           <p className="mt-2 text-gray-800 whitespace-pre-wrap">{session.feedback}</p>
                        </div>
                    )}
                     {session.sampleAnswer && session.sampleAnswer.length > 0 && (
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                           <h3 className="text-lg font-bold text-blue-800 flex justify-between items-center">
                               <span>参考答案</span>
                               <button onClick={() => handleSpeakSample(session.sampleAnswer.map(p => p.text).join(''))} className={`flex items-center gap-1 px-3 py-1 font-bold rounded-full transition-colors text-sm shadow-sm border ${isSpeakingSample ? 'bg-red-100 text-red-700 border-red-200' : 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200'}`} title={isSpeakingSample ? "停止朗读" : "朗读参考答案"}>
                                {isSpeakingSample ? '停止' : '朗读'}
                                {isSpeakingSample ? <StopIconSmall /> : <SpeakerIcon />}
                               </button>
                           </h3>
                           <p className="mt-2 text-gray-800 whitespace-pre-wrap leading-relaxed">
                                {session.sampleAnswer.map((part, index) => {
                                    const content = highlightSpecialPhrases(part.text);
                                    return part.highlight && part.explanation ? (
                                        <span key={index} className="relative group mx-1">
                                            <span className="bg-yellow-200/70 p-1 rounded-md cursor-help ring-1 ring-yellow-400/50">
                                                {content}
                                            </span>
                                            <span className="absolute hidden group-hover:block bottom-full mb-2 w-max max-w-xs p-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg z-10 transform -translate-x-1/2 left-1/2">
                                                {part.explanation}
                                            </span>
                                        </span>
                                    ) : (
                                        <span key={index}>{content}</span>
                                    );
                                })}
                           </p>
                        </div>
                    )}
                    {session.pronunciationFeedback && (
                        <div className="p-4 bg-cyan-50 border-l-4 border-cyan-400 rounded-r-lg">
                            <h3 className="text-lg font-bold text-cyan-800">发音评估</h3>
                            <p className="mt-2 text-gray-800 font-semibold">{session.pronunciationFeedback.overallFeedback}</p>
                            {session.pronunciationFeedback.feedbackItems.length > 0 && (
                                <ul className="mt-3 space-y-3 list-none">
                                    {session.pronunciationFeedback.feedbackItems.map((item, index) => (
                                        <li key={index} className="border-t border-cyan-200 pt-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-cyan-900 text-lg">{item.word}</p>
                                                    <p className="text-gray-500">{item.pinyin}</p>
                                                </div>
                                                <button 
                                                    onClick={() => speakText(item.word)} 
                                                    className="p-1 rounded-full hover:bg-cyan-200 text-cyan-800" 
                                                    aria-label={`朗读: ${item.word}`}
                                                >
                                                    <SpeakerIcon className="h-5 w-5"/>
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-700 mt-1 pl-1">💡 {item.feedback}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SessionListView: React.FC<{ sessions: PracticeSession[], onSelect: (s: PracticeSession) => void, onDelete: (id: string) => void, onExport: () => void }> = ({ sessions, onSelect, onDelete, onExport }) => {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">练习历史</h2>
                {sessions.length > 0 && (
                    <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-full shadow-sm hover:bg-green-700 transition-colors text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.001V3a1 1 0 112 0v8.001l1.293-1.294a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        导出历史
                    </button>
                )}
            </div>
            {sessions.length > 0 ? (
                <ul className="space-y-4">
                    {sessions.map(session => {
                        const imageUrl = `data:${session.imageMimeType};base64,${session.imageBase64}`;
                        return (
                            <li key={session.id} className="flex items-center gap-4 p-3 bg-white rounded-lg shadow border transition-shadow hover:shadow-md">
                                <img src={imageUrl} alt="Session thumbnail" className="w-24 h-16 object-cover rounded-md flex-shrink-0" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800">
                                        {new Date(session.timestamp).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-sm text-gray-500">难度: {session.difficulty}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => onSelect(session)} className="px-4 py-2 text-sm bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600">查看</button>
                                    <button onClick={() => handleDeleteClick(session.id, onDelete)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-center text-gray-500 py-8">这里还没有练习记录。完成一次录音后，点击“保存练习”即可。
</p>
            )}
        </div>
    );
};

const handleDeleteClick = (id: string, onDelete: (id: string) => void) => {
    if (window.confirm('你确定要删除这次练习记录吗？此操作无法撤销。')) {
        onDelete(id);
    }
};

export const PastSessionsModal: React.FC<PastSessionsModalProps> = ({ sessions, onClose, onSessionsUpdate }) => {
    const [selectedSession, setSelectedSession] = useState<PracticeSession | null>(null);

    const handleDelete = (id: string) => {
        deleteSession(id);
        if (selectedSession && selectedSession.id === id) {
            setSelectedSession(null);
        }
        onSessionsUpdate();
    };
    
    // Close modal on escape key
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleExport = () => {
        if (sessions.length === 0) return;

        const escapeCsvCell = (cell: string | null | undefined): string => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                const escapedStr = str.replace(/"/g, '""');
                return `"${escapedStr}"`;
            }
            return `"${str}"`;
        };

        const headers = [
            '练习时间', '难度', '引导问题', '文字稿', '拼音',
            'AI老师反馈', '语法与词汇分析', '参考答案'
        ];

        const rows = sessions.map(session => {
            const timestamp = new Date(session.timestamp).toLocaleString('zh-CN');
            const difficulty = session.difficulty;
            const questions = session.questions.join('\n');
            const transcription = session.transcription;
            const pinyin = session.pinyin;
            const feedback = session.feedback;
            const grammar = session.grammarFeedback?.corrections
                .map(c => `原文: ${c.original}\n建议: ${c.corrected}\n说明: ${c.explanation}`)
                .join('\n\n') || '无';
            const sampleAnswer = session.sampleAnswer?.map(p => p.text).join('') || '无';
            
            return [
                timestamp, difficulty, questions, transcription, pinyin,
                feedback, grammar, sampleAnswer
            ].map(escapeCsvCell).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\r\n');
        
        // Add BOM for UTF-8 to ensure Chinese characters are displayed correctly in Excel
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', '看图说话练习历史.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-gray-50 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto p-6 max-w-4xl lg:max-w-6xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
                    aria-label="关闭"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                {selectedSession ? (
                    <SessionDetailView session={selectedSession} onBack={() => setSelectedSession(null)} />
                ) : (
                    <SessionListView sessions={sessions} onSelect={setSelectedSession} onDelete={handleDelete} onExport={handleExport} />
                )}
            </div>
        </div>
    );
};
