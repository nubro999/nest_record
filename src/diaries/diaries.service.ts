import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Diary } from './entities/diary.entity.js';
import { CreateDiaryDto } from './dto/create-diary.dto.js';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { UsersService } from '../users/users.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class DiariesService {
  constructor(
    @InjectRepository(Diary)
    private diariesRepository: Repository<Diary>,
    private usersService: UsersService,
    private aiService: AiService,
    private dataSource: DataSource, // DataSource 주입 추가
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
    
    const updatedDiary = this.diariesRepository.merge(diary, {
      ...updateDiaryDto,
      date: updateDiaryDto.date ? new Date(updateDiaryDto.date) : diary.date,
    });
    
    return this.diariesRepository.save(updatedDiary);
  }

  async remove(id: number, userId: number): Promise<void> {
    const diary = await this.findOne(id, userId);
    await this.diariesRepository.remove(diary);
  }

  async getAiAnalysis(id: number, userId: number): Promise<any> {
    const diary = await this.findOne(id, userId);
    return this.aiService.analyzeDiary(diary);
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