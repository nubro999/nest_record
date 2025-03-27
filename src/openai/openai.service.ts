import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fetch from 'node-fetch';
import { createReadStream } from 'fs';
import * as FormData from 'form-data';
import { ConversationLogEntry, DiaryAnalysis, StructuredContent } from '../common/interfaces/diary.interface';

@Injectable()
export class OpenAiService {
  constructor(private configService: ConfigService) {}

  // Generate a session token for OpenAI Realtime API
  async generateRealtimeToken(): Promise<any> {
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined in environment variables');
      }
      
      const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "verse", // You can choose different voices: alloy, echo, fable, onyx, nova, shimmer
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Realtime token generation error:', error);
      throw new Error('Failed to generate realtime token');
    }
  }

  // Process conversation log to extract structured content
  analyzeConversationLog(conversationLog: ConversationLogEntry[]): DiaryAnalysis {
    try {
      if (!conversationLog || conversationLog.length === 0) {
        return {
          structuredContent: {
            morning: '',
            afternoon: '',
            evening: ''
          },
          keywords: ['conversation'],
          feelings: {
            emotion: 'neutral',
            reason: 'No conversation data'
          }
        };
      }

      // Extract user messages
      const userMessages = conversationLog
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content);
      
      // Simple analysis to categorize content by time period mentioned
      let morningContent = '';
      let afternoonContent = '';
      let eveningContent = '';
      
      userMessages.forEach(content => {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('아침') || lowerContent.includes('morning') || lowerContent.includes('오전')) {
          morningContent += content + ' ';
        } else if (lowerContent.includes('점심') || lowerContent.includes('afternoon') || lowerContent.includes('오후')) {
          afternoonContent += content + ' ';
        } else if (lowerContent.includes('저녁') || lowerContent.includes('evening') || lowerContent.includes('밤')) {
          eveningContent += content + ' ';
        } else {
          // If time not specified, add to all periods as general content
          const generalContent = content + ' ';
          morningContent += generalContent;
          afternoonContent += generalContent;
          eveningContent += generalContent;
        }
      });
      
      // Simple emotion detection
      const emotionKeywords: Record<string, string[]> = {
        happy: ['happy', 'glad', 'excited', 'joy', 'fun', 'good', '기쁨', '즐거움', '행복', '좋았'],
        sad: ['sad', 'unhappy', 'depressed', 'down', 'bad', '슬픔', '우울', '나쁨'],
        angry: ['angry', 'mad', 'upset', 'frustrated', '화남', '분노', '짜증'],
        anxious: ['anxious', 'nervous', 'worried', 'stressed', '불안', '걱정', '스트레스']
      };
      
      // Count emotion mentions
      const emotionCounts: Record<string, number> = {
        happy: 0, sad: 0, angry: 0, anxious: 0
      };
      
      const fullText = userMessages.join(' ').toLowerCase();
      
      Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
        keywords.forEach(keyword => {
          if (fullText.includes(keyword)) {
            emotionCounts[emotion] += 1;
          }
        });
      });
      
      // Get most mentioned emotion
      const dominantEmotion = Object.entries(emotionCounts)
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0][0];
        
      // If no emotions detected, default to neutral
      const emotion = dominantEmotion && emotionCounts[dominantEmotion] > 0
        ? dominantEmotion
        : 'neutral';
      
      return {
        structuredContent: {
          morning: morningContent.trim(),
          afternoon: afternoonContent.trim(),
          evening: eveningContent.trim()
        },
        keywords: this.extractKeywords(fullText),
        feelings: {
          emotion,
          reason: `Based on conversation content analysis`
        }
      };
    } catch (error) {
      console.error('Error analyzing conversation log:', error);
      return {
        structuredContent: {
          morning: '',
          afternoon: '',
          evening: ''
        },
        keywords: ['conversation'],
        feelings: {
          emotion: 'neutral',
          reason: 'Analysis error'
        }
      };
    }
  }
  
  // Extract simple keywords from text
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words and get most frequent remaining words
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 
      'about', 'from', 'by', '있었', '했다', '그리고', '그래서', '때문에', '그런데', '했어', '했어요', '있어요']);
    
    const words = text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));
    
    // Count word frequency
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Sort by frequency and return top 5
    return Object.entries(wordCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(entry => entry[0]);
  }

  // Transcribe audio file using Whisper API
  async transcribeAudio(filePath: string): Promise<string> {
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined in environment variables');
      }
      
      const formData = new FormData();
      formData.append('file', createReadStream(filePath));
      formData.append('model', 'whisper-1');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI Whisper API error: ${errorData}`);
      }
      
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio file');
    }
  }
}