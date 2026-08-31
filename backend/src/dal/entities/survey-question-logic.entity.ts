import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SurveyQuestion } from './survey-question.entity';

@Entity({ name: 'survey_question_logic' })
export class SurveyQuestionLogic {
  @PrimaryGeneratedColumn()
  logic_id: number;

  @Column()
  question_id: number;

  @ManyToOne(() => SurveyQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: SurveyQuestion;

  @Column()
  condition_question_id: number;

  @ManyToOne(() => SurveyQuestion)
  @JoinColumn({ name: 'condition_question_id' })
  conditionQuestion: SurveyQuestion;

  @Column({ length: 10 })
  condition_operator: string;

  @Column({ type: 'text' })
  condition_value: string;

  @Column({ length: 15 })
  action: string;
}
