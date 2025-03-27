import { IsArray, IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class ConversationLogEntryDto {
  @IsString()
  role: string;
  
  @IsString()
  content: string;
  
  @IsOptional()
  timestamp?: Date;
}

export class RealtimeDiaryDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  content: string;
  
  @IsArray()
  conversationLog: ConversationLogEntryDto[];
  
  @IsObject()
  @IsOptional()
  structuredContent?: {
    morning: string;
    afternoon: string;
    evening: string;
  };
}

export class DiaryConversationLogDto {
  @IsArray()
  messages: Array<{
    role: 'user' | 'assistant', 
    content: string, 
    timestamp?: Date
  }>;
}