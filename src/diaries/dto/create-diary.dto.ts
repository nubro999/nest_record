// diaries/dto/create-diary.dto.ts
import { IsString, IsNotEmpty, IsArray, IsObject, IsDateString, IsOptional } from 'class-validator';

export class CreateDiaryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string; // 일기 내용 필드 추가

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  mood?: string;

  // 기존 필드들...
  @IsArray()
  keywords: string[];

  @IsObject()
  summary: {
    morning: string;
    afternoon: string;
    evening: string;
  };

  @IsOptional()
  question: string;

  @IsObject()
  feelings: {
    emotion: string;
    reason: string;
  };
}


