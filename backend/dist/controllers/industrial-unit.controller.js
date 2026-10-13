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
exports.IndustrialUnitController = void 0;
const common_1 = require("@nestjs/common");
const industrial_unit_service_1 = require("../bll/services/industrial-unit.service");
const rbac_guard_1 = require("../common/guards/rbac.guard");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const user_decorator_1 = require("../common/decorators/user.decorator");
let IndustrialUnitController = class IndustrialUnitController {
    constructor(unitService) {
        this.unitService = unitService;
    }
    async findAll() {
        return this.unitService.findAll();
    }
    async findOne(id) {
        return this.unitService.findOne(id);
    }
    async approveUnit(id, body, user) {
        return this.unitService.approveUnit(id, user.user_id);
    }
    async rejectUnit(id, body, user) {
        return this.unitService.rejectUnit(id);
    }
};
exports.IndustrialUnitController = IndustrialUnitController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(rbac_guard_1.RbacGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IndustrialUnitController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(rbac_guard_1.RbacGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IndustrialUnitController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, common_1.UseGuards)(rbac_guard_1.RbacGuard),
    (0, permissions_decorator_1.RequirePermissions)('UNIT_APPROVE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], IndustrialUnitController.prototype, "approveUnit", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, common_1.UseGuards)(rbac_guard_1.RbacGuard),
    (0, permissions_decorator_1.RequirePermissions)('UNIT_APPROVE'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], IndustrialUnitController.prototype, "rejectUnit", null);
exports.IndustrialUnitController = IndustrialUnitController = __decorate([
    (0, common_1.Controller)('industrial-units'),
    __metadata("design:paramtypes", [industrial_unit_service_1.IndustrialUnitService])
], IndustrialUnitController);
//# sourceMappingURL=industrial-unit.controller.js.map