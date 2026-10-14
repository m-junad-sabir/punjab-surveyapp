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
exports.IndustrialUnitService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const industrial_unit_entity_1 = require("../../dal/entities/industrial-unit.entity");
let IndustrialUnitService = class IndustrialUnitService {
    constructor(unitRepo, dataSource) {
        this.unitRepo = unitRepo;
        this.dataSource = dataSource;
    }
    async findAll() {
        return this.unitRepo.find({ order: { created_at: 'DESC' } });
    }
    async findOne(unitId) {
        const unit = await this.unitRepo.findOne({ where: { id: unitId } });
        if (!unit)
            throw new common_1.NotFoundException(`Industrial unit ${unitId} not found`);
        return unit;
    }
    async approveUnit(unitId, supervisorId, dto = {}) {
        const unit = await this.findOne(unitId);
        await this.unitRepo.update(unitId, { approval_status: 'CONFIRMED' });
        await this.dataSource.query(`INSERT INTO unit_approval_log (unit_id, action, acted_by, response_id, remarks, acted_at)
       VALUES ($1, 'CONFIRMED', $2, $3, $4, NOW())`, [unitId, supervisorId, dto.response_id ?? null, dto.remarks ?? null]);
        if (dto.response_id) {
            await this.dataSource.query(`UPDATE survey_responses SET status = 'CONFIRMED', confirmed_by = $1, confirmed_at = NOW()
          WHERE id = $2`, [supervisorId, dto.response_id]);
        }
        return { message: `Unit "${unit.name}" approved.` };
    }
    async rejectUnit(unitId, supervisorId, dto = {}) {
        const unit = await this.findOne(unitId);
        await this.unitRepo.update(unitId, { approval_status: 'REJECTED' });
        await this.dataSource.query(`INSERT INTO unit_approval_log (unit_id, action, acted_by, response_id, remarks, acted_at)
       VALUES ($1, 'REJECTED', $2, $3, $4, NOW())`, [unitId, supervisorId, dto.response_id ?? null, dto.remarks ?? null]);
        if (dto.response_id) {
            await this.dataSource.query(`UPDATE survey_responses SET status = 'REJECTED', confirmed_by = $1, confirmed_at = NOW()
          WHERE id = $2`, [supervisorId, dto.response_id]);
        }
        return { message: `Unit "${unit.name}" rejected.` };
    }
};
exports.IndustrialUnitService = IndustrialUnitService;
exports.IndustrialUnitService = IndustrialUnitService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(industrial_unit_entity_1.IndustrialUnit)),
    __param(1, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], IndustrialUnitService);
//# sourceMappingURL=industrial-unit.service.js.map