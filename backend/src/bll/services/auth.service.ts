import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../dal/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private entityManager: EntityManager,
  ) {}

  async register(dto: {
    username: string;
    full_name: string;
    email?: string;
    phone?: string;
    password_hash: string;
    role_id: number;
  }) {
    const existing = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });

    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(dto.password_hash, salt);

    const user = this.userRepository.create({
      ...dto,
      password_hash,
      is_active: true,
    });

    return this.userRepository.save(user);
  }

  async login(username: string, password_hash: string) {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['role'],
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials or inactive account');
    }

    const isMatch = await bcrypt.compare(password_hash, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Fetch user permissions
    const permissions: Array<{ permission_code: string }> = await this.entityManager.query(
      `SELECT p.permission_code 
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.permission_id
       WHERE rp.role_id = $1`,
      [user.role_id],
    );

    const permissionCodes = permissions.map((p) => p.permission_code);

    // Update last login
    user.last_login_at = new Date();
    await this.userRepository.save(user);

    const payload = {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      role_id: user.role_id,
      role_name: user.role?.role_name,
      permissions: permissionCodes,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role_name: user.role?.role_name,
        permissions: permissionCodes,
      },
    };
  }
}
