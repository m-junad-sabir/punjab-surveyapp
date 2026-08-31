import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { SurveySection } from './survey-section.entity';

@Entity({ name: 'survey_forms' })
export class SurveyForm {
  @PrimaryGeneratedColumn()
  form_id: number;

  @Column({ length: 150 })
  title: string;

  @Column({ length: 20 })
  version: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @OneToMany(() => SurveySection, (section) => section.form)
  sections: SurveySection[];
}
