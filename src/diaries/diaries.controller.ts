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
  NotFoundException,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DiariesService } from './diaries.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { DiaryConversationLogDto } from './dto/realtime-diary.dto';
import { VoiceDiaryDto, VoiceDiaryResponseDto, VoiceDiarySupplementDto } from './dto/voice-diary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('diaries')
@UseGuards(JwtAuthGuard)
export class DiariesController {
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
  
  @Get(':id/conversation')
  async getDiaryConversation(
    @Request() req,
    @Param('id') id: string
  ): Promise<DiaryConversationLogDto> {
    const userId = req.user?.id || 1; // Fallback user ID for testing
    const diary = await this.diariesService.findOne(+id, userId);
    
    if (!diary) {
      throw new NotFoundException(`ID가 ${id}인 일기를 찾을 수 없습니다.`);
    }
    
    return {
      messages: (diary.conversationLog || []) as any
    };
  }

  @Post('voice')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: (req, file, callback) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return callback(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createVoiceDiary(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() voiceDiaryDto: VoiceDiaryDto,
  ): Promise<VoiceDiaryResponseDto> {
    try {
      const userId = req.user?.id || 1; // Fallback user ID for testing
      
      if (!file) {
        return {
          success: false,
          message: 'No audio file uploaded',
        };
      }

      // Process the voice diary with the uploaded file
      return this.diariesService.processVoiceDiary(userId, file, voiceDiaryDto);
    } catch (error) {
      console.error('Error creating voice diary:', error);
      return {
        success: false,
        message: `Error creating voice diary: ${error.message}`,
      };
    }
  }

  @Post('voice/supplement')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: './uploads/audio',
        filename: (req, file, callback) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return callback(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async supplementVoiceDiary(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() supplementDto: VoiceDiarySupplementDto,
  ): Promise<VoiceDiaryResponseDto> {
    try {
      const userId = req.user?.id || 1; // Fallback user ID for testing
      
      if (!file) {
        return {
          success: false,
          message: 'No audio file uploaded',
        };
      }

      // Process the supplementary information
      return this.diariesService.processVoiceDiarySupplement(
        userId,
        file,
        supplementDto,
      );
    } catch (error) {
      console.error('Error supplementing voice diary:', error);
      return {
        success: false,
        message: `Error supplementing voice diary: ${error.message}`,
      };
    }
  }
}