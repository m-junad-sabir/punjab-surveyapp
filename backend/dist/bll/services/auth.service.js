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
    constructor(userRepository, jwtService, entityManager) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.entityManager = entityManager;
    }
    async register(dto) {
        const existing = await this.userRepository.findOne({
            where: [{ username: dto.username }, { email: dto.email }],
        });
        if (existing) {
            throw new common_1.ConflictException('Username or email already exists');
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
    async login(username, password_hash) {
        const user = await this.userRepository.findOne({
            where: { username },
            relations: ['role'],
        });
        if (!user || !user.is_active) {
            throw new common_1.UnauthorizedException('Invalid credentials or inactive account');
        }
        const isMatch = await bcrypt.compare(password_hash, user.password_hash);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const permissions = await this.entityManager.query(`SELECT p.permission_code 
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.permission_id
       WHERE rp.role_id = $1`, [user.role_id]);
        const permissionCodes = permissions.map((p) => p.permission_code);
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        typeorm_2.EntityManager])
], AuthService);
//# sourceMappingURL=auth.service.js.map