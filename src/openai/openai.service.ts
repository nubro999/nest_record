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

  async analyzeDiary(content: string, date: string, structuredContent?: any): Promise<any> {
    try {
      console.log('OpenAI 분석 요청:');
      console.log('- 내용:', content);
      console.log('- 날짜:', date);
      
      // 구조화된 내용이 있는 경우 그것을 사용하고, 아니면 일반 콘텐츠를 시간대별로 분석
      const contentToAnalyze = structuredContent || content;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4', // 더 나은 분석을 위해 GPT-4 사용
        messages: [
          {
            role: 'system',
            content: `당신은 일기 분석 전문가입니다. 사용자의 일기를 분석하여 정확히 다음 JSON 형식으로 결과를 반환해야 합니다:
            {
              "keywords": ["키워드1", "키워드2", "키워드3"], // 일기에서 추출한 주요 키워드 3-5개
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
              "date": "${date}" // 입력받은 날짜 그대로 반환
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
        return {
          keywords: [],
          summary: {
            morning: "분석 불가",
            afternoon: "분석 불가",
            evening: "분석 불가"
          },
          question: "분석 중 오류가 발생했습니다",
          feelings: {
            emotion: "알 수 없음",
            reason: "분석 불가"
          },
          date: date
        };
      }
      console.log('OpenAI 분석 결과:', jsonContent);
      return JSON.parse(jsonContent);
      
    } catch (error) {
      console.error('OpenAI API 호출 중 오류 발생:', error);
      throw new Error('일기 분석 중 오류가 발생했습니다');
    }
  }
}
