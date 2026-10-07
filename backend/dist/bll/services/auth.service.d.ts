import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../dal/entities/user.entity';
export interface RegisterDto {
    username: string;
    full_name: string;
    designation?: string;
    email?: string;
    phone?: string;
    password: string;
    role_id: number;
    supervisor_id?: string;
}
export interface LoginDto {
    username: string;
    password: string;
}
export declare class AuthService {
    private readonly userRepo;
    private readonly dataSource;
    private readonly jwtService;
    constructor(userRepo: Repository<User>, dataSource: DataSource, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        message: string;
        id: string;
        username: string;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: object;
    }>;
    listUsers(): Promise<object[]>;
    setActiveStatus(userId: string, isActive: boolean): Promise<{
        message: string;
    }>;
}
