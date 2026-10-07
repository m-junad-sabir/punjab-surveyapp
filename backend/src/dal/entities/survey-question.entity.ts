import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SurveySection } from './survey-section.entity';

/**
 * answer_type values (from DB CHECK or app convention):
 *   TEXT, NUMBER, DATE, SELECT, MULTISELECT, BOOLEAN, GPS, PHOTO,
 *   PERCENTAGE_GROUP, MATRIX, REPEATING
 */
@Entity({ name: 'survey_questions' })
export class SurveyQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  section_id: number;

  @Column({ length: 30 })
  question_code: string;

  @Column({ length: 30, nullable: true })
  question_no: string;

  @Column({ type: 'text' })
  question_text: string;

  @Column({ length: 30 })
  answer_type: string;

  /** FK to lookup_types.id — the option list for SELECT/MULTISELECT questions */
  @Column({ nullable: true })
  lookup_type_id: number;

  @Column({ default: false })
  is_required: boolean;

  /** Which table/column this answer is stored in (section-specific tables) */
  @Column({ length: 80, nullable: true })
  stored_in: string;

  @ManyToOne(() => SurveySection, (s) => s.questions)
  @JoinColumn({ name: 'section_id' })
  section: SurveySection;
}
