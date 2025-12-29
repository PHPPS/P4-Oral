import type { PracticeSession } from '../types';

const SESSIONS_KEY = 'chinese-oral-practice-sessions';

export const getSessions = (): PracticeSession[] => {
    try {
        const sessionsJson = localStorage.getItem(SESSIONS_KEY);
        if (!sessionsJson) {
            return [];
        }
        const sessions = JSON.parse(sessionsJson) as PracticeSession[];
        return sessions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Failed to retrieve sessions from localStorage", error);
        return [];
    }
};

export const saveSession = (sessionData: Omit<PracticeSession, 'id' | 'timestamp'>): PracticeSession => {
    const sessions = getSessions();
    const newSession: PracticeSession = {
        ...sessionData,
        id: Date.now().toString(),
        timestamp: Date.now(),
    };
    
    const updatedSessions = [newSession, ...sessions];
    
    try {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedSessions));
        return newSession;
    } catch (error) {
        console.error("Failed to save session to localStorage", error);
        throw error;
    }
};


export const deleteSession = (id: string): void => {
    let sessions = getSessions();
    sessions = sessions.filter(session => session.id !== id);
    try {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
        console.error("Failed to delete session from localStorage", error);
    }
};
