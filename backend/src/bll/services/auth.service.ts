import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly jwtService: JwtService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ message: string; id: string; username: string }> {
    const conditions: object[] = [{ username: dto.username }];
    if (dto.email) conditions.push({ email: dto.email });

    const existing = await this.userRepo.findOne({ where: conditions as any });
    if (existing) throw new ConflictException('Username or email already taken');

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      username:     dto.username.trim(),
      full_name:    dto.full_name.trim(),
      designation:  dto.designation?.trim() ?? null,
      email:        dto.email?.trim()       ?? null,
      phone:        dto.phone?.trim()       ?? null,
      password_hash,
      role_id:      dto.role_id,
      supervisor_id: dto.supervisor_id     ?? null,
      is_active:    true,
    });

    const saved = await this.userRepo.save(user);
    return { message: `User "${saved.username}" created`, id: saved.id, username: saved.username };
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<{ access_token: string; user: object }> {
    const user = await this.userRepo.findOne({
      where: { username: dto.username },
      relations: ['role'],
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials or inactive account');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    // Load permissions by role code
    const rows: Array<{ code: string }> = await this.dataSource.query(
      `SELECT p.code
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id = $1`,
      [user.role_id],
    );
    const permissions = rows.map((r) => r.code);

    const payload = {
      sub:       user.id,
      user_id:   user.id,           // kept for frontend compatibility
      username:  user.username,
      full_name: user.full_name,
      role_id:   user.role_id,
      role_code: user.role?.code ?? '',
      role_name: user.role?.name ?? '',
      permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        user_id:   user.id,
        username:  user.username,
        full_name: user.full_name,
        role_name: user.role?.name ?? '',
        permissions,
      },
    };
  }

  // ── List users (admin) ───────────────────────────────────────────────────────
  async listUsers(): Promise<object[]> {
    const users = await this.userRepo.find({
      relations: ['role'],
      order: { created_at: 'DESC' },
    });

    return users.map((u) => ({
      user_id:      u.id,
      username:     u.username,
      full_name:    u.full_name,
      designation:  u.designation,
      email:        u.email,
      phone:        u.phone,
      role_id:      u.role_id,
      role_name:    u.role?.name,
      is_active:    u.is_active,
      created_at:   u.created_at,
    }));
  }

  // ── Toggle active status ─────────────────────────────────────────────────────
  async setActiveStatus(userId: string, isActive: boolean): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const update: Partial<User> = { is_active: isActive };
    if (!isActive) update.deactivated_at = new Date();

    await this.userRepo.update(userId, update);
    return { message: `User "${user.username}" ${isActive ? 'activated' : 'deactivated'}` };
  }
}
