// diaries/entities/diary.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
@Entity()
export class Diary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('simple-array')
  keywords: string[];

  @Column('json')
  summary: {
    morning: string;
    afternoon: string;
    night: string;
  };

  @Column({ nullable: true })
  question: string;

  @Column('json')
  feelings: {
    emotion: string;
    reason: string;
  };

  @Column({ type: 'date' })
  date: Date;

  @ManyToOne(() => User, user => user.diaries)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
