// voice-diary.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class VoiceDiaryDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  additionalNotes?: string;
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
}

export class VoiceDiarySupplementDto {
  @IsString()
  diaryId: string;

  @IsString()
  supplementType: 'morning' | 'afternoon' | 'evening' | 'general';

  @IsString()
  content: string;
}