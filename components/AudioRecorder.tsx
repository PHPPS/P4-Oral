
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { extractKeyWords, getAudioFeedback, getSampleAnswer, transcribeAudio, getGrammarFeedback, getPronunciationFeedback, type GrammarCorrection, type Difficulty, type StructuredSampleAnswer, type PronunciationFeedback } from '../services/geminiService';
import { saveSession } from '../services/storageService';

interface AudioRecorderProps {
    disabled: boolean;
    questions: string[];
    imageBase64: string | null;
    imageMimeType: string | null;
    onSessionSaved: () => void;
    difficulty: Difficulty;
}

const RecordingIndicator: React.FC<{ volume: number; recordingTime: number }> = ({ volume, recordingTime }) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const scale = 1 + volume * 0.75; // Scale from 1 to 1.75
  const dotSize = 12; // h-3 w-3 in tailwind

  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg">
      <div className="relative flex items-center justify-center" style={{ width: dotSize * 3, height: dotSize * 3 }}>
        {/* Outer glow */}
        <span
          className="absolute block rounded-full bg-red-500/50 transition-transform duration-100 ease-out"
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            transform: `scale(${scale * 1.5})`, // Glow expands more
          }}
        />
        {/* Inner dot */}
        <span
          className="absolute block rounded-full bg-red-500 transition-transform duration-100 ease-out"
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            transform: `scale(${scale})`,
          }}
        />
      </div>
      <p className="font-mono text-2xl text-red-600 font-semibold" aria-live="off">{formatTime(recordingTime)}</p>
    </div>
  );
};

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ disabled, questions, imageBase64, imageMimeType, onSessionSaved, difficulty }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [keyWords, setKeyWords] = useState<string[]>([]);
  const [isFetchingWords, setIsFetchingWords] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volume, setVolume] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [pinyin, setPinyin] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [sampleAnswer, setSampleAnswer] = useState<StructuredSampleAnswer | null>(null);
  const [isFetchingAnswer, setIsFetchingAnswer] = useState<boolean>(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [grammarFeedback, setGrammarFeedback] = useState<{ corrections: GrammarCorrection[] } | null>(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState<boolean>(false);
  const [grammarError, setGrammarError] = useState<string | null>(null);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<PronunciationFeedback | null>(null);
  const [isCheckingPronunciation, setIsCheckingPronunciation] = useState<boolean>(false);
  const [pronunciationError, setPronunciationError] = useState<string | null>(null);
  const [isSessionSaved, setIsSessionSaved] = useState<boolean>(false);
  const [isSpeakingSample, setIsSpeakingSample] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fullSampleAnswerText = useMemo(() => sampleAnswer?.map(p => p.text).join('') || '', [sampleAnswer]);

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

  const highlightedFeedback = useMemo(() => {
    // If there's no feedback or no keywords, return the feedback text as is.
    if (!feedback || !keyWords.length) {
      return feedback;
    }

    // Escape any special regex characters in the keywords to safely build the regex.
    const escapedKeywords = keyWords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    
    // Create a regex to find any of the keywords. The capturing group is important
    // because it makes split() keep the delimiter (the keyword) in the resulting array.
    const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'g');
    
    const parts = feedback.split(regex);

    return parts.map((part, index) => {
      // Check if the current part of the split string is one of the keywords.
      if (keyWords.includes(part)) {
        // If it is a keyword, wrap it in a styled <strong> tag.
        return (
          <strong key={index} className="bg-yellow-300 text-yellow-900 font-bold rounded px-1.5 py-0.5">
            {part}
          </strong>
        );
      }
      // Otherwise, return the text part without any special styling.
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  }, [feedback, keyWords]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, audioURL]);

  useEffect(() => {
    if (disabled) {
      setAudioURL(null);
      setAudioBlob(null);
      setKeyWords([]);
      setFetchError(null);
      setIsFetchingWords(false);
      setFeedback(null);
      setAnalysisError(null);
      setTranscription(null);
      setPinyin(null);
      setTranscriptionError(null);
      setSampleAnswer(null);
      setAnswerError(null);
      setIsFetchingAnswer(false);
      setGrammarFeedback(null);
      setGrammarError(null);
      setIsCheckingGrammar(false);
      setPronunciationFeedback(null);
      setPronunciationError(null);
      setIsCheckingPronunciation(false);
      setIsSessionSaved(false);
      setIsSpeakingSample(false);
      window.speechSynthesis.cancel();
    }
  }, [disabled]);

  const cleanupVisualization = () => {
    if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
    }
    sourceRef.current?.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    setVolume(0);
  };

  useEffect(() => {
    return () => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }
        cleanupVisualization();
        window.speechSynthesis.cancel();
    };
  }, []);

  const visualizeAudio = useCallback(() => {
    if (!analyserRef.current) return;
    
    // For pulsing dot
    const dataArrayFreq = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArrayFreq);
    let sum = 0;
    for (const amplitude of dataArrayFreq) {
        sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / dataArrayFreq.length);
    const normalizedVolume = Math.min(rms / 128, 1);
    setVolume(normalizedVolume);

    // For waveform
    const canvas = canvasRef.current;
    const canvasCtx = canvas?.getContext('2d');
    if (canvas && canvasCtx && analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArrayTime = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArrayTime);

        canvasCtx.fillStyle = '#f3f4f6'; // Tailwind bg-gray-100
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#3b82f6'; // Tailwind blue-500

        canvasCtx.beginPath();

        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArrayTime[i] / 128.0;
            const y = (v * canvas.height) / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }
    
    animationFrameIdRef.current = requestAnimationFrame(visualizeAudio);
  }, []);

  const getMicPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia not supported on your browser!');
        setPermissionError(true);
        return null;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionError(false);
        return stream;
      } catch (err) {
        console.error('Error accessing microphone:', err);
        setPermissionError(true);
        return null;
      }
  };

  const startRecording = async () => {
    setAudioURL(null);
    setAudioBlob(null);
    setKeyWords([]);
    setFetchError(null);
    setFeedback(null);
    setAnalysisError(null);
    setTranscription(null);
    setPinyin(null);
    setTranscriptionError(null);
    setSampleAnswer(null);
    setAnswerError(null);
    setGrammarFeedback(null);
    setGrammarError(null);
    setPronunciationFeedback(null);
    setPronunciationError(null);
    setVolume(0);
    setIsSessionSaved(false);

    const stream = await getMicPermission();
    if (!stream) return;

    setIsRecording(true);
    setRecordingTime(0);

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();

    timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
    }, 1000);
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 2048;
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    sourceRef.current = source;
    analyserRef.current = analyser;
    
    animationFrameIdRef.current = requestAnimationFrame(visualizeAudio);

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      setAudioBlob(blob);
      const audioUrl = URL.createObjectURL(blob);
      setAudioURL(audioUrl);
      audioChunksRef.current = [];
      stream.getTracks().forEach(track => track.stop());
    };
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    cleanupVisualization();
  };
  
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
        if (typeof reader.result !== 'string') {
            return reject(new Error("File could not be read as a string"));
        }
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  };
  
  const handleSaveSession = async () => {
    if (!audioBlob || !imageBase64 || !imageMimeType) {
        console.error("Missing required data to save session.");
        return;
    }
    try {
        const audioBase64 = await blobToBase64(audioBlob);
        saveSession({
            imageBase64,
            imageMimeType,
            questions,
            audioBase64,
            audioMimeType: audioBlob.type,
            transcription,
            pinyin,
            feedback,
            grammarFeedback,
            sampleAnswer,
            pronunciationFeedback,
            difficulty,
        });
        setIsSessionSaved(true);
        onSessionSaved();
    } catch (error) {
        console.error("Failed to save session:", error);
        alert("保存练习失败，请稍后再试。");
    }
  };

  const handleGetPronunciationHelp = async () => {
    setIsFetchingWords(true);
    setFetchError(null);
    try {
        const words = await extractKeyWords(questions);
        if (words.length === 0) {
            setFetchError("未能提取关键词。");
        } else {
            setKeyWords(words);
        }
    } catch (error) {
        console.error("Error fetching keywords:", error);
        setFetchError("无法获取关键词，请稍后再试。");
    } finally {
        setIsFetchingWords(false);
    }
  };

  const handleGetFeedback = async () => {
    if (!audioBlob) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setFeedback(null);
    try {
        let currentKeywords = keyWords;
        // If keywords haven't been fetched yet, fetch them now.
        if (currentKeywords.length === 0 && questions.length > 0) {
            try {
                const words = await extractKeyWords(questions);
                setKeyWords(words); // Update state for the UI
                currentKeywords = words;
            } catch (error) {
                console.error("Could not extract keywords for feedback, proceeding with general feedback.", error);
                // Proceed without keywords if extraction fails
                currentKeywords = [];
            }
        }

        const audioBase64 = await blobToBase64(audioBlob);
        const mimeType = audioBlob.type;
        const result = await getAudioFeedback(audioBase64, mimeType, questions, currentKeywords);
        setFeedback(result);
    } catch (error) {
        console.error("Error getting feedback:", error);
        setAnalysisError("无法获取反馈，请稍后再试。");
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const handleGetTranscription = useCallback(async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    setTranscriptionError(null);
    setTranscription(null);
    setPinyin(null);
    try {
        const audioBase64 = await blobToBase64(audioBlob);
        const mimeType = audioBlob.type;
        const result = await transcribeAudio(audioBase64, mimeType);
        setTranscription(result.transcription);
        setPinyin(result.pinyin);
    } catch (error) {
        console.error("Error transcribing audio:", error);
        setTranscriptionError("无法生成文字稿和拼音，请稍后再试。");
    } finally {
        setIsTranscribing(false);
    }
  }, [audioBlob]);

  useEffect(() => {
    if (audioBlob) {
        handleGetTranscription();
    }
  }, [audioBlob, handleGetTranscription]);

  const handleGetGrammarFeedback = async () => {
    if (!transcription) return;
    setIsCheckingGrammar(true);
    setGrammarError(null);
    setGrammarFeedback(null);
    try {
        const result = await getGrammarFeedback(transcription);
        setGrammarFeedback(result);
    } catch (error) {
        console.error("Error getting grammar feedback:", error);
        setGrammarError("无法获取语法分析，请稍后再试。");
    } finally {
        setIsCheckingGrammar(false);
    }
  };

  const handleGetSampleAnswer = async () => {
    if (!imageBase64 || !imageMimeType) return;
    setIsFetchingAnswer(true);
    setAnswerError(null);
    setSampleAnswer(null);
    try {
        const result = await getSampleAnswer(imageBase64, imageMimeType, questions);
        setSampleAnswer(result);
    } catch (error) {
        console.error("Error getting sample answer:", error);
        setAnswerError("无法获取参考答案，请稍后再试。");
    } finally {
        setIsFetchingAnswer(false);
    }
  };

  const handleGetPronunciationFeedback = async () => {
    if (!audioBlob || !sampleAnswer) return;

    setIsCheckingPronunciation(true);
    setPronunciationError(null);
    setPronunciationFeedback(null);

    try {
        const audioBase64 = await blobToBase64(audioBlob);
        const mimeType = audioBlob.type;
        const referenceText = sampleAnswer.map(p => p.text).join('');
        const result = await getPronunciationFeedback(audioBase64, mimeType, referenceText);
        setPronunciationFeedback(result);
    } catch (error) {
        console.error("Error getting pronunciation feedback:", error);
        setPronunciationError("无法获取发音评估，请稍后再试。");
    } finally {
        setIsCheckingPronunciation(false);
    }
  };

  const speakText = (text: string) => {
      if ('speechSynthesis' in window && text) {
          window.speechSynthesis.cancel(); // Stop any previous speech
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
  
  const RecordIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
      <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
      <path fillRule="evenodd" d="M7 3a1 1 0 000 2v4a1 1 0 102 0V5a1 1 0 10-2 0V3z" clipRule="evenodd" />
      <path d="M10 15a5 5 0 005-5h-1a4 4 0 01-4 4V9a1 1 0 10-2 0v1a4 4 0 01-4-4H2a5 5 0 005 5v2a1 1 0 102 0v-2z" />
    </svg>
  );

  const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
    </svg>
  );

  const StopIconSmall = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 8a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1H9a1 1 0 01-1-1V8z" clipRule="evenodd" />
    </svg>
  );

  const SpeakerIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M6 8a1 1 0 00-1 1v2a1 1 0 001 1h1.586l2.707 2.707A1 1 0 0012 14V6a1 1 0 00-1.707-.707L7.586 8H6zM14.5 10a4.5 4.5 0 10-9 0 4.5 4.5 0 009 0z" />
      </svg>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
        </svg>
        我的录音
      </h2>
      <div className="flex flex-col items-center space-y-4">
        {permissionError && (
            <p className="text-red-500 text-sm text-center">无法访问麦克风。请检查浏览器设置并授予权限。</p>
        )}
        <div className="flex flex-col items-center justify-center min-h-[96px]">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={disabled}
              className="flex items-center justify-center w-32 h-12 bg-red-600 text-white font-semibold rounded-full shadow-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
              aria-label="Start recording"
            >
              <RecordIcon/>
              <span className="ml-2">开始录音</span>
            </button>
          ) : (
            <div className="flex flex-col items-center space-y-2 text-center">
                <RecordingIndicator volume={volume} recordingTime={recordingTime} />
                <canvas 
                    ref={canvasRef} 
                    width="300" 
                    height="60" 
                    className="rounded-lg bg-gray-100 border border-gray-200 shadow-inner"
                    aria-hidden="true"
                ></canvas>
                <button
                    onClick={stopRecording}
                    className="flex items-center justify-center w-32 h-12 bg-gray-700 text-white font-semibold rounded-full shadow-md hover:bg-gray-800 transition-all animate-pulse"
                    aria-label="Stop recording"
                >
                    <StopIcon/>
                    <span className="ml-2">停止</span>
                </button>
            </div>
          )}
        </div>
        {audioURL && (
          <div className="w-full mt-4 space-y-6">
             <div className="p-4 bg-gray-100 rounded-lg">
                <audio ref={audioRef} src={audioURL} controls className="w-full" aria-label="Recorded audio player"/>
                <div className="flex items-center justify-center space-x-2 mt-2" role="group" aria-label="Playback speed controls">
                <span className="text-sm font-medium text-gray-600 mr-2">播放速度:</span>
                {[0.75, 1, 1.5].map((rate) => (
                    <button
                        key={rate}
                        onClick={() => setPlaybackRate(rate)}
                        className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                            playbackRate === rate
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        aria-pressed={playbackRate === rate}
                    >
                        {rate}x
                    </button>
                ))}
                </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6 text-center">
                <button onClick={handleSaveSession} disabled={isSessionSaved} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700 transition-colors disabled:bg-green-600 disabled:cursor-not-allowed flex items-center gap-2 mx-auto">
                    {isSessionSaved ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            已保存
                        </>
                    ) : '保存本次练习'}
                </button>
            </div>

            <div className="border-t border-gray-200 pt-6 text-center">
                {keyWords.length === 0 && !isFetchingWords && !fetchError && (
                    <button onClick={handleGetPronunciationHelp} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-full shadow-md hover:bg-green-700 transition-colors" disabled={questions.length === 0 || isAnalyzing || isFetchingAnswer || isCheckingGrammar}>
                        重点词汇发音练习
                    </button>
                )}
                {isFetchingWords && <p className="text-gray-600">正在提取关键词...</p>}
                {fetchError && <p className="text-red-500">{fetchError}</p>}
                {keyWords.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold text-gray-700 mb-3">重点词汇</h3>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {keyWords.map(word => (
                                <div key={word} className="flex items-center bg-sky-100 rounded-full shadow-sm border border-sky-200 overflow-hidden">
                                    <span className="pl-4 pr-3 py-2 text-sky-800 font-bold">{word}</span>
                                    <button 
                                        onClick={() => speakText(word)} 
                                        className="p-2 self-stretch flex items-center bg-sky-200 hover:bg-sky-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 text-sky-800" 
                                        title={`Listen to ${word}`}
                                        aria-label={`Listen to ${word}`}
                                    >
                                        <SpeakerIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-gray-200 pt-6 text-center">
                {isTranscribing && <p className="text-gray-600 animate-pulse">正在转换文字及拼音...</p>}
                {transcriptionError && <p className="text-red-500">{transcriptionError}</p>}
                {transcription && (
                    <div className="text-left p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg" role="region" aria-live="polite">
                        <h3 className="text-lg font-bold text-amber-800 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-2 0v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1a1 1 0 000 2h6a1 1 0 100-2H7z m0 4a1 1 0 000 2h6a1 1 0 100-2H7z m0 4a1 1 0 000 2h3a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            文字稿
                        </h3>
                        <p className="mt-2 text-gray-800 ml-8 whitespace-pre-wrap">{transcription}</p>
                        {pinyin && (
                            <p className="mt-2 text-gray-500 ml-8 whitespace-pre-wrap">{pinyin}</p>
                        )}
                    </div>
                )}
            </div>

            <div className="border-t border-gray-200 pt-6 text-center">
                {transcription && !isCheckingGrammar && !grammarFeedback && (
                    <button onClick={handleGetGrammarFeedback} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-full shadow-md hover:bg-teal-700 transition-colors disabled:bg-gray-400" disabled={isAnalyzing || isFetchingAnswer || isFetchingWords}>
                        语法检查
                    </button>
                )}
                {isCheckingGrammar && <p className="text-gray-600 animate-pulse">正在检查语法...</p>}
                {grammarError && <p className="text-red-500">{grammarError}</p>}
                {grammarFeedback && (
                    <div className="text-left p-4 bg-rose-50 border-l-4 border-rose-400 rounded-r-lg" role="region" aria-live="polite">
                        <h3 className="text-lg font-bold text-rose-800 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                            语法与词汇分析
                        </h3>
                        {grammarFeedback.corrections.length > 0 ? (
                            <ul className="mt-2 ml-8 space-y-3 list-none">
                                {grammarFeedback.corrections.map((item, index) => (
                                    <li key={index} className="border-b border-rose-200 pb-3 last:border-b-0">
                                        <p className="text-gray-600">原文: <span className="line-through text-red-600 decoration-red-600 decoration-2">{item.original}</span></p>
                                        <p className="text-gray-800">建议: <span className="font-semibold text-green-700">{item.corrected}</span></p>
                                        <p className="text-sm text-gray-500 mt-1">说明: {item.explanation}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-2 text-gray-800 ml-8">太棒了！没有发现明显的语法或词汇错误。继续保持！</p>
                        )}
                    </div>
                )}
            </div>
            
            <div className="border-t border-gray-200 pt-6 text-center">
                {feedback === null && !isAnalyzing && (
                    <button onClick={handleGetFeedback} className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-full shadow-md hover:bg-purple-700 transition-colors disabled:bg-gray-400" disabled={isFetchingWords || isFetchingAnswer || isTranscribing || isCheckingGrammar}>
                        获取 AI 老师反馈
                    </button>
                )}
                {isAnalyzing && <p className="text-gray-600 animate-pulse">AI 老师正在分析你的录音...</p>}
                {analysisError && <p className="text-red-500">{analysisError}</p>}
                {feedback && (
                    <div className="text-left p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg" role="alert">
                        <h3 className="text-lg font-bold text-green-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 011.056 0l4 2a1 1 0 001.056 0l4-2a1 1 0 011.056 0l2.606-1.302a1 1 0 000-1.84l-7-3zM3.25 9.446c.218.109.452.164.69.164.239 0 .472-.055.69-.164L8.5 7.698l4.809 2.404a1.5 1.5 0 001.382 0l2.606-1.302c.218-.109.452-.164.69-.164.239 0 .472.055.69.164v.002a1.5 1.5 0 010 2.692L14 14.56l-3.31-1.655a.999.999 0 00-1.056 0L6 14.56l-4.154-2.077a1.5 1.5 0 010-2.692v-.002z" />
                        </svg>
                        AI 小老师反馈
                        </h3>
                        <p className="mt-2 text-gray-700 ml-8 whitespace-pre-wrap">{highlightedFeedback}</p>
                    </div>
                )}
            </div>
            
            <div className="border-t border-gray-200 pt-6 text-center">
                {sampleAnswer === null && !isFetchingAnswer && (
                    <button onClick={handleGetSampleAnswer} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-full shadow-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400" disabled={isFetchingWords || isAnalyzing || isTranscribing || isCheckingGrammar}>
                        显示参考答案
                    </button>
                )}
                {isFetchingAnswer && <p className="text-gray-600 animate-pulse">正在生成参考答案...</p>}
                {answerError && <p className="text-red-500">{answerError}</p>}
                {sampleAnswer && sampleAnswer.length > 0 && (
                    <div className="text-left p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg" role="region" aria-live="polite">
                        <h3 className="text-lg font-bold text-blue-800 flex items-center justify-between">
                            <span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                                参考答案
                            </span>
                             <button onClick={() => handleSpeakSample(fullSampleAnswerText)} className={`flex items-center gap-1 px-3 py-1 font-bold rounded-full transition-colors shadow-sm border text-sm ${isSpeakingSample ? 'bg-red-100 text-red-700 border-red-200' : 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200'}`} title={isSpeakingSample ? "停止朗读" : "朗读参考答案"}>
                                {isSpeakingSample ? '停止' : '朗读'}
                                {isSpeakingSample ? <StopIconSmall /> : <SpeakerIcon />}
                            </button>
                        </h3>
                        <p className="mt-2 text-gray-800 ml-8 whitespace-pre-wrap leading-relaxed">
                            {sampleAnswer.map((part, index) => {
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
            </div>

            {sampleAnswer && (
                <div className="border-t border-gray-200 pt-6 text-center">
                    {pronunciationFeedback === null && !isCheckingPronunciation && (
                        <button
                            onClick={handleGetPronunciationFeedback}
                            className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-full shadow-md hover:bg-cyan-700 transition-colors disabled:bg-gray-400"
                            disabled={isFetchingWords || isAnalyzing || isTranscribing || isCheckingGrammar || isFetchingAnswer}
                        >
                            发音评估
                        </button>
                    )}
                    {isCheckingPronunciation && <p className="text-gray-600 animate-pulse">正在评估你的发音...</p>}
                    {pronunciationError && <p className="text-red-500">{pronunciationError}</p>}
                    {pronunciationFeedback && (
                        <div className="text-left p-4 bg-cyan-50 border-l-4 border-cyan-400 rounded-r-lg" role="region" aria-live="polite">
                            <h3 className="text-lg font-bold text-cyan-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 3.5a1.5 1.5 0 011.5 1.5v.548a4.503 4.503 0 00-3 0V5A1.5 1.5 0 0110 3.5zM8.5 7A1.5 1.5 0 007 8.5v3A1.5 1.5 0 008.5 13h3a1.5 1.5 0 001.5-1.5v-3A1.5 1.5 0 0011.5 7h-3z" />
                                    <path d="M3 6.5A1.5 1.5 0 014.5 5h1.75a.75.75 0 000-1.5H4.5A3 3 0 001.5 6.5v7A3 3 0 004.5 16.5h10a3 3 0 003-3v-7a3 3 0 00-3-3H13.75a.75.75 0 000 1.5H15.5A1.5 1.5 0 0117 6.5v7a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 013 13.5v-7z" />
                                </svg>
                                发音评估
                            </h3>
                            <p className="mt-2 text-gray-800 ml-8 font-semibold">{pronunciationFeedback.overallFeedback}</p>
                            {pronunciationFeedback.feedbackItems.length > 0 && (
                                <ul className="mt-3 ml-8 space-y-3 list-none">
                                    {pronunciationFeedback.feedbackItems.map((item, index) => (
                                        <li key={index} className="border-t border-cyan-200 pt-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-cyan-900 text-lg">{item.word}</p>
                                                    <p className="text-gray-500">{item.pinyin}</p>
                                                </div>
                                                <button 
                                                    onClick={() => speakText(item.word)} 
                                                    className="p-2 self-stretch flex items-center bg-cyan-100 hover:bg-cyan-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 text-cyan-800" 
                                                    title={`朗读: ${item.word}`}
                                                    aria-label={`朗读: ${item.word}`}
                                                >
                                                    <SpeakerIcon />
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
            )}

          </div>
        )}
      </div>
    </div>
  );
};
