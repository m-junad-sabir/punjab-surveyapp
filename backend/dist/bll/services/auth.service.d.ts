import { Repository, EntityManager } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../dal/entities/user.entity';
export declare class AuthService {
    private userRepository;
    private jwtService;
    private entityManager;
    constructor(userRepository: Repository<User>, jwtService: JwtService, entityManager: EntityManager);
    register(dto: {
        username: string;
        full_name: string;
        email?: string;
        phone?: string;
        password_hash: string;
        role_id: number;
    }): Promise<User>;
    login(username: string, password_hash: string): Promise<{
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
