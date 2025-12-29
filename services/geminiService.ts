import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface SampleAnswerPart {
    text: string;
    highlight?: boolean;
    explanation?: string;
}

export type StructuredSampleAnswer = SampleAnswerPart[];

export interface PronunciationFeedbackItem {
    word: string;
    pinyin: string;
    feedback: string;
}

export interface PronunciationFeedback {
    overallFeedback: string;
    feedbackItems: PronunciationFeedbackItem[];
}


const easyScenarios = [
    "A simple cartoon of a girl watering a plant in a garden.",
    "A clean cartoon drawing of a boy reading a book on a park bench.",
    "A simple cartoon of a cat sleeping on a colorful mat.",
    "A clear cartoon of a student writing on a whiteboard in a classroom.",
    "A simple cartoon of a family of three eating dinner at a table happily.",
];

const mediumScenarios = [
    "A colorful and detailed cartoon of children having lunch in a bustling Singapore school canteen. Some are queueing for food, some are eating and chatting, and one student is cleaning their tray.",
    "A vibrant cartoon illustration of a school sports day in Singapore. Children are participating in a sack race on a green field, with other students and teachers cheering from the sidelines under a tent.",
    "A heartwarming cartoon scene in a Singapore library. A few children are reading books quietly at a table, another is choosing a book from a shelf, and a librarian is helping a student at the counter.",
    "A dynamic cartoon of students in a classroom science experiment in Singapore. They are gathered around a table with beakers and test tubes, looking excited and curious. The teacher is guiding them.",
    "A happy cartoon scene at a HDB playground in Singapore. Children are playing on the slide, swings, and a see-saw. One child has fallen and is being helped up by a friend.",
    "A cheerful cartoon of a family having a picnic at East Coast Park in Singapore. They are sitting on a mat with a basket of food, with the sea and ships in the background.",
    "A busy cartoon scene inside a Singapore supermarket. A mother and child are choosing fruits, while other shoppers are in the aisles with their trolleys.",
    "A respectful cartoon scene where a young student helps an elderly person cross the street at a pedestrian crossing in Singapore."
];

const hardScenarios = [
    "A detailed cartoon of a crowded MRT train in Singapore during peak hour. An elderly person is standing while several students are seated and looking at their phones, not noticing.",
    "A complex cartoon scene of a child who has found a wallet on the floor in a busy shopping mall and is looking around for the owner with a thoughtful expression.",
    "A cartoon illustration of a student seeing a classmate cheating during an exam and looking conflicted about whether to report it.",
    "A dynamic cartoon of a group of children working on a project. Two are working hard, one is playing with a phone, and another looks confused and left out.",
    "A nuanced cartoon of a student comforting a friend who is crying at a playground after falling down, while other children are laughing in the background.",
];


const getQuestionsFromImage = async (base64Image: string, mimeType: string, difficulty: Difficulty) => {
    let prompt = `You are a helpful assistant for a Primary 4 student in Singapore practicing for their Chinese oral exam (看图说话).
Based on the image provided, generate guiding questions in simplified Chinese.
Format the output as a simple list of questions, each on a new line, without any numbering or bullet points.`;

    switch (difficulty) {
        case 'Easy':
            prompt += `
Generate 3-4 simple questions. The questions should focus on direct observation.
1. A question to identify people/objects. (图里有什么？)
2. A question about a specific detail like color or location. (它是什么颜色的？)
3. A question about a simple action. (图里的人在做什么？)`;
            break;
        case 'Hard':
            prompt += `
Generate 4-5 challenging questions to encourage deeper thinking.
1. A general question about the situation. (这幅图画描绘了什么情景？)
2. A question that requires inference about feelings or motives. (你觉得图中的小男孩为什么看起来很难过？)
3. A question that requires predicting what might happen next. (接下来可能会发生什么事？)
4. A question that connects to moral values or personal opinion. (如果你是图中的学生，你会怎么做？为什么？)`;
            break;
        case 'Medium':
        default:
            prompt += `
Generate 4-5 guiding questions. The questions should guide the student to talk about the picture in a structured way. Structure them as follows:
1.  A general question about the time, weather, and place. (时间、地点、天气)
2.  A question asking to describe the actions of a few different people in the picture. (图里的人在做什么？)
3.  A question that requires inference or prediction, like asking about someone's feelings or what might happen next. (推测感受或接下来会发生什么)
4.  A question that connects to personal experience, moral values, or opinion. (联系生活、发表看法)`;
            break;
    }

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    const questionsText = response.text;
    return questionsText.split('\n').filter(q => q.trim() !== '');
};

