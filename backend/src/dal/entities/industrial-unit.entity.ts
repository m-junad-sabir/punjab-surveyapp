import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'industrial_units' })
export class IndustrialUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, nullable: true })
  unit_code: string | null;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'smallint', nullable: true })
  establishment_year: number | null;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: { type: 'Point'; coordinates: [number, number] } | null;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  gps_accuracy_m: number | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'smallint', nullable: true })
  province_id: number | null;

  @Column({ type: 'text' })
  province_name: string;

  @Column({ nullable: true })
  division_id: number | null;

  @Column({ type: 'text' })
  division_name: string;

  @Column({ nullable: true })
  district_id: number | null;

  @Column({ type: 'text' })
  district_name: string;

  @Column({ nullable: true })
  tehsil_id: number | null;

  @Column({ type: 'text' })
  tehsil_name: string;

  @Column({ nullable: true })
  ownership_type_id: number | null;

  @Column({ nullable: true })
  legal_structure_id: number | null;

  @Column({ nullable: true })
  zone_type_id: number | null;

  @Column({ type: 'text', nullable: true })
  zone_type_other_text: string | null;

  @Column({ type: 'integer', nullable: true })
  psic_division_id: number | null;

  @Column({ type: 'text', nullable: true })
  psic_division_text: string | null;

  @Column({ type: 'integer', nullable: true })
  psic_group_id: number | null;

  @Column({ type: 'text', nullable: true })
  psic_group_text: string | null;

  @Column({ type: 'integer', nullable: true })
  psic_class_id: number | null;

  @Column({ type: 'text', nullable: true })
  psic_class_text: string | null;

  @Column({ nullable: true })
  industrial_estate_id: number | null;

  @Column({ type: 'text', nullable: true })
  industrial_estate_text: string | null;

  @Column({ nullable: true })
  industrial_cluster_id: number | null;

  @Column({ type: 'text', nullable: true })
  industrial_cluster_text: string | null;

  /** 'PENDING' | 'CONFIRMED' | 'RETURNED' | 'REJECTED' */
  @Column({ length: 20, default: 'PENDING' })
  approval_status: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
