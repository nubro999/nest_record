import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Diary } from './entities/diary.entity';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { VoiceDiaryDto, VoiceDiaryResponseDto, VoiceDiarySupplementDto, ConversationPhase } from './dto/voice-diary.dto';
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

  async processVoiceDiary(
    userId: number,
    file: Express.Multer.File,
    voiceDiaryDto: VoiceDiaryDto,
  ): Promise<VoiceDiaryResponseDto> {
    try {
      const user = await this.usersService.findOne(userId);
      
      // Transcribe the audio file using OpenAI Whisper API
      const transcribedText = await this.openAiService.transcribeAudio(file.path);
      
      if (!transcribedText || transcribedText.trim() === '') {
        return {
          success: false,
          message: 'Transcription failed or returned empty text',
        };
      }
      
      // Initialize or update conversation history
      const conversationHistory = voiceDiaryDto.conversationHistory || [];
      conversationHistory.push({
        role: 'user',
        content: transcribedText,
      } as any); // Cast to any to bypass TypeScript check
      
      // Analyze the conversation to structure the diary content
      const analysis = this.openAiService.analyzeConversationLog(conversationHistory);
      
      // Create a diary entity
      const diary = this.diariesRepository.create({
        title: voiceDiaryDto.title || `Diary for ${voiceDiaryDto.date}`,
        date: new Date(voiceDiaryDto.date),
        content: transcribedText,
        user,
        conversationLog: conversationHistory,
        structuredContent: analysis.structuredContent,
        isAnalyzed: true,
        conversationPhase: ConversationPhase.COLLECTING_INFO,
      } as any);
      
      // Check if we have all the required information
      const missingInformation = [];
      
      if (!analysis.structuredContent.morning || analysis.structuredContent.morning.trim() === '') {
        missingInformation.push('morning');
      }
      
      if (!analysis.structuredContent.afternoon || analysis.structuredContent.afternoon.trim() === '') {
        missingInformation.push('afternoon');
      }
      
      if (!analysis.structuredContent.evening || analysis.structuredContent.evening.trim() === '') {
        missingInformation.push('evening');
      }

      // If we have all the required information, generate a meaningful question
      let conversationPhase = ConversationPhase.COLLECTING_INFO;
      let nextQuestion = null;
      let meaningfulQuestion = null;
      let isComplete = false;
      
      if (missingInformation.length === 0) {
        conversationPhase = ConversationPhase.ASKING_QUESTION;
        meaningfulQuestion = '오늘 하루에서 가장 의미 있었던 순간은 무엇인가요?'; // Default question
        (diary as any).meaningfulQuestion = meaningfulQuestion;
      } else {
        // Generate a question to ask for missing information
        if (missingInformation.includes('morning')) {
          nextQuestion = '오늘 아침에 무엇을 하셨나요?';
        } else if (missingInformation.includes('afternoon')) {
          nextQuestion = '오늘 오후에는 어떤 일들이 있었나요?';
        } else if (missingInformation.includes('evening')) {
          nextQuestion = '오늘 저녁에는 무엇을 하셨나요?';
        }
        (diary as any).nextQuestion = nextQuestion;
      }
      
      (diary as any).conversationPhase = conversationPhase;
      (diary as any).isComplete = isComplete;
      
      // Save the diary
      const savedDiary = await this.diariesRepository.save(diary);
      
      return {
        success: true,
        message: 'Voice diary processed successfully',
        diaryId: (savedDiary as any).id,
        missingInformation,
        complete: isComplete,
        conversationPhase: conversationPhase as any,
        nextQuestion,
        meaningfulQuestion,
        structuredContent: analysis.structuredContent,
      };
    } catch (error) {
      console.error('Error processing voice diary:', error);
      return {
        success: false,
        message: `Error processing voice diary: ${error.message}`,
      };
    }
  }

  async processVoiceDiarySupplement(
    userId: number,
    file: Express.Multer.File,
    supplementDto: VoiceDiarySupplementDto,
  ): Promise<VoiceDiaryResponseDto> {
    try {
      // Find the diary to supplement
      const diary = await this.findOne(+supplementDto.diaryId, userId);
      
      if (!diary) {
        return {
          success: false,
          message: `Diary with ID ${supplementDto.diaryId} not found`,
        };
      }
      
      // Transcribe the audio file
      const transcribedText = await this.openAiService.transcribeAudio(file.path);
      
      if (!transcribedText || transcribedText.trim() === '') {
        return {
          success: false,
          message: 'Transcription failed or returned empty text',
        };
      }
      
      // Update conversation history
      const conversationHistory = diary.conversationLog || [];
      conversationHistory.push({
        role: 'user',
        content: transcribedText,
      } as any); // Cast to any to bypass TypeScript check
      
      // Update the diary content based on the supplement type
      const structuredContent = diary.structuredContent || {
        morning: '',
        afternoon: '',
        evening: '',
      };
      
      if (supplementDto.supplementType === 'morning') {
        structuredContent.morning = transcribedText;
      } else if (supplementDto.supplementType === 'afternoon') {
        structuredContent.afternoon = transcribedText;
      } else if (supplementDto.supplementType === 'evening') {
        structuredContent.evening = transcribedText;
      } else if (supplementDto.supplementType === 'question_response') {
        diary.meaningfulAnswer = transcribedText;
      } else {
        // For 'general' type, append to the content
        diary.content = diary.content 
          ? `${diary.content}\n\n${transcribedText}`
          : transcribedText;
      }
      
      // Check if we have all the required information now
      const missingInformation = [];
      
      if (!structuredContent.morning || structuredContent.morning.trim() === '') {
        missingInformation.push('morning');
      }
      
      if (!structuredContent.afternoon || structuredContent.afternoon.trim() === '') {
        missingInformation.push('afternoon');
      }
      
      if (!structuredContent.evening || structuredContent.evening.trim() === '') {
        missingInformation.push('evening');
      }
      
      // Determine the conversation phase and next question
      let conversationPhase = diary.conversationPhase;
      let nextQuestion = null;
      let meaningfulQuestion = diary.meaningfulQuestion;
      let isComplete = false;
      
      // If we have all structural content but no meaningful answer yet
      if (missingInformation.length === 0 && !diary.meaningfulAnswer) {
        conversationPhase = ConversationPhase.ASKING_QUESTION;
        meaningfulQuestion = meaningfulQuestion || '오늘 하루에서 가장 의미 있었던 순간은 무엇인가요?';
      } 
      // If we have meaningful answer as well, diary is complete
      else if (missingInformation.length === 0 && diary.meaningfulAnswer) {
        conversationPhase = ConversationPhase.COMPLETE;
        isComplete = true;
      } 
      // Still collecting basic info
      else if (missingInformation.length > 0) {
        conversationPhase = ConversationPhase.COLLECTING_INFO;
        if (missingInformation.includes('morning')) {
          nextQuestion = '오늘 아침에 무엇을 하셨나요?';
        } else if (missingInformation.includes('afternoon')) {
          nextQuestion = '오늘 오후에는 어떤 일들이 있었나요?';
        } else if (missingInformation.includes('evening')) {
          nextQuestion = '오늘 저녁에는 무엇을 하셨나요?';
        }
      }
      
      // Update the diary
      diary.structuredContent = structuredContent;
      diary.conversationLog = conversationHistory;
      diary.conversationPhase = conversationPhase;
      diary.nextQuestion = nextQuestion;
      diary.meaningfulQuestion = meaningfulQuestion;
      diary.isComplete = isComplete;
      
      // Re-analyze if needed
      diary.analysis = this.openAiService.analyzeConversationLog(conversationHistory);
      diary.isAnalyzed = true;
      
      // Save the updated diary
      await this.diariesRepository.save(diary);
      
      return {
        success: true,
        message: 'Voice diary supplement processed successfully',
        diaryId: (diary as any).id,
        missingInformation,
        complete: isComplete,
        conversationPhase: conversationPhase as any,
        nextQuestion,
        meaningfulQuestion,
        structuredContent,
      };
    } catch (error) {
      console.error('Error processing voice diary supplement:', error);
      return {
        success: false,
        message: `Error processing voice diary supplement: ${error.message}`,
      };
    }
  }
}