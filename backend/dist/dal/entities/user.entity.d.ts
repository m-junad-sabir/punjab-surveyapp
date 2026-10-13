import { Role } from './role.entity';
export declare class User {
    user_id: string;
    username: string;
    full_name: string;
    email: string;
    phone: string;
    password_hash: string;
    role_id: number;
    role: Role;
    is_active: boolean;
    last_login_at: Date;
    created_at: Date;
    updated_at: Date;
}
