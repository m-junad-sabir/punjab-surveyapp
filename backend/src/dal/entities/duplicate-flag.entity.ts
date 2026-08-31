import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'duplicate_flags' })
export class DuplicateFlag {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  flag_id: number;

  @Column({ type: 'uuid' })
  response_id: string;

  @Column({ type: 'uuid', nullable: true })
  matched_unit_id: string;

  @Column({ type: 'text', nullable: true })
  match_reason: string;

  @Column({ default: false })
  is_resolved: boolean;

  @Column({ type: 'uuid', nullable: true })
  resolved_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date;
}
