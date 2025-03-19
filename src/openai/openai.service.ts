import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzeDiary(content: string, date: string): Promise<any> {
    try {
      console.log('OpenAI 분석 요청:');
      console.log('- 내용:', content);
      console.log('- 날짜:', date);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // 또는 사용 가능한 다른 모델
        messages: [
          {
            role: 'system',
            content: `당신은 일기 분석 전문가입니다. 사용자의 일기를 분석하여 정확히 다음 JSON 형식으로 결과를 반환해야 합니다:
            {
              "keywords": ["키워드1", "키워드2", "키워드3"], // 일기에서 추출한 주요 키워드 3-5개
              "summary": {
                "morning": "오전에 있었던 일에 대한 요약",
                "afternoon": "오후에 있었던 일에 대한 요약",
                "night": "저녁에 있었던 일에 대한 요약"
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
            content: content
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
            night: "분석 불가"
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
