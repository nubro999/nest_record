import { IsArray, IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class DiaryAnalysisDto {
  @IsArray()
  keywords: string[];

  @IsObject()
  summary: {
    morning: string;
    afternoon: string;
    night: string;
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