export const generatePictureAndQuestions = async (difficulty: Difficulty): Promise<{ imageUrl: string; questions: string[]; base64Image: string; mimeType: string; }> => {
    let scenarios;
    switch (difficulty) {
        case 'Easy':
            scenarios = easyScenarios;
            break;
        case 'Hard':
            scenarios = hardScenarios;
            break;
        case 'Medium':
        default:
            scenarios = mediumScenarios;
            break;
    }
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const mimeType = 'image/png';

    const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: randomScenario,
        config: {
            numberOfImages: 1,
            outputMimeType: mimeType,
            aspectRatio: '16:9',
        },
    });

    const base64Image = imageResponse.generatedImages[0].image.imageBytes;
    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    
    const questions = await getQuestionsFromImage(base64Image, mimeType, difficulty);

    return { imageUrl, questions, base64Image, mimeType };
};

const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                return reject(new Error('Could not read file as string.'));
            }
            const [header, data] = reader.result.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || file.type;
            resolve({ base64: data, mimeType });
        };
        reader.onerror = error => reject(error);
    });
};

export const generateQuestionsForImage = async (file: File, difficulty: Difficulty): Promise<{ base64: string; mimeType: string; questions: string[]; }> => {
    const { base64, mimeType } = await fileToBase64(file);
    const questions = await getQuestionsFromImage(base64, mimeType, difficulty);
    return { base64, mimeType, questions };
};

