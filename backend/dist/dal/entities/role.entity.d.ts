import { User } from './user.entity';
export declare class Role {
    id: number;
    code: string;
    name: string;
    description: string;
    users: User[];
}
