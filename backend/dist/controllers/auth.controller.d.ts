import { AuthService } from '../bll/services/auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(body: {
        username: string;
        full_name: string;
        email?: string;
        phone?: string;
        password_hash: string;
        role_id: number;
    }): Promise<import("../dal/entities/user.entity").User>;
    login(body: {
        username: string;
        password_hash: string;
    }): Promise<{
        access_token: string;
        user: {
            user_id: string;
            username: string;
            full_name: string;
            role_name: string;
            permissions: string[];
        };
    }>;
}
