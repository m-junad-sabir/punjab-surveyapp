import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SurveySection } from './survey-section.entity';

@Entity({ name: 'survey_questions' })
export class SurveyQuestion {
  @PrimaryGeneratedColumn()
  question_id: number;

  @Column()
  section_id: number;

  @ManyToOne(() => SurveySection, (section) => section.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section: SurveySection;

  @Column({ length: 30 })
  question_code: string;

  @Column({ type: 'text' })
  question_text: string;

  @Column({ length: 20 })
  question_type: string;

  @Column({ default: false })
  is_mandatory: boolean;

  @Column({ type: 'jsonb', nullable: true })
  validation_rule: any;

  @Column({ type: 'jsonb', nullable: true })
  options: any;

  @Column({ default: 0 })
  sort_order: number;
}
