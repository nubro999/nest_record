import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Diary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'date' })
  date: Date;

  @ManyToOne(() => User, (user) => user.diaries)
  @JoinColumn()
  user: User;

  // 구조화된 일기 내용 (시간대별)
  @Column({ type: 'json', nullable: true })
  structuredContent: {
    morning: string;
    afternoon: string;
    evening: string;
  };

  // AI 분석 결과를 저장할 필드
  @Column({ type: 'json', nullable: true })
  analysis: any;

  // 분석 수행 여부를 저장하는 필드
  @Column({ default: false })
  isAnalyzed: boolean;

  // 일기 완성 여부
  @Column({ default: false })
  isComplete: boolean;
  
  // 대화 로그 저장
  @Column({ type: 'json', nullable: true })
  conversationLog: Array<any>; // Using any to be compatible with different formats
  
  // 대화 단계 (정보 수집 중, 질문 중, 완료)
  @Column({ 
    type: 'varchar',
    default: 'collecting_info'
  })
  conversationPhase: string;
  
  // 다음 질문 (AI가 사용자에게 물어볼 다음 질문)
  @Column({ type: 'text', nullable: true })
  nextQuestion: string;
  
  // 의미 있는 질문 (모든 정보 수집 후 하루에 대해 물어볼 질문)
  @Column({ type: 'text', nullable: true })
  meaningfulQuestion: string;
  
  // 의미 있는 질문에 대한 사용자 응답
  @Column({ type: 'text', nullable: true })
  meaningfulAnswer: string;
}