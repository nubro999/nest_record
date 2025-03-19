import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Diary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column({ type: 'date' })
  date: Date;

  @ManyToOne(() => User, (user) => user.diaries)
  @JoinColumn()
  user: User;

  // AI 분석 결과를 저장할 필드 추가
  @Column({ type: 'json', nullable: true })
  analysis: any;

  // 분석 수행 여부를 저장하는 필드 (선택사항)
  @Column({ default: false })
  isAnalyzed: boolean;
}
