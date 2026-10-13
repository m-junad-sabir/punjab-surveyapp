import { User } from './user.entity';
export declare class Role {
    role_id: number;
    role_name: string;
    description: string;
    users: User[];
}
