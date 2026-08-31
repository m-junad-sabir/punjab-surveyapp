import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn()
  role_id: number;

  @Column({ unique: true, length: 50 })
  role_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
