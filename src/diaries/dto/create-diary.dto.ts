// diaries/dto/create-diary.dto.ts
import { IsNotEmpty, IsArray, IsObject, IsDateString, IsOptional } from 'class-validator';

export class CreateDiaryDto {
  @IsArray()
  keywords: string[];

  @IsObject()
  summary: {
    morning: string;
    afternoon: string;
    night: string;
  };

  @IsOptional()
  question: string;

  @IsObject()
  feelings: {
    emotion: string;
    reason: string;
  };

  @IsDateString()
  date: string;
}


