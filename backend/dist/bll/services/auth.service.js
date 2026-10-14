"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const user_entity_1 = require("../../dal/entities/user.entity");
let AuthService = class AuthService {
    constructor(userRepo, dataSource, jwtService) {
        this.userRepo = userRepo;
        this.dataSource = dataSource;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const conditions = [{ username: dto.username }];
        if (dto.email)
            conditions.push({ email: dto.email });
        const existing = await this.userRepo.findOne({ where: conditions });
        if (existing)
            throw new common_1.ConflictException('Username or email already taken');
        const password_hash = await bcrypt.hash(dto.password, 10);
        const user = this.userRepo.create({
            username: dto.username.trim(),
            full_name: dto.full_name.trim(),
            designation: dto.designation?.trim() ?? null,
            email: dto.email?.trim() ?? null,
            phone: dto.phone?.trim() ?? null,
            password_hash,
            role_id: dto.role_id,
            supervisor_id: dto.supervisor_id ?? null,
            is_active: true,
        });
        const saved = await this.userRepo.save(user);
        return { message: `User "${saved.username}" created`, id: saved.id, username: saved.username };
    }
    async login(dto) {
        const user = await this.userRepo.findOne({
            where: { username: dto.username },
            relations: ['role'],
        });
        if (!user || !user.is_active) {
            throw new common_1.UnauthorizedException('Invalid credentials or inactive account');
        }
        const passwordMatch = await bcrypt.compare(dto.password, user.password_hash);
        if (!passwordMatch)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const rows = await this.dataSource.query(`SELECT p.code
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id = $1`, [user.role_id]);
        const permissions = rows.map((r) => r.code);
        const payload = {
            sub: user.id,
            user_id: user.id,
            username: user.username,
            full_name: user.full_name,
            role_id: user.role_id,
            role_code: user.role?.code ?? '',
            role_name: user.role?.name ?? '',
            permissions,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                user_id: user.id,
                username: user.username,
                full_name: user.full_name,
                role_name: user.role?.name ?? '',
                permissions,
            },
        };
    }
    async listUsers() {
        const users = await this.userRepo.find({
            relations: ['role'],
            order: { created_at: 'DESC' },
        });
        return users.map((u) => ({
            user_id: u.id,
            username: u.username,
            full_name: u.full_name,
            designation: u.designation,
            email: u.email,
            phone: u.phone,
            role_id: u.role_id,
            role_name: u.role?.name,
            is_active: u.is_active,
            created_at: u.created_at,
        }));
    }
    async setActiveStatus(userId, isActive) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const update = { is_active: isActive };
        if (!isActive)
            update.deactivated_at = new Date();
        await this.userRepo.update(userId, update);
        return { message: `User "${user.username}" ${isActive ? 'activated' : 'deactivated'}` };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map