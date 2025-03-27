// Common interfaces for diary-related data

export interface ConversationLogEntry {
  role: string; // Changed from 'user' | 'assistant' to string to be more compatible
  content: string;
  timestamp?: Date;
}

export interface StructuredContent {
  morning: string;
  afternoon: string;
  evening: string;
}

export interface EmotionAnalysis {
  emotion: string;
  reason: string;
}

export interface DiaryAnalysis {
  keywords: string[];
  summary?: {
    morning: string;
    afternoon: string;
    evening: string;
  };
  structuredContent?: StructuredContent; // Added this field for compatibility
  question?: string;
  feelings: EmotionAnalysis;
  date?: string | Date; // Allow Date type to be compatible with the system
}