import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SurveyResponse } from './survey-response.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity({ name: 'survey_answers' })
export class SurveyAnswer {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  answer_id: number;

  @Column({ type: 'uuid' })
  response_id: string;

  @ManyToOne(() => SurveyResponse, (response) => response.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'response_id' })
  response: SurveyResponse;

  @Column()
  question_id: number;

  @ManyToOne(() => SurveyQuestion)
  @JoinColumn({ name: 'question_id' })
  question: SurveyQuestion;

  @Column({ type: 'jsonb', nullable: true })
  answer_value: any;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  answered_at: Date;
}
