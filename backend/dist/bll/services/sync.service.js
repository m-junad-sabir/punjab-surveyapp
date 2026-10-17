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
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const survey_response_entity_1 = require("../../dal/entities/survey-response.entity");
const duplicate_flag_entity_1 = require("../../dal/entities/duplicate-flag.entity");
const survey_response_writer_1 = require("./survey-response-writer");
function nameSimilarity(a, b) {
    const s1 = (a ?? '').toLowerCase().trim();
    const s2 = (b ?? '').toLowerCase().trim();
    if (s1 === s2)
        return 1;
    if (!s1 || !s2)
        return 0;
    const m = s1.length, n = s2.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = s1[i - 1] === s2[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return 1 - dp[m][n] / Math.max(m, n);
}
function finiteNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
        return Number(value);
    return null;
}
let SyncService = class SyncService {
    constructor(responseRepo, dataSource) {
        this.responseRepo = responseRepo;
        this.dataSource = dataSource;
    }
    async syncBatch(payload) {
        const { device_id, user_id, responses } = payload;
        let successCount = 0;
        const results = [];
        const [logRow] = await this.dataSource.query(`INSERT INTO sync_log (surveyor_id, device_id, started_at, status)
       VALUES ($1, $2, NOW(), 'IN_PROGRESS') RETURNING id`, [user_id, device_id]);
        const syncLogId = logRow.id;
        for (const resp of responses) {
            try {
                const result = await this.dataSource.transaction(async (trx) => {
                    const existing = await trx.findOne(survey_response_entity_1.SurveyResponse, { where: { id: resp.response_id } });
                    if (existing) {
                        return {
                            response_id: resp.response_id,
                            status: 'already_synced',
                            is_duplicate: false,
                            message: 'Response was already synced.',
                        };
                    }
                    const questionIds = [...new Set(resp.answers.map((answer) => answer.question_id))];
                    const questions = questionIds.length
                        ? await trx.query(`SELECT q.id, q.question_code, q.answer_type, q.lookup_type_id
                   FROM survey_questions q
                   JOIN survey_sections s ON s.id = q.section_id
                  WHERE q.id = ANY($1::int[]) AND s.form_id = $2`, [questionIds, resp.form_id])
                        : [];
                    if (questions.length !== questionIds.length) {
                        throw new Error('The response contains a question that does not belong to its survey form.');
                    }
                    const questionById = new Map(questions.map((question) => [question.id, question]));
                    const answers = new Map();
                    for (const answer of resp.answers) {
                        const question = questionById.get(answer.question_id);
                        if (!question)
                            throw new Error(`Question ${answer.question_id} is not part of this form.`);
                        answers.set(question.question_code, answer.answer_value);
                    }
                    const gpsValue = answers.get('A_LOCATION_GPS');
                    const gpsRecord = gpsValue && typeof gpsValue === 'object'
                        ? gpsValue.location
                        : undefined;
                    const gpsLocation = gpsRecord && typeof gpsRecord === 'object'
                        ? gpsRecord
                        : gpsValue && typeof gpsValue === 'object'
                            ? gpsValue
                            : {};
                    const gpsLat = resp.gps_lat ?? finiteNumber(gpsLocation.lat);
                    const gpsLng = resp.gps_lng ?? finiteNumber(gpsLocation.lng);
                    const gpsAccuracy = resp.gps_accuracy_m ?? finiteNumber(gpsLocation.accuracy);
                    const nameValue = answers.get('A_ESTABLISHMENT_NAME');
                    const structuredName = nameValue && typeof nameValue === 'object'
                        ? nameValue.name
                        : nameValue;
                    const textAnswer = resp.answers.find((answer) => typeof answer.answer_value === 'string' && answer.answer_value.trim().length > 0);
                    const unitName = typeof structuredName === 'string' && structuredName.trim()
                        ? structuredName.trim()
                        : textAnswer?.answer_value ?? 'Unnamed Unit';
                    let isDuplicate = false;
                    let matchedUnitId = null;
                    let matchReason = '';
                    let similarity = 0;
                    let distanceM = 0;
                    if (gpsLat !== null && gpsLng !== null) {
                        const nearby = await trx.query(`SELECT id, name,
                      ST_Distance(
                        location::geography,
                        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                      ) AS distance
                 FROM industrial_units
                WHERE ST_DWithin(
                        location::geography,
                        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                        50.0
                      )
                  AND approval_status != 'REJECTED'`, [gpsLng, gpsLat]);
                        for (const u of nearby) {
                            const sim = nameSimilarity(unitName, u.name);
                            if (sim > 0.6) {
                                isDuplicate = true;
                                matchedUnitId = u.id;
                                similarity = sim;
                                distanceM = u.distance;
                                matchReason = `${Math.round(u.distance)}m from "${u.name}" (${Math.round(sim * 100)}% name match)`;
                                break;
                            }
                        }
                    }
                    const linkedUnitId = resp.unit_id ?? await (0, survey_response_writer_1.createIndustrialUnit)(trx, user_id, answers, unitName, {
                        lat: gpsLat,
                        lng: gpsLng,
                        accuracy: gpsAccuracy,
                    }, !questions.some((question) => question.question_code === 'A_LOCATION'));
                    const surveyResp = trx.create(survey_response_entity_1.SurveyResponse, {
                        id: resp.response_id,
                        form_id: resp.form_id,
                        unit_id: linkedUnitId,
                        surveyor_id: user_id,
                        device_id,
                        gps_lat: gpsLat,
                        gps_lng: gpsLng,
                        gps_accuracy_m: gpsAccuracy,
                        started_at: new Date(resp.started_at),
                        submitted_at: new Date(resp.submitted_at),
                        status: 'PENDING_CONFIRMATION',
                        sync_status: isDuplicate ? 'DUPLICATE' : 'SYNCED',
                        synced_at: new Date(),
                    });
                    await trx.save(survey_response_entity_1.SurveyResponse, surveyResp);
                    await (0, survey_response_writer_1.saveNormalizedSurveyAnswers)(trx, resp.response_id, answers, questions);
                    if (isDuplicate && matchedUnitId) {
                        await trx.save(duplicate_flag_entity_1.DuplicateFlag, trx.create(duplicate_flag_entity_1.DuplicateFlag, {
                            unit_id: linkedUnitId,
                            matched_unit_id: matchedUnitId,
                            reason: 'BOTH',
                            details: matchReason,
                            name_similarity: similarity,
                            distance_m: distanceM,
                            resolution: 'OPEN',
                        }));
                    }
                    return {
                        response_id: resp.response_id,
                        status: (isDuplicate ? 'duplicate_flagged' : 'synced'),
                        is_duplicate: isDuplicate,
                        message: isDuplicate
                            ? `Duplicate flagged — ${matchReason}. Held for supervisor review.`
                            : 'Response synced successfully.',
                    };
                });
                results.push(result);
                if (result.status === 'synced' || result.status === 'already_synced')
                    successCount++;
            }
            catch (err) {
                results.push({
                    response_id: resp.response_id,
                    status: 'failed',
                    is_duplicate: false,
                    message: err?.message ?? 'Unexpected error during sync.',
                });
            }
        }
        const duplicates = results.filter((r) => r.status === 'duplicate_flagged').length;
        const failed = results.filter((r) => r.status === 'failed').length;
        const finalStatus = failed === 0 ? 'SUCCESS'
            : failed === responses.length ? 'FAILED'
                : 'PARTIAL';
        await this.dataSource.query(`UPDATE sync_log
          SET finished_at       = NOW(),
              records_sent      = $1,
              records_synced    = $2,
              records_duplicate = $3,
              records_rejected  = $4,
              status            = $5
        WHERE id = $6`, [responses.length, successCount, duplicates, failed, finalStatus, syncLogId]);
        return { sync_id: syncLogId, status: finalStatus.toLowerCase(), results };
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(survey_response_entity_1.SurveyResponse)),
    __param(1, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], SyncService);
//# sourceMappingURL=sync.service.js.map