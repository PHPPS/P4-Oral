import type { GrammarCorrection, StructuredSampleAnswer, PronunciationFeedback } from './services/geminiService';
import type { Difficulty } from './services/geminiService';

export interface PracticeSession {
    id: string;
    timestamp: number;
    imageBase64: string;
    imageMimeType: string;
    questions: string[];
    audioBase64: string | null;
    audioMimeType: string | null;
    transcription: string | null;
    pinyin: string | null;
    feedback: string | null;
    grammarFeedback: { corrections: GrammarCorrection[] } | null;
    sampleAnswer: StructuredSampleAnswer | null;
    pronunciationFeedback: PronunciationFeedback | null;
    difficulty: Difficulty;
}
