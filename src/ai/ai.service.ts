// ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { Diary } from '../diaries/entities/diary.entity';

@Injectable()
export class AiService {
  async analyzeDiary(diary: Diary): Promise<any> {
    // 여기서는 간단한 분석 결과를 반환하지만,
    // 실제로는 외부 AI API를 호출하여 분석 결과를 얻을 수 있습니다.
    const emotionAnalysis = this.analyzeEmotion(diary.feelings.emotion);
    const keywordAnalysis = this.analyzeKeywords(diary.keywords);
    const adviceForQuestion = this.generateAdvice(diary.question);
    
    return {
      emotionAnalysis,
      keywordAnalysis,
      adviceForQuestion,
    };
  }

  private analyzeEmotion(emotion: string): string {
    // 감정 분석 로직
    const emotions = {
      '행복': '긍정적인 감정을 유지하고 있네요! 이런 기분을 더 오래 유지할 수 있도록 노력해보세요.',
      '슬픔': '슬픈 감정은 자연스러운 것입니다. 감정을 인정하고 스스로를 돌보는 시간을 가져보세요.',
      '분노': '분노는 내면의 경계가 침범되었음을 알려주는 신호일 수 있어요. 깊은 호흡을 통해 차분해지는 시간을 가져보세요.',
      '불안': '불안은 미래에 대한 걱정에서 비롯됩니다. 현재에 집중하는 마음챙김 연습을 해보세요.',
      '혼란': '혼란스러운 상황에서는 생각을 정리하는 시간이 필요합니다. 일기를 쓰는 것이 도움이 될 수 있어요.',
    };
    
    return emotions[emotion] || '감정을 더 자세히 분석하려면 더 많은 정보가 필요합니다.';
  }

  private analyzeKeywords(keywords: string[]): string {
    // 키워드 분석 로직
    const keywordThemes = {
      '수업': '학업에 관심을 두고 있군요.',
      '밥': '일상의 소소한 즐거움을 찾고 있네요.',
      '오빠': '인간관계가 중요한 부분을 차지하고 있어요.',
      '인심': '사람들과의 관계에서 정을 중요시하는 것 같아요.',
      '스트레스': '부담을 느끼고 있는 상황이 있네요. 스트레스 관리가 필요할 수 있어요.',
    };
    
    const analyses = keywords.map(keyword => keywordThemes[keyword] || `'${keyword}'에 관심이 있군요.`);
    return analyses.join(' ');
  }

  private generateAdvice(question: string): string {
    // 질문에 대한 조언 생성 로직
    if (!question) return '질문이 없습니다.';
    
    if (question.includes('의사소통') && question.includes('갈등')) {
      return '의사소통 문제로 인한 갈등은 대화의 방식을 바꾸는 것으로 시작해보세요. "나" 중심의 대화법을 사용하고, 상대방의 이야기를 경청하는 시간을 가져보세요. 또한 오해가 생길 수 있는 메시지보다는 직접 만나서 대화하는 것이 효과적일 수 있습니다.';
    }
    
    return '질문에 대한 답변을 생성하기 위해 더 많은 정보가 필요합니다.';
  }
}