export const extractKeyWords = async (questions: string[]): Promise<string[]> => {
    if (questions.length === 0) return [];

    const prompt = `You are an assistant for a Singapore Primary 4 student's Chinese oral practice. From the following questions, extract 3-5 key nouns or verbs (关键词) that are useful for pronunciation practice. Questions: "${questions.join(' ')}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        keywords: {
                            type: Type.ARRAY,
                            description: "A list of 3-5 key Chinese words (nouns or verbs).",
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["keywords"]
                },
            },
        });

        const result = JSON.parse(response.text);
        return result.keywords || [];
    } catch (error) {
        console.error("Error extracting keywords:", error);
        return [];
    }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<{ transcription: string; pinyin: string; }> => {
    const prompt = `Please transcribe this audio recording. The language is Mandarin Chinese.
Provide the transcribed text in simplified Chinese characters and the corresponding pinyin with tone marks.
If you cannot determine the pinyin, return an empty string for the pinyin field.`;

    const audioPart = {
        inlineData: {
            data: audioBase64,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    transcription: {
                        type: Type.STRING,
                        description: "The transcribed text in simplified Chinese."
                    },
                    pinyin: {
                        type: Type.STRING,
                        description: "The corresponding pinyin with tone marks for the transcription."
                    }
                },
                required: ["transcription", "pinyin"]
            },
        },
    });

    const result = JSON.parse(response.text);
    return result;
};

export const getAudioFeedback = async (audioBase64: string, mimeType: string, questions: string[], keyWords: string[]): Promise<string> => {
    let prompt = `You are a patient and encouraging "little teacher" (小老师) for a Singapore Primary 4 student.
The student was given some guiding questions to talk about a picture: "${questions.join('; ')}".
They have recorded their answer.
Your task is to provide feedback in Simplified Chinese, as if you are their teacher.
- Start with a warm and encouraging greeting, like "这位同学，你做得很好！" or "很棒的尝试！".
- Keep the feedback concise (2-3 sentences) and use vocabulary suitable for a 10-year-old.
- Focus on what they did well (e.g., "你把图里的地点和人物都说清楚了，真不错！").
- Gently suggest one area for improvement (e.g., "如果能再多说一点他们的心情，就更完美了。").
- End with an encouraging closing, like "继续加油，你下次会说得更好！".
- Do not provide a transcription. Be very positive and avoid being critical.`;

    if (keyWords.length > 0) {
        prompt += `

Also, listen carefully to their pronunciation of these key words: "${keyWords.join(', ')}".
If they pronounced them well, praise them for it (e.g., "特别是‘关键词1’和‘关键词2’这两个词，你的发音很标准！").
If one or two words could be better, offer a gentle tip (e.g., "老师觉得，如果‘关键词1’这个词的声调再读准一点点，就更棒了！").`;
    } else {
        prompt += `

Example feedback: "这位同学，你的描述很生动！你注意到了很多细节。老师建议你下次可以根据问题4，说说自己的想法。继续加油，你做得很好！"`;
    }

    const audioPart = {
        inlineData: {
            data: audioBase64,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, textPart] },
    });

    return response.text.trim();
};

export const getSampleAnswer = async (base64Image: string, mimeType: string, questions: string[]): Promise<StructuredSampleAnswer> => {
    const prompt = `You are an excellent Primary 4 student from Singapore, speaking in Mandarin Chinese (简体中文).
You will be given an image and some guiding questions for the '看图说话' (Picture Talk) oral exam.
Your task is to provide a high-quality, fluent, and well-structured sample answer based on the image and questions.
The language should be natural for a 10-year-old but demonstrate good vocabulary and sentence structure.

Please follow this structure for your answer:
1.  Start your description with: "这幅图描绘的是……"
2.  Describe the picture using the W-A-T-E-R model as a guide.
3.  State your views and feelings.
4.  Make sure your answer addresses all the provided guiding questions.
5.  End with a summary, starting with: "总的来说……".

Your output MUST be a JSON object that follows the provided schema. The answer should be broken down into an array of parts. For 2-3 parts that demonstrate good vocabulary (好词) or sentence structure (好句), set 'highlight' to true and provide a brief, simple explanation in Chinese in the 'explanation' field. For parts without a highlight, only include the 'text' field.

Guiding questions: ${questions.join('; ')}`;

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answer: {
                        type: Type.ARRAY,
                        description: "An array of text segments for the sample answer.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { 
                                    type: Type.STRING, 
                                    description: "A segment of the answer." 
                                },
                                highlight: { 
                                    type: Type.BOOLEAN, 
                                    description: "Optional. True if this segment should be highlighted for its good vocabulary or sentence structure." 
                                },
                                explanation: { 
                                    type: Type.STRING, 
                                    description: "Optional. A brief explanation in Chinese for the highlight, suitable for a 10-year-old." 
                                }
                            },
                            required: ["text"]
                        }
                    }
                },
                required: ["answer"]
            }
        }
    });

    const result = JSON.parse(response.text);
    return result.answer || [];
};

export interface GrammarCorrection {
    original: string;
    corrected: string;
    explanation: string;
}

export const getGrammarFeedback = async (transcription: string): Promise<{ corrections: GrammarCorrection[] }> => {
    const prompt = `You are a Chinese language teacher for a 10-year-old student in Singapore.
Your task is to review the student's transcribed speech and provide feedback on incorrect words (错别字) and grammatical errors (语法错误).
Be gentle and encouraging. For each error found, provide the original phrase, the corrected phrase, and a simple explanation.
If there are no errors, you must return an empty array for the corrections.

Student's text: "${transcription}"

Please format your response as a JSON object following the provided schema.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    corrections: {
                        type: Type.ARRAY,
                        description: "List of corrections for incorrect words or grammar. An empty array means no errors were found.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                original: { type: Type.STRING, description: "The original incorrect phrase from the student's text." },
                                corrected: { type: Type.STRING, description: "The corrected phrase." },
                                explanation: { type: Type.STRING, description: "A simple explanation for the correction in Chinese." }
                            },
                            required: ["original", "corrected", "explanation"]
                        }
                    }
                },
                required: ["corrections"]
            },
        },
    });

    const result = JSON.parse(response.text);
    return result;
};

