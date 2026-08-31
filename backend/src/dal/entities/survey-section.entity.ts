import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { SurveyForm } from './survey-form.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity({ name: 'survey_sections' })
export class SurveySection {
  @PrimaryGeneratedColumn()
  section_id: number;

  @Column()
  form_id: number;

  @ManyToOne(() => SurveyForm, (form) => form.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: SurveyForm;

  @Column({ length: 150 })
  title: string;

  @Column({ default: 0 })
  sort_order: number;

  @OneToMany(() => SurveyQuestion, (question) => question.section)
  questions: SurveyQuestion[];
}
