import { 
  Controller, 
  Get, 
  UseGuards, 
  Post,
  Body,
  Req,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OpenAiService } from './openai.service';
import { ConversationLogDto, ChatResponseDto } from './dto/chat.dto';
import { DiaryAnalysis } from '../common/interfaces/diary.interface';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly openaiService: OpenAiService) {}

  @UseGuards(JwtAuthGuard)
  @Get('token')
  async getRealtimeToken(@Req() req) {
    try {
      const token = await this.openaiService.generateRealtimeToken();
      return token;
    } catch (error) {
      throw new HttpException('Failed to generate realtime token', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('analyze')
  async analyzeConversation(@Body() data: ConversationLogDto): Promise<DiaryAnalysis> {
    try {
      if (!data.conversationLog) {
        throw new HttpException('Conversation log is required', HttpStatus.BAD_REQUEST);
      }
      
      const analysis = this.openaiService.analyzeConversationLog(data.conversationLog);
      
      // Add date if provided
      if (data.date) {
        (analysis as any).date = data.date;
      }
      
      return analysis;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to analyze conversation', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async saveChatHistory(@Body() data: ConversationLogDto): Promise<ChatResponseDto> {
    try {
      if (!data.conversationLog || data.conversationLog.length === 0) {
        throw new HttpException('Conversation log is required and cannot be empty', HttpStatus.BAD_REQUEST);
      }
      
      // Analyze the conversation
      const analysis = this.openaiService.analyzeConversationLog(data.conversationLog);
      
      // In a production app, you would save this to the database
      // For now, we're just returning the analysis
      return {
        success: true,
        message: 'Chat history processed successfully',
        chatId: `chat_${Date.now()}`, // Generate a random ID (would be a DB ID in production)
        analysis: {
          keywords: analysis.keywords,
          summary: analysis.summary,
          structuredContent: analysis.structuredContent,
          feelings: analysis.feelings,
          date: analysis.date
        } as DiaryAnalysis
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to save chat history', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}