// voice-diary.dto.ts
import { IsArray, IsDateString, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class VoiceDiaryDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  additionalNotes?: string;
  
  @IsArray()
  @IsOptional()
  conversationHistory?: Array<{role: string, content: string}>;
}

export enum ConversationPhase {
  COLLECTING_INFO = 'collecting_info',
  ASKING_QUESTION = 'asking_question',
  COMPLETE = 'complete'
}

export class VoiceDiaryResponseDto {
  success: boolean;
  message: string;
  diaryId?: number;
  missingInformation?: string[];
  complete?: boolean;
  structuredContent?: {
    morning: string;
    afternoon: string;
    evening: string;
  };
  conversationPhase?: ConversationPhase;
  nextQuestion?: string;
  meaningfulQuestion?: string;
}

export class VoiceDiarySupplementDto {
  @IsString()
  diaryId: string;

  @IsString()
  @IsEnum(['morning', 'afternoon', 'evening', 'general', 'question_response'])
  supplementType: 'morning' | 'afternoon' | 'evening' | 'general' | 'question_response';

  @IsString()
  content: string;
  
  @IsArray()
  @IsOptional()
  conversationHistory?: Array<{role: string, content: string}>;
}

export class DiaryConversationLogDto {
  @IsArray()
  messages: Array<{
    role: 'user' | 'assistant', 
    content: string, 
    timestamp?: Date
  }>;
}