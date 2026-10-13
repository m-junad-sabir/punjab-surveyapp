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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndustrialUnitService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let IndustrialUnitService = class IndustrialUnitService {
    constructor(entityManager) {
        this.entityManager = entityManager;
    }
    async findAll() {
        return this.entityManager.query(`SELECT s.survey_id AS unit_id, s.unit_code, a.establishment_name AS unit_name,
              a.ownership_type, s.sync_status AS operational_status, s.is_verified,
              s.gps_accuracy_m, s.created_at, s.updated_at
       FROM survey_submissions s
       LEFT JOIN section_a_establishment_identity a ON a.survey_id = s.survey_id
       ORDER BY s.created_at DESC`);
    }
    async findOne(unitId) {
        const rows = await this.entityManager.query(`SELECT s.*, a.* FROM survey_submissions s
       LEFT JOIN section_a_establishment_identity a ON a.survey_id = s.survey_id
       WHERE s.survey_id = $1`, [unitId]);
        if (!rows.length)
            throw new common_1.NotFoundException(`Survey submission with ID ${unitId} not found`);
        const sectionTables = [
            'section_a_establishment_identity',
            'section_b_operational_details',
            'section_c_core_secondary_activities',
            'section_d_workforce',
            'section_e_backward_linkages',
            'section_f_forward_linkages',
            'section_g_technology_production',
            'section_h_energy_waste',
            'section_i_certifications_compliances',
            'section_j_strategic_business_plan',
            'section_k_collaborations_barriers',
        ];
        const sections = {};
        for (const table of sectionTables) {
            const section = table.match(/^section_([a-k])_/)?.[1].toUpperCase();
            if (section)
                sections[section] = await this.entityManager.query(`SELECT * FROM ${table} WHERE survey_id = $1`, [unitId]);
        }
        return { ...rows[0], sections };
    }
    async approveUnit(unitId, actionedBy) {
        await this.ensureExists(unitId);
        await this.entityManager.query(`UPDATE survey_submissions SET is_verified = TRUE, verified_by = $2, verified_at = NOW(), sync_status = 'synced' WHERE survey_id = $1`, [unitId, actionedBy]);
        return { message: 'Survey submission successfully verified' };
    }
    async rejectUnit(unitId) {
        await this.ensureExists(unitId);
        await this.entityManager.query(`UPDATE survey_submissions SET is_verified = FALSE, sync_status = 'rejected' WHERE survey_id = $1`, [unitId]);
        return { message: 'Survey submission rejected' };
    }
    async ensureExists(unitId) {
        const rows = await this.entityManager.query('SELECT survey_id FROM survey_submissions WHERE survey_id = $1', [unitId]);
        if (!rows.length)
            throw new common_1.NotFoundException(`Survey submission with ID ${unitId} not found`);
    }
};
exports.IndustrialUnitService = IndustrialUnitService;
exports.IndustrialUnitService = IndustrialUnitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.EntityManager])
], IndustrialUnitService);
//# sourceMappingURL=industrial-unit.service.js.map