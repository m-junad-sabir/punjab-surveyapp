import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'industrial_units' })
export class IndustrialUnit {
  @PrimaryGeneratedColumn('uuid')
  unit_id: string;

  @Column({ unique: true, length: 30 })
  unit_code: string;

  @Column({ length: 200 })
  unit_name: string;

  @Column({ nullable: true })
  sector_id: number;

  @Column({ nullable: true })
  estate_id: number;

  @Column({ nullable: true })
  cluster_id: number;

  @Column({ nullable: true })
  province_id: number;

  @Column({ nullable: true })
  division_id: number;

  @Column({ nullable: true })
  district_id: number;

  @Column({ nullable: true })
  tehsil_id: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 150, nullable: true })
  contact_person: string;

  @Column({ length: 20, nullable: true })
  contact_phone: string;

  @Column({ length: 150, nullable: true })
  contact_email: string;

  @Column({ length: 30, nullable: true })
  ownership_type: string;

  @Column({ nullable: true })
  employment_size: number;

  @Column({ length: 20, default: 'Unverified' })
  operational_status: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  geom: any;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  gps_accuracy_m: number;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ nullable: true })
  verified_by: string;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ nullable: true })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
