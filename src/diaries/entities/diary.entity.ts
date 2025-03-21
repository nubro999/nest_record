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

  // 음성 파일 경로 저장 (선택사항)
  @Column({ nullable: true })
  audioFilePath: string;

  // AI 분석 결과를 저장할 필드
  @Column({ type: 'json', nullable: true })
  analysis: any;

  // 분석 수행 여부를 저장하는 필드
  @Column({ default: false })
  isAnalyzed: boolean;

  // 일기 완성 여부 (음성 -> 텍스트 -> 구조화 -> 분석 완료 상태)
  @Column({ default: false })
  isComplete: boolean;
}
