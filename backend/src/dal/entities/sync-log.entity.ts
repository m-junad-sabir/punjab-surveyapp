import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sync_log' })
export class SyncLog {
  @PrimaryGeneratedColumn()
  sync_id: number;

  @Column({ length: 100 }) device_id: string;
  @Column('uuid') user_id: string;
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) sync_started_at: Date;
  @Column({ type: 'timestamptz', nullable: true }) sync_completed_at: Date;
  @Column({ default: 0 }) records_pushed: number;
  @Column({ length: 20, default: 'partial' }) status: string;
}
