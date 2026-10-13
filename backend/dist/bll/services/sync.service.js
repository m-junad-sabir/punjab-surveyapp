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
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const sectionTables = {
    A: 'section_a_establishment_identity',
    B: 'section_b_operational_details',
    C: 'section_c_core_secondary_activities',
    D: 'section_d_workforce',
    E: 'section_e_backward_linkages',
    F: 'section_f_forward_linkages',
    G: 'section_g_technology_production',
    H: 'section_h_energy_waste',
    I: 'section_i_certifications_compliances',
    J: 'section_j_strategic_business_plan',
    K: 'section_k_collaborations_barriers',
};
let SyncService = class SyncService {
    constructor(entityManager) {
        this.entityManager = entityManager;
    }
    async syncBatch(payload) {
        if (!payload || !Array.isArray(payload.responses)) {
            throw new common_1.BadRequestException('responses must be an array');
        }
        const log = await this.entityManager.query(`INSERT INTO sync_log (device_id, user_id, sync_started_at, status)
       VALUES ($1, $2, NOW(), 'partial') RETURNING sync_id`, [payload.device_id || 'unknown_device', payload.user_id]);
        const syncId = log[0].sync_id;
        const results = [];
        let recordsPushed = 0;
        for (const response of payload.responses) {
            try {
                const surveyId = await this.saveSubmission(payload.user_id, payload.device_id, response);
                recordsPushed += 1;
                results.push({ survey_id: surveyId, response_id: response.response_id || surveyId, status: 'synced', is_duplicate: false, message: 'Survey submission synced successfully.' });
            }
            catch (error) {
                const message = this.readableDatabaseError(error);
                results.push({ survey_id: response.survey_id || response.response_id, response_id: response.response_id, status: 'failed', is_duplicate: false, message });
            }
        }
        const status = recordsPushed === payload.responses.length ? 'success' : recordsPushed ? 'partial' : 'failed';
        await this.entityManager.query(`UPDATE sync_log SET sync_completed_at = NOW(), records_pushed = $1, status = $2 WHERE sync_id = $3`, [recordsPushed, status, syncId]);
        return { sync_id: syncId, status, results };
    }
    async saveSubmission(userId, deviceId, response) {
        return this.entityManager.transaction(async (manager) => {
            const surveyId = response.survey_id || response.response_id;
            if (!surveyId)
                throw new common_1.BadRequestException('Each response needs survey_id or response_id');
            const existing = await manager.query('SELECT survey_id FROM survey_submissions WHERE survey_id = $1', [surveyId]);
            if (existing.length)
                return surveyId;
            const sections = response.sections || this.legacyAnswersToSections(response.answers || []);
            const identity = this.asRecord(sections.A);
            const gps = this.asRecord(identity.gps || identity.coordinates);
            const latitude = Number(response.coordinates_lat ?? gps.lat);
            const longitude = Number(response.coordinates_lng ?? gps.lng);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
                throw new common_1.BadRequestException('A valid latitude and longitude are required');
            const missingIdentity = ['establishment_name', 'address', 'city', 'tehsil', 'district']
                .filter((field) => this.isEmpty(identity[field]));
            if (missingIdentity.length) {
                throw new common_1.BadRequestException(`Section A is incomplete. Required fields missing: ${missingIdentity.join(', ')}`);
            }
            const operational = this.asRecord(sections.B);
            if (this.isEmpty(operational.operational_status)) {
                throw new common_1.BadRequestException('Section B is incomplete. Current operational status is required.');
            }
            const unitCode = String(identity.unit_code || `PB-${Date.now().toString(36).toUpperCase()}`);
            await manager.query(`INSERT INTO survey_submissions
          (survey_id, unit_code, survey_ref_no, interview_date, enumerator_name, coordinates_lat, coordinates_lng, gps_accuracy_m, geom, device_id, sync_status)
         VALUES ($1::uuid, $2::varchar, $3::varchar, COALESCE($4::date, CURRENT_DATE), $5::varchar,
           $6::numeric, $7::numeric, $8::numeric,
           ST_SetSRID(ST_MakePoint($7::double precision, $6::double precision), 4326),
           $9::varchar, 'synced')`, [surveyId, unitCode, response.form_id ? String(response.form_id) : null, response.interview_date || null, response.enumerator_name || userId, latitude, longitude, response.gps_accuracy_m ?? gps.accuracy, deviceId || response.device_id || null]);
            for (const [section, value] of Object.entries(sections)) {
                const table = sectionTables[section.toUpperCase()];
                if (table)
                    await this.insertSection(manager, table, surveyId, value);
            }
            return surveyId;
        });
    }
    async insertSection(manager, table, surveyId, value) {
        const rows = Array.isArray(value) ? value : [value];
        const columns = (await manager.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name <> 'survey_id'`, [table])).map((item) => item.column_name);
        for (const row of rows) {
            const entries = Object.entries(this.asRecord(row)).filter(([key, item]) => columns.includes(key) && item !== undefined);
            if (!entries.length)
                continue;
            const names = ['survey_id', ...entries.map(([key]) => `"${key}"`)].join(', ');
            const values = [surveyId, ...entries.map(([, item]) => item)];
            const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
            await manager.query(`INSERT INTO ${table} (${names}) VALUES (${placeholders})`, values);
        }
    }
    legacyAnswersToSections(answers) {
        const identity = {};
        const gps = {};
        for (const answer of answers) {
            if (answer.question_id === 1 && answer.answer_value && typeof answer.answer_value === 'object')
                Object.assign(gps, answer.answer_value);
            if (answer.question_id === 4)
                identity.establishment_name = answer.answer_value;
            if (answer.question_id === 6)
                identity.address = answer.answer_value;
            if (answer.question_id === 19)
                identity.ownership_type = answer.answer_value;
        }
        identity.gps = gps;
        return { A: identity };
    }
    asRecord(value) {
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    }
    isEmpty(value) {
        return value === undefined || value === null || value === '';
    }
    readableDatabaseError(error) {
        const message = error instanceof Error ? error.message : 'Unknown database error.';
        if (message.includes('duplicate key') && message.includes('unit_code'))
            return 'This survey could not be saved because its unit code already exists. Please retry.';
        if (message.includes('violates not-null constraint'))
            return 'A required survey field is missing. Open the survey, complete the required fields, and retry.';
        if (message.includes('violates check constraint'))
            return 'One selected value is not accepted by the database. Reopen the survey and choose a valid dropdown option.';
        if (message.includes('invalid input syntax'))
            return 'One numeric or date value is invalid. Correct the highlighted field and retry.';
        if (message.includes('relation') && message.includes('does not exist'))
            return 'The server database is missing a required survey table. Run the latest database migration and restart the backend.';
        return message;
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.EntityManager])
], SyncService);
//# sourceMappingURL=sync.service.js.map