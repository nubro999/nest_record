// diaries/dto/create-diary.dto.ts
import { IsString, IsNotEmpty, IsArray, IsObject, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDiaryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  mood?: string;

  @IsArray()
  @IsOptional()
  keywords?: string[];

  @IsObject()
  @IsOptional()
  summary?: {
    morning: string;
    afternoon: string;
    evening: string;
  };

  @IsString()
  @IsOptional()
  question?: string;

  @IsObject()
  @IsOptional()
  feelings?: {
    emotion: string;
    reason: string;
  };
  
  @IsArray()
  @IsOptional()
  conversationLog?: Array<any>; // Make it compatible with any conversation log format
  
  @IsObject()
  @IsOptional()
  structuredContent?: {
    morning: string;
    afternoon: string;
    evening: string;
  };
  
  @IsBoolean()
  @IsOptional()
  isAnalyzed?: boolean;
}