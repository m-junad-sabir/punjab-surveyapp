import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { SurveyAnswer } from './survey-answer.entity';

@Entity({ name: 'survey_responses' })
export class SurveyResponse {
  @PrimaryColumn('uuid')
  response_id: string;

  @Column()
  form_id: number;

  @Column({ type: 'uuid', nullable: true })
  unit_id: string;

  @Column({ type: 'uuid' })
  surveyor_id: string;

  @Column({ length: 100, nullable: true })
  device_id: string;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  gps_lat: number;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  gps_lng: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  gps_accuracy_m: number;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date;

  @Column({ length: 15, default: 'draft' })
  sync_status: string;

  @Column({ default: true })
  is_offline_capture: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  completeness_score: number;

  @Column({ default: false })
  is_duplicate: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => SurveyAnswer, (answer) => answer.response)
  answers: SurveyAnswer[];
}
