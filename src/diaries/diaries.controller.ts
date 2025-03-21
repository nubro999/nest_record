// diaries/diaries.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  Put, 
  UseGuards, 
  Request, 
  UploadedFile, 
  UseInterceptors,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DiariesService } from './diaries.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { VoiceDiaryDto, VoiceDiaryResponseDto, VoiceDiarySupplementDto } from './dto/voice-diary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('diaries')
@UseGuards(JwtAuthGuard)
export class DiariesController {
  private readonly logger = console;
  constructor(private readonly diariesService: DiariesService) {}

  @Post()
  async create(@Request() req, @Body() createDiaryDto: CreateDiaryDto) {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    console.log(`Creating diary for user ${userId}`);
    return this.diariesService.create(userId, createDiaryDto);
  }

  @Get()
  async findAll(@Request() req) {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    console.log(`Fetching all diaries for user ${userId}`);
    return this.diariesService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    console.log(`Fetching diary ${id} for user ${userId}`);
    return this.diariesService.findOne(+id, userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDiaryDto: UpdateDiaryDto, @Request() req) {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    console.log(`Updating diary ${id} for user ${userId}`);
    return this.diariesService.update(+id, userId, updateDiaryDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    console.log(`Deleting diary ${id} for user ${userId}`);
    return this.diariesService.remove(+id, userId);
  }

  @Get(':id/analysis')
  async getAiAnalysis(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    console.log(`Getting AI analysis for diary ${id} from user ${userId}`);
    return this.diariesService.getAiAnalysis(+id, userId);
  }
  
  @Post('voice')
  @UseInterceptors(FileInterceptor('audio', {
    storage: diskStorage({
      destination: './uploads/audio',
      filename: (req, file, cb) => {
        const randomName = Array(32)
          .fill(null)
          .map(() => Math.round(Math.random() * 16).toString(16))
          .join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.match(/\/(mpeg|mp4|wav|webm|ogg)$/)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Unsupported file type'), false);
      }
    },
  }))
  async createVoiceDiary(
    @Request() req,
    @Body() voiceDiaryDto: VoiceDiaryDto,
    @UploadedFile() file: Express.Multer.File
  ): Promise<VoiceDiaryResponseDto> {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }
    
    console.log(`Processing voice diary for user ${userId}, file: ${file.path}`);
    return this.diariesService.processVoiceDiary(userId, file.path, voiceDiaryDto);
  }
  
  @Post('voice/supplement')
  @UseInterceptors(FileInterceptor('audio', {
    storage: diskStorage({
      destination: './uploads/audio',
      filename: (req, file, cb) => {
        const randomName = Array(32)
          .fill(null)
          .map(() => Math.round(Math.random() * 16).toString(16))
          .join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async supplementVoiceDiary(
    @Request() req,
    @Body() supplementDto: VoiceDiarySupplementDto,
    @UploadedFile() file?: Express.Multer.File
  ): Promise<VoiceDiaryResponseDto> {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    
    // Can supplement with either voice or text
    if (file) {
      console.log(`Supplementing voice diary ${supplementDto.diaryId} with audio for user ${userId}`);
      return this.diariesService.supplementVoiceDiary(
        userId, 
        +supplementDto.diaryId, 
        supplementDto.supplementType, 
        null, 
        file.path
      );
    } else if (supplementDto.content) {
      console.log(`Supplementing voice diary ${supplementDto.diaryId} with text for user ${userId}`);
      return this.diariesService.supplementVoiceDiary(
        userId, 
        +supplementDto.diaryId, 
        supplementDto.supplementType, 
        supplementDto.content
      );
    } else {
      throw new BadRequestException('Either audio file or text content is required');
    }
  }
  
  @Get(':id/completion-status')
  async getDiaryCompletionStatus(
    @Request() req,
    @Param('id') id: string
  ): Promise<{ complete: boolean; missingInformation: string[] }> {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    console.log(`Checking completion status for diary ${id} from user ${userId}`);
    return this.diariesService.getDiaryCompletionStatus(userId, +id);
  }
}