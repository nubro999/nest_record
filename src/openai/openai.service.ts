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

  async collectStructuredDiary(transcript: string, date: string): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `당신은 일기 작성을 도와주는 AI 비서입니다. 사용자의 음성 일기를 받아서 구조화하고, 
            필요한 정보가 부족한 경우 무엇이 부족한지 식별해야 합니다. 다음 JSON 형식으로 결과를 반환해주세요:
            
            {
              "structured_content": {
                "morning": "오전에 있었던 일에 대한 내용",
                "afternoon": "오후에 있었던 일에 대한 내용",
                "evening": "저녁에 있었던 일에 대한 내용"
              },
              "missing_information": ["부족한 정보1", "부족한 정보2"],
              "complete": false
            }
            
            만약 모든 정보가 충분하다면 "missing_information"은 빈 배열로, "complete"는 true로 설정하세요.
            각 시간대(morning, afternoon, evening)에 대한 정보가 없으면 해당 정보를 missing_information에 포함시키세요.
            일기 내용이 너무 짧거나 구체적이지 않다면 더 상세한 정보를 요청하세요.`
          },
          {
            role: 'user',
            content: transcript
          }
        ],
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
          complete: false
        };
      }
      
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error('일기 구조화 중 오류 발생:', error);
      throw new Error('일기 구조화 중 오류가 발생했습니다');
    }
  }

  async analyzeDiary(content: string, date?: string, structuredContent?: any): Promise<any> {
    try {
      console.log('OpenAI 분석 요청:');
      console.log('- 내용:', content?.substring(0, 50) + '...');
      console.log('- 날짜:', date);
      
      // 내용이 없는 경우 기본 값 반환
      if (!content || content.trim() === '') {
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
      
      // 개발 환경인 경우 또는 API 호출이 실패하더라도 앱이 작동할 수 있도록 모의 데이터 제공
      try {
        // 구조화된 내용이 있는 경우 그것을 사용하고, 아니면 일반 콘텐츠를 시간대별로 분석
        const contentToAnalyze = structuredContent || content;
        
        // model을 gpt-3.5-turbo로 변경해 볼 수 있음
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo', // GPT-4가 실패하면 gpt-3.5-turbo로 시도
          messages: [
            {
              role: 'system',
              content: `당신은 일기 분석 전문가입니다. 사용자의 일기를 분석하여 정확히 다음 JSON 형식으로 결과를 반환해야 합니다:
              {
                "keywords": ["키워드1", "키워드2", "키워드3"], 
                "summary": {
                  "morning": "오전에 있었던 일에 대한 요약",
                  "afternoon": "오후에 있었던 일에 대한 요약",
                  "evening": "저녁에 있었던 일에 대한 요약"
                },
                "question": "사용자에게 물어볼 질문 또는 조언",
                "feelings": {
                  "emotion": "주요 감정 (기쁨, 슬픔, 분노, 불안 등)",
                  "reason": "그 감정을 느낀 이유에 대한 분석"
                },
                "date": "${date}"
              }
              
              반드시 위 형식을 정확히 따라야 하며, 추가 텍스트나 설명 없이 JSON 형식만 반환하세요.`
            },
            {
              role: 'user',
              content: typeof contentToAnalyze === 'string' 
                ? contentToAnalyze 
                : `오전: ${contentToAnalyze.morning || ''}\n오후: ${contentToAnalyze.afternoon || ''}\n저녁: ${contentToAnalyze.evening || ''}`
            }
          ],
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
            morning: content.substring(0, 30) + '...',
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
