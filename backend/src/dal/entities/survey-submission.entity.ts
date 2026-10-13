import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'survey_submissions' })
export class SurveySubmission {
  @PrimaryGeneratedColumn('uuid')
  survey_id: string;

  @Column({ length: 50, unique: true })
  unit_code: string;

  @Column({ length: 50, nullable: true })
  survey_ref_no: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  interview_date: string;

  @Column({ length: 150 })
  enumerator_name: string;

  @Column({ type: 'text', nullable: true })
  enumerator_signature: string;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  coordinates_lat: number;

  @Column({ type: 'numeric', precision: 9, scale: 6 })
  coordinates_lng: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  gps_accuracy_m: number;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  geom: { type: 'Point'; coordinates: [number, number] };

  @Column({ type: 'text', nullable: true })
  photo_interview_session: string;

  @Column({ type: 'text', nullable: true })
  photo_entrance_signboard: string;

  @Column({ length: 100, nullable: true })
  device_id: string;

  @Column({ length: 20, default: 'draft' })
  sync_status: 'draft' | 'pending_sync' | 'synced' | 'rejected';

  @Column({ default: false })
  is_verified: boolean;

  @Column({ length: 100, nullable: true })
  verified_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
