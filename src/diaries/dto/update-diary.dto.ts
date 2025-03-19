// diaries/dto/update-diary.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDiaryDto } from './create-diary.dto';

export class UpdateDiaryDto extends PartialType(CreateDiaryDto) {}