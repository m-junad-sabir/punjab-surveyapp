import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'duplicate_flags' })
export class DuplicateFlag {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid' })
  unit_id: string;

  @Column({ type: 'uuid' })
  matched_unit_id: string;

  @Column({ length: 30 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  name_similarity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  distance_m: number;

  /** 'OPEN' | 'CONFIRMED_DUPLICATE' | 'DISMISSED' */
  @Column({ length: 30, default: 'OPEN' })
  resolution: string;

  @Column({ type: 'uuid', nullable: true })
  resolved_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
