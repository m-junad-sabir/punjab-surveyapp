import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { SurveyForm } from './survey-form.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity({ name: 'survey_sections' })
export class SurveySection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  form_id: number;

  @Column({ type: 'char', length: 1 })
  section_code: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'smallint', default: 0 })
  sort_order: number;

  @ManyToOne(() => SurveyForm, (f) => f.sections)
  @JoinColumn({ name: 'form_id' })
  form: SurveyForm;

  @OneToMany(() => SurveyQuestion, (q) => q.section, { eager: false })
  questions: SurveyQuestion[];
}
