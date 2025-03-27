import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';
import { ConversationLogEntry, DiaryAnalysis } from '../../common/interfaces/diary.interface';

export class ChatMessageDto implements ConversationLogEntry {
  @IsString()
  role: 'user' | 'assistant';
  
  @IsString()
  content: string;
  
  @IsOptional()
  timestamp?: Date;
}

export class ConversationLogDto {
  @IsArray()
  conversationLog: ChatMessageDto[];
  
  @IsOptional()
  @IsDateString()
  date?: string;
  
  @IsOptional()
  @IsString()
  title?: string;
}

export class ChatResponseDto {
  success: boolean;
  message: string;
  chatId?: string;
  
  @IsOptional()
  analysis?: DiaryAnalysis;
}