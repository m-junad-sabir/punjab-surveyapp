import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ length: 120 })
  full_name: string;

  @Column({ length: 80, nullable: true })
  designation: string;

  @Column({ unique: true, length: 120, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text' })
  password_hash: string;

  @Column({ type: 'smallint' })
  role_id: number;

  @Column({ type: 'uuid', nullable: true })
  supervisor_id: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'integer', default: 0 })
  token_version: number;

  @Column({ default: false })
  must_change_password: boolean;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deactivated_at: Date;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
