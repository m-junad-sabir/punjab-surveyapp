import { Role } from './role.entity';
export declare class User {
    id: string;
    username: string;
    full_name: string;
    designation: string;
    email: string;
    phone: string;
    password_hash: string;
    role_id: number;
    supervisor_id: string;
    is_active: boolean;
    token_version: number;
    must_change_password: boolean;
    created_by: string;
    created_at: Date;
    deactivated_at: Date;
    role: Role;
}
