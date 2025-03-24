import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';

@Injectable()
export class OpenAiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async transcribeAudio(audioFilePath: string): Promise<string> {
    try {
      const audioFile = fs.createReadStream(audioFilePath);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "ko",
      });
      
      return transcription.text;
    } catch (error) {
      console.error('Whisper 음성 인식 중 오류 발생:', error);
      throw new Error('음성 인식 중 오류가 발생했습니다');
    }
  }

  async collectStructuredDiary(transcript: string, date: string, conversationHistory?: any[]): Promise<any> {
    try {
      // Build conversation messages with history if provided
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: `당신은 일기 작성을 도와주는 AI 비서입니다. 사용자의 일기를 실시간으로 분석하여 아침, 오후, 저녁 시간대별로 구조화하고, 
          부족한 정보가 있으면 사용자에게 질문해야 합니다. 대화를 통해 모든 정보를 수집한 후에는 그날에 대한 의미 있는 질문을 해주세요.

          당신의 역할:
          1. 시간대별(아침, 오후, 저녁) 활동을 분석하고 구조화하기
          2. 부족한 정보가 있으면 구체적인 질문하기 (예: "오전에 무엇을 하셨나요?")
          3. 모든 시간대 정보가 충분하면 대화를 마무리하고 그날에 대한 의미 있는 질문하기
          4. 대화 내용과 사용자의 응답을 기록하기

          다음 JSON 형식으로 결과를 반환해주세요:
          
          {
            "structured_content": {
              "morning": "오전에 있었던 일에 대한 내용",
              "afternoon": "오후에 있었던 일에 대한 내용",
              "evening": "저녁에 있었던 일에 대한 내용"
            },
            "missing_information": ["부족한 정보1", "부족한 정보2"],
            "complete": false,
            "conversation_phase": "collecting_info | asking_question | complete",
            "next_question": "사용자에게 물어볼 다음 질문",
            "meaningful_question": "모든 정보가 수집되었을 때 하루에 대한 의미 있는 질문"
          }
          
          conversation_phase는 다음 중 하나여야 합니다:
          - "collecting_info": 아직 정보 수집 중
          - "asking_question": 모든 시간대 정보가 수집되어 의미 있는 질문을 하는 단계
          - "complete": 모든 대화가 완료됨

          정보가 부족한 경우 missing_information에 해당 항목을 포함시키고, next_question에 물어볼 질문을 설정하세요.
          모든 시간대 정보가 충분하면 conversation_phase를 "asking_question"으로 설정하고 meaningful_question을 포함하세요.
          모든 대화가, meaningful_question에 대한 응답까지 완료되면 conversation_phase를 "complete"로 설정하세요.`
        }
      ];

      // Add conversation history if provided
      if (conversationHistory && conversationHistory.length > 0) {
        // Make sure each entry has the correct role type for OpenAI API
        const typedConversationHistory = conversationHistory.map(msg => ({
          role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
          content: msg.content
        } as { role: 'system' | 'user' | 'assistant'; content: string }));
        
        messages.push(...typedConversationHistory);
      }

      // Add the current transcript
      messages.push({
        role: 'user',
        content: transcript
      } as { role: 'system' | 'user' | 'assistant'; content: string });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        response_format: { type: 'json_object' }
      });

      const jsonContent = response.choices[0].message.content;
      
      if (!jsonContent) {
        console.error('OpenAI API 응답이 비어있습니다');
        return {
          structured_content: {
            morning: "",
            afternoon: "",
            evening: ""
          },
          missing_information: ["모든 정보"],
          complete: false,
          conversation_phase: "collecting_info",
          next_question: "오늘 하루 어떻게 보내셨나요? 아침, 오후, 저녁으로 나눠서 말씀해 주시겠어요?"
        };
      }
      
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('일기 구조화 중 오류 발생:', error);
      throw new Error('일기 구조화 중 오류가 발생했습니다');
    }
  }

  async analyzeDiary(content: string, date?: string, structuredContent?: any, conversationLog?: any): Promise<any> {
    try {
      console.log('OpenAI 분석 요청:');
      console.log('- 내용:', content?.substring(0, 50) + '...');
      console.log('- 날짜:', date);
      
      // 내용이 없는 경우 기본 값 반환
      if ((!content || content.trim() === '') && (!structuredContent || !Object.values(structuredContent).some(v => v))) {
        console.log('일기 내용이 비어있습니다. 기본 분석 결과 반환');
        return {
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
          date: date
        };
      }
      
      try {
        // 구조화된 내용이 있는 경우 그것을 사용하고, 아니면 일반 콘텐츠를 시간대별로 분석
        const contentToAnalyze = structuredContent || content;
        
        let messageContent = '';
        
        if (typeof contentToAnalyze === 'string') {
          messageContent = contentToAnalyze;
        } else {
          messageContent = `오전: ${contentToAnalyze.morning || '정보 없음'}\n오후: ${contentToAnalyze.afternoon || '정보 없음'}\n저녁: ${contentToAnalyze.evening || '정보 없음'}`;
        }
        
        // 대화 로그가 있으면 추가
        if (conversationLog) {
          messageContent += '\n\n대화 내용:\n' + 
            (Array.isArray(conversationLog) 
              ? conversationLog.map(msg => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`).join('\n')
              : typeof conversationLog === 'string' 
                ? conversationLog
                : JSON.stringify(conversationLog));
        }

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          {
            role: 'system',
            content: `당신은 일기 분석 전문가입니다. 사용자의 일기와 대화 내용을 종합적으로 분석하여 정확히 다음 JSON 형식으로 결과를 반환해야 합니다:
            {
              "keywords": ["키워드1", "키워드2", "키워드3"], 
              "summary": {
                "morning": "오전에 있었던 일에 대한 요약",
                "afternoon": "오후에 있었던 일에 대한 요약",
                "evening": "저녁에 있었던 일에 대한 요약"
              },
              "question": "하루 마무리 질문에 대한 사용자 응답",
              "feelings": {
                "emotion": "주요 감정 (기쁨, 슬픔, 분노, 불안 등)",
                "reason": "그 감정을 느낀 이유에 대한 분석"
              },
              "date": "${date}"
            }
            
            아래 사항을 반드시 지켜주세요:
            1. 일기와 대화 내용을 모두 종합하여 분석하세요
            2. 키워드는 3-5개로 추출하고, 구체적인 활동이나 감정을 나타내는 단어로 선택하세요
            3. 각 시간대 요약은 간결하게 작성하되, 주요 활동과 감정을 포함해야 합니다
            4. question 필드에는 사용자가 하루 마무리 질문에 대한 응답을 기록하세요
            5. 감정 분석은 구체적인 감정과 그 이유를 명확히 파악하세요
            
            반드시 위 형식을 정확히 따라야 하며, 추가 텍스트나 설명 없이 JSON 형식만 반환하세요.`
          },
          {
            role: 'user',
            content: messageContent
          }
        ];
        
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o', // Use gpt-4o for better analysis
          messages,
          response_format: { type: 'json_object' }
        });

        // OpenAI의 응답에서 JSON 문자열 추출 및 null 체크
        const jsonContent = response.choices[0].message.content;
        
        // null이나 undefined인 경우 기본값 반환
        if (!jsonContent) {
          console.error('OpenAI API 응답이 비어있습니다');
          throw new Error('Empty response from OpenAI');
        }
        console.log('OpenAI 분석 결과:', jsonContent.substring(0, 100) + '...');
        return JSON.parse(jsonContent);
      } catch (apiError) {
        console.error('OpenAI API 호출 중 오류 발생:', apiError);
        // API 오류 발생 시 기본 분석 결과 반환
        return {
          keywords: ["일상", "기록"],
          summary: {
            morning: typeof content === 'string' ? content.substring(0, 30) + '...' : "정보 없음",
            afternoon: "사용자의 일기 내용",
            evening: "사용자의 일기 내용" 
          },
          question: "오늘 하루 중 가장 인상 깊었던 일은 무엇인가요?",
          feelings: {
            emotion: "다양함",
            reason: "일기에 담긴 다양한 감정 표현"
          },
          date: date
        };
      }
    } catch (error) {
      console.error('일기 분석 중 치명적인 오류 발생:', error);
      // 어떤 경우든 오류가 발생해도 기본값 반환하여 앱이 중단되지 않도록 함
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
        date: date
      };
    }
  }
}
