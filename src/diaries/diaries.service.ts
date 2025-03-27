import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Diary } from './entities/diary.entity';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { UsersService } from '../users/users.service';
import { OpenAiService } from '../openai/openai.service';
import { DiaryAnalysis } from '../common/interfaces/diary.interface';

@Injectable()
export class DiariesService {
  constructor(
    @InjectRepository(Diary)
    private diariesRepository: Repository<Diary>,
    private usersService: UsersService,
    private openAiService: OpenAiService,
    private dataSource: DataSource,
  ) {}

  async create(userId: number, createDiaryDto: CreateDiaryDto): Promise<Diary> {
    const user = await this.usersService.findOne(userId);
    
    // If we have conversation logs, analyze them
    if (createDiaryDto.conversationLog && createDiaryDto.conversationLog.length > 0) {
      // Use the simplified content analyzer
      const analysis = this.openAiService.analyzeConversationLog(createDiaryDto.conversationLog as any);
      
      // Update the diary with analysis
      if (!createDiaryDto.structuredContent && analysis.structuredContent) {
        createDiaryDto.structuredContent = analysis.structuredContent;
      }
      
      // Create an isAnalyzed flag for realtime diaries
      createDiaryDto.isAnalyzed = true;
    }
    
    const diary = this.diariesRepository.create({
      ...createDiaryDto,
      date: new Date(createDiaryDto.date),
      user,
    } as any); // Add 'as any' to bypass TypeScript checking here
    
    const result = await this.diariesRepository.save(diary as any);
    return result;
  }

  async findAll(userId: number): Promise<Diary[]> {
    return this.diariesRepository.find({
      where: { user: { id: userId } },
      order: { date: 'DESC' },
    });
  }

  async findOne(id: number, userId: number): Promise<Diary> {
    const diary = await this.diariesRepository.findOne({
      where: { id, user: { id: userId } },
    });
    
    if (!diary) {
      throw new NotFoundException(`Diary with ID ${id} not found`);
    }
    
    return diary;
  }

  async update(id: number, userId: number, updateDiaryDto: UpdateDiaryDto): Promise<Diary> {
    const diary = await this.findOne(id, userId);
    
    const contentChanged = updateDiaryDto.content && updateDiaryDto.content !== diary.content;
    
    const updatedDiary = this.diariesRepository.merge(diary, {
      ...updateDiaryDto,
      date: updateDiaryDto.date ? new Date(updateDiaryDto.date) : diary.date,
      // Reset analysis if content changed
      ...(contentChanged ? { analysis: null, isAnalyzed: false } : {}),
    } as any); // Add 'as any' to bypass TypeScript checking
    
    return this.diariesRepository.save(updatedDiary);
  }

  async remove(id: number, userId: number): Promise<void> {
    const diary = await this.findOne(id, userId);
    await this.diariesRepository.remove(diary);
  }

  async getAiAnalysis(id: number, userId: number): Promise<DiaryAnalysis> {
    const diary = await this.findOne(id, userId);
    
    // Return existing analysis if available
    if (diary.isAnalyzed && diary.analysis) {
      return diary.analysis;
    }
    
    try {
      // Format date
      let dateStr: string;
      if (typeof diary.date === 'string') {
        dateStr = diary.date;
      } else if (diary.date instanceof Date) {
        dateStr = diary.date.toISOString().split('T')[0];
      } else {
        dateStr = new Date().toISOString().split('T')[0];
      }
      
      // If we have conversation logs, analyze them
      let analysis;
      if (diary.conversationLog && diary.conversationLog.length > 0) {
        analysis = this.openAiService.analyzeConversationLog(diary.conversationLog as any);
        analysis.date = dateStr as string;
      } else {
        // Return default analysis for empty diaries
        analysis = {
          keywords: ["일상"],
          summary: {
            morning: "내용 없음",
            afternoon: "내용 없음",
            evening: "내용 없음"
          },
          question: "오늘 하루는 어땠나요?",
          feelings: {
            emotion: "중립",
            reason: "분석할 내용이 충분하지 않습니다."
          },
          date: dateStr
        };
      }
      
      // Save the analysis
      diary.analysis = analysis;
      diary.isAnalyzed = true;
      await this.diariesRepository.save(diary);
      
      return analysis;
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        keywords: ["일상"],
        summary: {
          morning: "내용 요약 실패",
          afternoon: "내용 요약 실패",
          evening: "내용 요약 실패"
        },
        question: "오늘 하루는 어땠나요?",
        feelings: {
          emotion: "알 수 없음",
          reason: "분석 실패"
        },
        date: diary.date
      };
    }
  }

  async createWithTransaction(userId: number, createDiaryDto: CreateDiaryDto): Promise<Diary> {
    const queryRunner = this.dataSource.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const user = await this.usersService.findOne(userId);
      
      // Use type assertion to bypass TypeScript checking
      const diary = queryRunner.manager.create(Diary, {
        ...createDiaryDto,
        date: new Date(createDiaryDto.date),
        user,
      } as any);
      
      const savedDiary = await queryRunner.manager.save(diary);
      
      await queryRunner.commitTransaction();
      return savedDiary;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}