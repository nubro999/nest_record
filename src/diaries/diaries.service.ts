import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Diary } from './entities/diary.entity';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { UsersService } from '../users/users.service';
import { OpenAiService } from '../openai/openai.service';

@Injectable()
export class DiariesService {
  constructor(
    @InjectRepository(Diary)
    private diariesRepository: Repository<Diary>,
    private usersService: UsersService,
    private openAiService: OpenAiService, // AiService에서 OpenAiService로 변경
    private dataSource: DataSource,
  ) {}

  async create(userId: number, createDiaryDto: CreateDiaryDto): Promise<Diary> {
    const user = await this.usersService.findOne(userId);
    
    const diary = this.diariesRepository.create({
      ...createDiaryDto,
      date: new Date(createDiaryDto.date),
      user,
    });
    
    return this.diariesRepository.save(diary);
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
      // 내용이 변경된 경우 분석 결과 초기화
      ...(contentChanged ? { analysis: null, isAnalyzed: false } : {}),
    });
    
    return this.diariesRepository.save(updatedDiary);
  }

  async remove(id: number, userId: number): Promise<void> {
    const diary = await this.findOne(id, userId);
    await this.diariesRepository.remove(diary);
  }

  async getAiAnalysis(id: number, userId: number): Promise<any> {
    const diary = await this.findOne(id, userId);
    
    // 이미 분석이 수행되었고 결과가 있는 경우 저장된 분석 결과를 반환 (선택사항)
    if (diary.isAnalyzed && diary.analysis) {
      console.log('기존 분석 결과 반환:', diary.analysis);
      return diary.analysis;
    }
    
    // 어떤 형식이든 Date 객체로 변환 시도
    let dateObj;
    try {
      dateObj = diary.date instanceof Date 
        ? diary.date 
        : new Date(diary.date);
      
      const dateStr = dateObj.toISOString().split('T')[0];
      console.log("일기내용", diary.content);
      
      // OpenAI 서비스를 통해 분석 수행
      const analysisResult = await this.openAiService.analyzeDiary(diary.content, dateStr);
      
      // 분석 결과를 diary 객체에 저장
      diary.analysis = analysisResult;
      diary.isAnalyzed = true;
      
      // 변경된 diary 객체를 데이터베이스에 저장
      await this.diariesRepository.save(diary);
      
      return analysisResult;
    } catch (error) {
      console.error('분석 오류:', error);
      
      // 오류 발생 시 현재 날짜 사용
      const today = new Date().toISOString().split('T')[0];
      const analysisResult = await this.openAiService.analyzeDiary(diary.content, today);
      
      // 분석 결과를 diary 객체에 저장
      diary.analysis = analysisResult;
      diary.isAnalyzed = true;
      
      // 변경된 diary 객체를 데이터베이스에 저장
      await this.diariesRepository.save(diary);
      
      return analysisResult;
    }
  }
  
  

  async createWithTransaction(userId: number, createDiaryDto: CreateDiaryDto): Promise<Diary> {
    const queryRunner = this.dataSource.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const user = await this.usersService.findOne(userId);
      
      const diary = queryRunner.manager.create(Diary, {
        ...createDiaryDto,
        date: new Date(createDiaryDto.date),
        user,
      });
      
      const savedDiary = await queryRunner.manager.save(diary);
      
      // 다른 관련 작업들...
      
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
