import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { SurveySection } from './survey-section.entity';

@Entity({ name: 'survey_forms' })
export class SurveyForm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ default: 1 })
  version: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => SurveySection, (s) => s.form, { eager: false })
  sections: SurveySection[];
}
