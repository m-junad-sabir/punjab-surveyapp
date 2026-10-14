import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

/** Stores SELECT / MULTISELECT / BOOLEAN answers as lookup_value references */
@Entity({ name: 'response_choices' })
export class ResponseChoice {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'uuid' })
  response_id: string;

  @Column()
  question_id: number;

  @Column({ nullable: true })
  option_id: number;

  @Column({ type: 'text', nullable: true })
  other_text: string;
}
