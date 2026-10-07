import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'lookup_values' })
export class LookupValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type_id: number;

  @Column({ length: 80 })
  code: string;

  @Column({ type: 'text' })
  label: string;

  @Column({ default: false })
  requires_text: boolean;

  @Column({ type: 'numeric', nullable: true })
  numeric_value: number;

  @Column({ type: 'smallint', default: 0 })
  sort_order: number;

  @Column({ default: true })
  is_active: boolean;
}
