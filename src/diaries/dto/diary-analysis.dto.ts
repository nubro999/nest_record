import { IsArray, IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class DiaryAnalysisDto {
  @IsArray()
  keywords: string[];

  @IsObject()
  summary: {
    morning: string;
    afternoon: string;
    evening: string; // Changed from 'night' to 'evening' to be consistent
  };

  @IsOptional()
  @IsString()
  question: string;

  @IsObject()
  feelings: {
    emotion: string;
    reason: string;
  };

  @IsDateString()
  date: string;
}