export interface VocabularyItem {
    word: string;
    pinyin: string;
    type: string;
    sentence: string;
}

export const getVocabularyForImage = async (base64Image: string, mimeType: string, difficulty: Difficulty): Promise<VocabularyItem[]> => {
    let prompt = `You are a helpful Chinese language assistant for a Primary 4 student in Singapore.
Based on the provided image, identify key objects, actions, or feelings.
For each, provide a relevant Chinese word/phrase, its pinyin, its type (e.g., '名词', '动词', '形容词'), and a simple example sentence using it.
The vocabulary and sentences should be appropriate for a 10-year-old.
Format the output as a JSON object following the schema.`;

    switch (difficulty) {
        case 'Easy':
            prompt += `\nGenerate 3-4 simple, concrete nouns or verbs.`;
            break;
        case 'Hard':
            prompt += `\nGenerate 4-5 items, including some more abstract nouns, descriptive adjectives, or idioms (成语) if relevant.`;
            break;
        case 'Medium':
        default:
            prompt += `\nGenerate 4-5 useful nouns, verbs, and adjectives.`;
            break;
    }

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    items: {
                        type: Type.ARRAY,
                        description: "A list of vocabulary items related to the image.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                word: { type: Type.STRING, description: "The Chinese word or phrase." },
                                pinyin: { type: Type.STRING, description: "The pinyin for the word." },
                                type: { type: Type.STRING, description: "The part of speech (e.g., '名词')." },
                                sentence: { type: Type.STRING, description: "An example sentence." }
                            },
                            required: ["word", "pinyin", "type", "sentence"]
                        }
                    }
                },
                required: ["items"]
            }
        }
    });

    const result = JSON.parse(response.text);
    return result.items || [];
};

export const getPronunciationFeedback = async (audioBase64: string, mimeType: string, referenceText: string): Promise<PronunciationFeedback> => {
    const prompt = `You are a friendly and expert Chinese pronunciation coach for a 10-year-old student in Singapore.
The student has recorded themselves trying to read a passage. I will provide you with their audio recording and the reference text.

Your task is to:
1. Listen carefully to the student's audio.
2. Compare their pronunciation to standard Mandarin pronunciation for the given reference text.
3. Identify any specific words where the pronunciation could be improved. Focus on tones (声调) and initials/finals (声母/韵母).
4. Provide simple, encouraging, and constructive feedback for each identified word.
5. If the overall pronunciation is good, provide positive reinforcement.

Reference Text: "${referenceText}"

Please format your response as a JSON object following the provided schema. If no significant errors are found, return an empty array for 'feedbackItems' and provide a positive message in 'overallFeedback'.`;

    const audioPart = {
        inlineData: {
            data: audioBase64,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: prompt,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overallFeedback: {
                        type: Type.STRING,
                        description: "A summary of the pronunciation feedback in Chinese, suitable for a 10-year-old. E.g., '你的发音很棒！' or '整体说得很流利，有几个词的声调可以注意一下哦。'"
                    },
                    feedbackItems: {
                        type: Type.ARRAY,
                        description: "A list of specific words with pronunciation feedback. Empty if no errors.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                word: { type: Type.STRING, description: "The word with the pronunciation issue." },
                                pinyin: { type: Type.STRING, description: "The correct pinyin for the word." },
                                feedback: { type: Type.STRING, description: "A simple, specific tip for improving the pronunciation of this word in Chinese." }
                            },
                            required: ["word", "pinyin", "feedback"]
                        }
                    }
                },
                required: ["overallFeedback", "feedbackItems"]
            }
        }
    });

    const result = JSON.parse(response.text);
    return result;
};