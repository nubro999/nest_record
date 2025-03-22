import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Diary } from './entities/diary.entity';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { VoiceDiaryDto, VoiceDiaryResponseDto } from './dto/voice-diary.dto';
import { UsersService } from '../users/users.service';
import { OpenAiService } from '../openai/openai.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DiariesService {
  constructor(
    @InjectRepository(Diary)
    private diariesRepository: Repository<Diary>,
    private usersService: UsersService,
    private openAiService: OpenAiService,
    private dataSource: DataSource,
  ) {
    // 업로드 디렉토리 확인 및 생성
    const uploadDir = path.join(process.cwd(), 'uploads/audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

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
    
    // 음성 파일이 있다면 삭제
    if (diary.audioFilePath && fs.existsSync(diary.audioFilePath)) {
      fs.unlinkSync(diary.audioFilePath);
    }
    
    await this.diariesRepository.remove(diary);
  }

  async getAiAnalysis(id: number, userId: number): Promise<any> {
    const diary = await this.findOne(id, userId);
    console.log("start getAiAnalysis");
    
    // 이미 분석이 수행되었고 결과가 있는 경우 저장된 분석 결과를 반환
    if (diary.isAnalyzed && diary.analysis) {
      console.log('기존 분석 결과 반환:', diary.analysis);
      return diary.analysis;
    }
    
    try {
      // 날짜가 문자열인 경우 직접 사용, 객체인 경우 변환
      let dateStr: string;
      if (typeof diary.date === 'string') {
        dateStr = diary.date;
      } else if (diary.date instanceof Date) {
        dateStr = diary.date.toISOString().split('T')[0];
      } else {
        // 형식을 알 수 없는 경우 오늘 날짜 사용
        dateStr = new Date().toISOString().split('T')[0];
      }
      
      console.log("일기내용", diary.content);
      console.log("일기날짜", dateStr);
      
      // 구조화된 콘텐츠가 있으면 그것을 사용하고, 아니면 전체 내용 사용
      const analysisResult = await this.openAiService.analyzeDiary(
        diary.content, 
        dateStr,
        diary.structuredContent
      );
      
      // 분석 결과를 diary 객체에 저장
      diary.analysis = analysisResult;
      diary.isAnalyzed = true;
      
      // 변경된 diary 객체를 데이터베이스에 저장
      await this.diariesRepository.save(diary);
      
      return analysisResult;
    } catch (error) {
      console.error('분석 오류:', error);
      console.log('AI 분석 요청 데이터:', diary);
      throw new Error('일기 분석 중 오류가 발생했습니다');
    }
  }
  
  // 음성 일기 처리
  async processVoiceDiary(
    userId: number, 
    audioFilePath: string, 
    voiceDiaryDto: VoiceDiaryDto
  ): Promise<VoiceDiaryResponseDto> {
    try {
      // 1. 사용자 확인
      const user = await this.usersService.findOne(userId);
      
      // 2. 음성을 텍스트로 변환 (Whisper API 사용)
      const transcript = await this.openAiService.transcribeAudio(audioFilePath);
      
      if (!transcript || transcript.trim() === '') {
        return {
          success: false,
          message: '음성 인식에 실패했습니다. 다시 시도해주세요.',
        };
      }
      
      // 3. 텍스트를 구조화된 형식으로 변환 (시간대별 구분)
      const dateStr = voiceDiaryDto.date;
      const structuredResult = await this.openAiService.collectStructuredDiary(transcript, dateStr);
      
      // 4. 일기 엔티티 생성 및 저장
      const diary = this.diariesRepository.create({
        title: voiceDiaryDto.title || `${dateStr} 일기`,
        content: transcript, // 원본 텍스트 저장
        date: new Date(dateStr),
        user,
        audioFilePath,
        structuredContent: structuredResult.structured_content,
        isComplete: structuredResult.complete,
      });
      
      const savedDiary = await this.diariesRepository.save(diary);
      
      // 5. 응답 반환
      return {
        success: true,
        diaryId: savedDiary.id,
        message: structuredResult.complete 
          ? '일기가 성공적으로 작성되었습니다.' 
          : '일기가 작성되었으나 일부 정보가 부족합니다.',
        missingInformation: structuredResult.missing_information,
        complete: structuredResult.complete,
        structuredContent: structuredResult.structured_content,
      };
    } catch (error) {
      console.error('음성 일기 처리 중 오류:', error);
      
      // 음성 파일 삭제 시도
      try {
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
      } catch (e) {
        console.error('음성 파일 삭제 중 오류:', e);
      }
      
      throw error;
    }
  }
  
  // 일기 보충 정보 추가
  async supplementVoiceDiary(
    userId: number,
    diaryId: number,
    supplementType: 'morning' | 'afternoon' | 'evening' | 'general',
    textContent?: string | null,
    audioFilePath?: string
  ): Promise<VoiceDiaryResponseDto> {
    // 1. 일기 조회
    const diary = await this.findOne(diaryId, userId);
    
    if (!diary) {
      throw new NotFoundException(`ID가 ${diaryId}인 일기를 찾을 수 없습니다.`);
    }
    
    try {
      // 2. 텍스트 처리 (음성 파일이 제공된 경우 먼저 변환)
      let content = textContent || '';
      
      if (audioFilePath) {
        content = await this.openAiService.transcribeAudio(audioFilePath);
      }
      
      if (!content || content.trim() === '') {
        return {
          success: false,
          message: '텍스트 내용이 비어있습니다.',
          diaryId: diary.id,
        };
      }
      
      // 3. 기존 구조화된 콘텐츠 복사
      const structuredContent = diary.structuredContent ? { ...diary.structuredContent } : {
        morning: '',
        afternoon: '',
        evening: '',
      };
      
      // 4. 해당 시간대 또는 일반 내용 업데이트
      if (supplementType === 'general') {
        // 일반적인 내용은 전체 콘텐츠에 추가
        diary.content = diary.content ? `${diary.content}\n\n추가 정보: ${content}` : content;
      } else {
        // 특정 시간대 내용 업데이트
        structuredContent[supplementType] = structuredContent[supplementType]
          ? `${structuredContent[supplementType]}\n\n추가 정보: ${content}`
          : content;
      }
      
      diary.structuredContent = structuredContent;
      
      // 5. 누락된 정보 확인 및 완성 상태 업데이트
      // 날짜가 문자열인 경우 직접 사용, 객체인 경우 변환
      let dateStr: string;
      if (typeof diary.date === 'string') {
        dateStr = diary.date;
      } else if (diary.date instanceof Date) {
        dateStr = diary.date.toISOString().split('T')[0];
      } else {
        // 형식을 알 수 없는 경우 오늘 날짜 사용
        dateStr = new Date().toISOString().split('T')[0];
      }
      
      const updatedText = `오전: ${structuredContent.morning || ''}\n오후: ${structuredContent.afternoon || ''}\n저녁: ${structuredContent.evening || ''}`;
      
      const validationResult = await this.openAiService.collectStructuredDiary(updatedText, dateStr);
      
      diary.isComplete = validationResult.complete;
      
      // 6. 분석 결과 초기화 (내용이 변경되었으므로)
      diary.isAnalyzed = false;
      diary.analysis = null;
      
      // 7. 저장
      await this.diariesRepository.save(diary);
      
      // 8. 일기가 완성된 경우 분석 수행
      if (diary.isComplete) {
        // 비동기로 분석 시작 (응답을 기다리지 않음)
        this.getAiAnalysis(diary.id, userId).catch(err => 
          console.error(`일기 ID ${diary.id} 분석 중 오류:`, err)
        );
      }
      
      // 9. 응답 반환
      return {
        success: true,
        message: validationResult.complete
          ? '일기가 완성되었습니다.'
          : '추가 정보가 저장되었지만 아직 일부 정보가 부족합니다.',
        diaryId: diary.id,
        missingInformation: validationResult.missing_information,
        complete: validationResult.complete,
        structuredContent: validationResult.structured_content,
      };
    } catch (error) {
      console.error('일기 보충 중 오류:', error);
      
      // 새 음성 파일이 있다면 삭제 시도
      if (audioFilePath && fs.existsSync(audioFilePath)) {
        try {
          fs.unlinkSync(audioFilePath);
        } catch (e) {
          console.error('음성 파일 삭제 중 오류:', e);
        }
      }
      
      throw error;
    }
  }
  
  // 일기 완성 상태 확인
  async getDiaryCompletionStatus(
    userId: number,
    diaryId: number
  ): Promise<{ complete: boolean; missingInformation: string[] }> {
    const diary = await this.findOne(diaryId, userId);
    
    if (!diary) {
      throw new NotFoundException(`ID가 ${diaryId}인 일기를 찾을 수 없습니다.`);
    }
    
    if (diary.isComplete) {
      return {
        complete: true,
        missingInformation: [],
      };
    }
    
    // 구조화된 내용 확인
    const structuredContent = diary.structuredContent || {
      morning: '',
      afternoon: '',
      evening: '',
    };
    
    // 누락된 정보 식별
    const missingInformation: string[] = [];
    
    if (!structuredContent.morning || structuredContent.morning.trim() === '') {
      missingInformation.push('morning');
    }
    
    if (!structuredContent.afternoon || structuredContent.afternoon.trim() === '') {
      missingInformation.push('afternoon');
    }
    
    if (!structuredContent.evening || structuredContent.evening.trim() === '') {
      missingInformation.push('evening');
    }
    
    return {
      complete: false,
      missingInformation,
    };
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
