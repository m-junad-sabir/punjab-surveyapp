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
exports.RbacGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const permissions_decorator_1 = require("../decorators/permissions.decorator");
let RbacGuard = class RbacGuard {
    constructor(jwtService, reflector, dataSource) {
        this.jwtService = jwtService;
        this.reflector = reflector;
        this.dataSource = dataSource;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing or malformed Authorization header');
        }
        const token = authHeader.slice(7);
        let payload;
        try {
            payload = this.jwtService.verify(token);
        }
        catch {
            throw new common_1.UnauthorizedException('Token is invalid or expired');
        }
        const rows = await this.dataSource.query('SELECT is_active, token_version FROM users WHERE id = $1', [payload.sub]);
        const current = rows[0];
        if (!current || !current.is_active || current.token_version !== payload.tv) {
            throw new common_1.UnauthorizedException('Session is no longer valid. Please sign in again.');
        }
        request.user = payload;
        const required = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
        if (required.length === 0) {
            return true;
        }
        const userPermissions = payload.permissions ?? [];
        const hasAll = required.every((p) => userPermissions.includes(p));
        if (!hasAll) {
            throw new common_1.ForbiddenException(`Insufficient permissions. Required: ${required.join(', ')}`);
        }
        return true;
    }
};
exports.RbacGuard = RbacGuard;
exports.RbacGuard = RbacGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        core_1.Reflector,
        typeorm_2.DataSource])
], RbacGuard);
//# sourceMappingURL=rbac.guard.js.map