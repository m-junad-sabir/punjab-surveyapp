import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'survey_responses' })
export class SurveyResponse {
  /** UUID is client-generated before sync — enables idempotent retry */
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  form_id: number;

  @Column({ type: 'uuid' })
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

  /** 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'RETURNED' | 'REJECTED' */
  @Column({ length: 20, default: 'DRAFT' })
  status: string;

  /** 'PENDING' | 'SYNCED' | 'FAILED' */
  @Column({ length: 20, default: 'PENDING' })
  sync_status: string;

  @Column({ type: 'timestamptz' })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submitted_at: Date;

  @Column({ type: 'uuid', nullable: true })
  confirmed_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  confirmed_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  synced_at: Date;

  @Column({ length: 20, nullable: true })
  app_version: string;
}
