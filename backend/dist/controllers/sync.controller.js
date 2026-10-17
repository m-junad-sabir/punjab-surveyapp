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
exports.SyncController = void 0;
const common_1 = require("@nestjs/common");
const sync_service_1 = require("../bll/services/sync.service");
const rbac_guard_1 = require("../common/guards/rbac.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const user_decorator_1 = require("../common/decorators/user.decorator");
let SyncController = class SyncController {
    constructor(syncService) {
        this.syncService = syncService;
    }
    async syncBatch(body, user) {
        if (!Array.isArray(body?.responses) || body.responses.length === 0) {
            throw new common_1.BadRequestException('Request must include a non-empty responses array');
        }
        if (body.responses.some((response) => response.surveyor_id !== user.user_id)) {
            throw new common_1.ForbiddenException('A survey response can only be synced by its owning account.');
        }
        const payload = {
            device_id: body.device_id || 'unknown',
            user_id: user.user_id,
            responses: body.responses,
        };
        return this.syncService.syncBatch(payload);
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(rbac_guard_1.RbacGuard),
    (0, permissions_decorator_1.RequirePermissions)('SURVEY_SUBMIT'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "syncBatch", null);
exports.SyncController = SyncController = __decorate([
    (0, common_1.Controller)('sync'),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncController);
//# sourceMappingURL=sync.controller.js.map