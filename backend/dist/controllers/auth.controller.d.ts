import { AuthService } from '../bll/services/auth.service';
interface RegisterBody {
    username: string;
    full_name: string;
    email?: string;
    phone?: string;
    password: string;
    role_code: string;
}
interface LoginBody {
    username: string;
    password: string;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginBody): Promise<{
        access_token: string;
        user: object;
    }>;
    register(body: RegisterBody): Promise<{
        message: string;
        id: string;
        username: string;
    }>;
    listRoles(): Promise<{
        id: number;
        code: string;
        name: string;
    }[]>;
    listUsers(): Promise<object[]>;
    setUserStatus(userId: string, body: {
        is_active: boolean;
    }): Promise<{
        message: string;
    }>;
    me(user: any): Promise<any>;
}
export {};
