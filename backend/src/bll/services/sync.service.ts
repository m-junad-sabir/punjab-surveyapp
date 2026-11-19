import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SurveyResponse } from '../../dal/entities/survey-response.entity';
import { DuplicateFlag }  from '../../dal/entities/duplicate-flag.entity';
import { PhotoService } from './photo.service';
import {
  DEFAULT_SHARE_CODES,
  normalizeSectionEFAnswers,
  SECTION_EF_MATRIX_DEFAULTS,
} from './section-e-f';
import { normalizeSectionGAnswers } from './section-g';
import { normalizeSectionHAnswers } from './section-h';
import { normalizeSectionIJAnswers } from './section-i-j';
import { normalizeSectionKAnswers } from './section-k';
import { surveyAnswerFormatError } from './sync-validation';
import { QUESTION_INPUTS } from './survey-questionnaire';
import {
  clearHiddenSurveyAnswers,
  createIndustrialUnit,
  normalizeSectionCAnswers,
  normalizeSectionDAnswers,
  saveNormalizedSurveyAnswers,
  SubmittedQuestion,
  SurveyAnswers,
  updateExistingUnitCapitalInvestment,
  validateSectionAAnswers,
  validateSectionBAnswers,
  validateMajorInputUnits,
} from './survey-response-writer';

// ─── Levenshtein similarity ────────────────────────────────────────────────────
function nameSimilarity(a: string, b: string): number {
  const s1 = (a ?? '').toLowerCase().trim();
  const s2 = (b ?? '').toLowerCase().trim();
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = s1[i-1] === s2[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return 1 - dp[m][n] / Math.max(m, n);
}

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface AnswerPayload {
  question_id:   number;
  answer_value:  any;   // text | number | boolean | option_id | option_ids[] | {lat,lng,accuracy}
}

export interface SyncPayload {
  device_id: string;
  user_id:   string;
  responses: Array<{
    response_id:     string;
    form_id:         number;
    unit_id?:        string;
    gps_lat?:        number;
    gps_lng?:        number;
    gps_accuracy_m?: number;
    started_at:      string;
    submitted_at:    string;
    answers:         AnswerPayload[];
  }>;
}

export interface SyncItemResult {
  response_id:  string;
  status:       'synced' | 'duplicate_flagged' | 'already_synced' | 'failed';
  is_duplicate: boolean;
  message:      string;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function unstructuredAnswerError(code: string, type: string, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (type === 'YES_NO' && typeof value !== 'boolean') return 'Answer must be Yes or No.';
  if (type === 'NUMBER' && finiteNumber(value) === null) return 'Answer must be a valid number.';
  if (type === 'TEXT' && typeof value !== 'string') return 'Answer must be text.';
  if (type === 'SINGLE_CHOICE') {
    const raw = value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).option_id
      : value;
    if (!(typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) &&
        !(typeof raw === 'string' && /^\d+$/.test(raw))) {
      return 'Select a valid available option.';
    }
  }
  if (type === 'MULTI_CHOICE') {
    const selected = Array.isArray(value) ? value
      : value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>).option_ids
        : null;
    if (!Array.isArray(selected) || selected.some((item) =>
      !(typeof item === 'number' && Number.isInteger(item) && item >= 0) &&
      !(typeof item === 'string' && /^\d+$/.test(item)))) {
      return 'Answer must contain valid selected options.';
    }
  }
  const legacyEmptyAgeShares = code === 'G_MACHINERY_AGE' && Array.isArray(value) && value.length === 0;
  if (type === 'SHARE_PERCENT' && !legacyEmptyAgeShares) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return 'Answer must contain valid share categories.';
    }
    let total = 0;
    for (const [key, entry] of Object.entries(value)) {
      if (!/^[1-9]\d*$/.test(key)) return 'Share categories must use valid option IDs.';
      const entryRecord = entry && typeof entry === 'object' && !Array.isArray(entry)
        ? entry as Record<string, unknown>
        : null;
      if (entryRecord && (
        Object.keys(entryRecord).some((field) => field !== 'percent' && field !== 'other_text') ||
        (entryRecord.other_text !== undefined && entryRecord.other_text !== null &&
          typeof entryRecord.other_text !== 'string')
      )) {
        return 'Share category contains unsupported or invalid description data.';
      }
      const raw = entryRecord ? entryRecord.percent : entry;
      const amount = finiteNumber(raw);
      if (amount === null || amount < 0 || amount > 100 ||
          decimalPlaces(raw) > 2) {
        return 'Each share must be between 0 and 100 with at most two decimal places.';
      }
      total += amount;
    }
    if (total > 100) return 'The share total cannot exceed 100%.';
  }
  if (type === 'MATRIX' && (!value || typeof value !== 'object' || Array.isArray(value))) {
    return 'Answer must contain valid matrix entries.';
  }
  return null;
}

function selectedChoiceIds(type: string, value: unknown): number[] {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  const raw = type === 'SINGLE_CHOICE'
    ? [record ? record.option_id : value]
    : type === 'MULTI_CHOICE'
      ? (Array.isArray(value) ? value : record?.option_ids)
      : null;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item !== undefined && item !== null && item !== '')
    .map(Number)
    .filter((item) => Number.isInteger(item));
}

function decimalPlaces(value: unknown): number {
  const [coefficient, exponentText] = String(value).trim().toLowerCase().split('e');
  return Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponentText ?? 0));
}

// ─── Service ───────────────────────────────────────────────────────────────────
@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SurveyResponse)
    private readonly responseRepo: Repository<SurveyResponse>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly photoService: PhotoService,
  ) {}

  async validateInputValues(responses: SyncPayload['responses']): Promise<void> {
    for (const response of responses) {
      const questionIds = [...new Set(response.answers.map((answer) => answer.question_id))];
      if (questionIds.length === 0) continue;

      const questions: Array<{ id: number; question_code: string; answer_type: string; lookup_type_id: number | null }> = await this.dataSource.query(
        `SELECT q.id, q.question_code, q.answer_type, q.lookup_type_id
           FROM survey_questions q
           JOIN survey_sections s ON s.id = q.section_id
          WHERE s.form_id = $2 AND q.id = ANY($1::int[])`,
        [questionIds, response.form_id],
      );
      const questionById = new Map(questions.map((question) => [Number(question.id), question]));
      const selectedOptions: Array<{ code: string; typeId: number; optionIds: number[] }> = [];
      for (const answer of response.answers) {
        const question = questionById.get(answer.question_id);
        if (!question) {
          throw new BadRequestException(`Question ${answer.question_id} does not belong to survey form ${response.form_id}.`);
        }
        const error = surveyAnswerFormatError(question.question_code, answer.answer_value);
        if (error) {
          throw new BadRequestException(`${question.question_code}: ${error}`);
        }
        if (!QUESTION_INPUTS[question.question_code]) {
          const error = unstructuredAnswerError(
            question.question_code,
            question.answer_type,
            answer.answer_value,
          );
          if (error) throw new BadRequestException(`${question.question_code}: ${error}`);
          if (question.lookup_type_id != null) {
            const optionIds = selectedChoiceIds(question.answer_type, answer.answer_value);
            if (optionIds.length) {
              selectedOptions.push({
                code: question.question_code,
                typeId: Number(question.lookup_type_id),
                optionIds,
              });
            }
          }
        }
      }

      const allOptionIds = [...new Set(selectedOptions.flatMap((entry) => entry.optionIds))];
      if (!allOptionIds.length) continue;
      // Inactive values stay valid so drafts saved before a lookup change can still sync.
      const optionRows: Array<{ id: number; type_id: number }> = await this.dataSource.query(
        `SELECT id, type_id FROM lookup_values WHERE id = ANY($1::int[])`,
        [allOptionIds],
      );
      const optionType = new Map(optionRows.map((row) => [Number(row.id), Number(row.type_id)]));
      for (const entry of selectedOptions) {
        if (entry.optionIds.some((id) => optionType.get(id) !== entry.typeId)) {
          throw new BadRequestException(`${entry.code}: Select a valid available option.`);
        }
      }
    }
  }

  async syncBatch(payload: SyncPayload) {
    const { device_id, user_id, responses } = payload;
    let successCount = 0;
    const results: SyncItemResult[] = [];

    // ── Sync log header ──────────────────────────────────────────────────────
    const [logRow] = await this.dataSource.query<Array<{ id: number }>>(
      `INSERT INTO sync_log (surveyor_id, device_id, started_at, status)
       VALUES ($1, $2, NOW(), 'IN_PROGRESS') RETURNING id`,
      [user_id, device_id],
    );
    const syncLogId = logRow.id;

    for (const resp of responses) {
      try {
        const result = await this.dataSource.transaction(async (trx) => {

          // ── Idempotency check ──────────────────────────────────────────────
          const existing = await trx.findOne(SurveyResponse, { where: { id: resp.response_id } });
          if (existing) {
            return {
              response_id:  resp.response_id,
              status:       'already_synced' as const,
              is_duplicate: false,
              message:      'Response was already synced.',
            };
          }

          const questionIds = [...new Set(resp.answers.map((answer) => answer.question_id))];
          const defaultedQuestionCodes = [
            'D_EMPLOYMENT',
            'D_SKILLS',
            ...DEFAULT_SHARE_CODES,
            ...Object.keys(SECTION_EF_MATRIX_DEFAULTS),
            'G_INNOVATION_GATE',
            'G_INNOVATION',
            'H_ENERGY_CONSUMPTION',
            'H_WATER_WASTE_GATE',
            'H_WATER_WASTE_DISPOSAL',
            'H_SOLID_WASTE_GATE',
            'H_GREEN_PRACTICES_GATE',
            'H_GREEN_PRACTICES',
            'I_COMPLIANCE_GATE',
            'I_COMPLIANCE_PERMITS',
            'I_CERTIFICATIONS_GATE',
            'I_CERTIFICATIONS',
            'J_STRATEGIC_PLAN_GATE',
            'J_OPERATIONAL_PLANNING_GATE',
            'J_PLANNING_AREAS',
          ];
          const questions: SubmittedQuestion[] = await trx.query(
            `SELECT q.id, q.question_code, q.answer_type, q.lookup_type_id
               FROM survey_questions q
               JOIN survey_sections s ON s.id = q.section_id
              WHERE s.form_id = $2
                AND (q.id = ANY($1::int[]) OR q.question_code = ANY($3::text[]))`,
            [questionIds, resp.form_id, defaultedQuestionCodes],
          );
          if (questions.filter((question) => questionIds.includes(question.id)).length !== questionIds.length) {
            throw new Error('The response contains a question that does not belong to its survey form.');
          }

          const questionById = new Map(questions.map((question) => [question.id, question]));
          const answers: SurveyAnswers = new Map();
          for (const answer of resp.answers) {
            const question = questionById.get(answer.question_id);
            if (!question) throw new Error(`Question ${answer.question_id} is not part of this form.`);
            answers.set(question.question_code, answer.answer_value);
          }
          for (const question of questions) {
            if (defaultedQuestionCodes.includes(question.question_code) &&
                ![
                  'G_INNOVATION_GATE',
                  'H_WATER_WASTE_GATE',
                  'H_SOLID_WASTE_GATE',
                  'H_GREEN_PRACTICES_GATE',
                  'I_COMPLIANCE_GATE',
                  'I_CERTIFICATIONS_GATE',
                  'J_STRATEGIC_PLAN_GATE',
                  'J_OPERATIONAL_PLANNING_GATE',
                ].includes(question.question_code) &&
                !answers.has(question.question_code)) {
              answers.set(
                question.question_code,
                question.question_code === 'D_EMPLOYMENT' || question.question_code === 'D_SKILLS' ? [] : {},
              );
            }
          }
          const isPermanentlyClosed = await clearHiddenSurveyAnswers(trx, answers);
          await validateSectionAAnswers(trx, answers);
          await validateSectionBAnswers(trx, answers);
          await normalizeSectionCAnswers(trx, answers);
          await validateMajorInputUnits(trx, answers);
          await normalizeSectionDAnswers(trx, answers);
          await normalizeSectionGAnswers(trx, answers, questions);
          await normalizeSectionHAnswers(trx, answers, questions);
          await normalizeSectionIJAnswers(trx, answers, questions);
          await normalizeSectionEFAnswers(trx, answers, questions);
          await normalizeSectionKAnswers(trx, answers, questions);

          const gpsValue = answers.get('A_LOCATION_GPS');
          const gpsRecord = gpsValue && typeof gpsValue === 'object'
            ? (gpsValue as Record<string, unknown>).location
            : undefined;
          const gpsLocation = gpsRecord && typeof gpsRecord === 'object'
            ? gpsRecord as Record<string, unknown>
            : gpsValue && typeof gpsValue === 'object'
              ? gpsValue as Record<string, unknown>
              : {};
          const gpsLat = resp.gps_lat ?? finiteNumber(gpsLocation.lat);
          const gpsLng = resp.gps_lng ?? finiteNumber(gpsLocation.lng);
          const gpsAccuracy = resp.gps_accuracy_m ?? finiteNumber(gpsLocation.accuracy);

          const nameValue = answers.get('A_ESTABLISHMENT_NAME');
          const structuredName = nameValue && typeof nameValue === 'object'
            ? (nameValue as Record<string, unknown>).name
            : nameValue;
          const textAnswer = resp.answers.find((answer) =>
            typeof answer.answer_value === 'string' && answer.answer_value.trim().length > 0,
          );
          const unitName = typeof structuredName === 'string' && structuredName.trim()
            ? structuredName.trim()
            : textAnswer?.answer_value ?? 'Unnamed Unit';

          // ── Duplicate detection ────────────────────────────────────────────
          let isDuplicate    = false;
          let matchedUnitId: string | null = null;
          let matchReason    = '';
          let similarity     = 0;
          let distanceM      = 0;

          if (gpsLat !== null && gpsLng !== null) {
            type NearbyRow = { id: string; name: string; distance: number };
            const nearby = await trx.query<NearbyRow[]>(
              `SELECT id, name,
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
                  AND approval_status != 'REJECTED'`,
              [gpsLng, gpsLat],
            );

            for (const u of nearby) {
              const sim = nameSimilarity(unitName, u.name);
              if (sim > 0.6) {
                isDuplicate   = true;
                matchedUnitId = u.id;
                similarity    = sim;
                distanceM     = u.distance;
                matchReason   = `${Math.round(u.distance)}m from "${u.name}" (${Math.round(sim * 100)}% name match)`;
                break;
              }
            }
          }

          const linkedUnitId = resp.unit_id ?? await createIndustrialUnit(
            trx,
            user_id,
            answers,
            unitName,
            {
              lat: gpsLat,
              lng: gpsLng,
              accuracy: gpsAccuracy,
            },
            !questions.some((question) => question.question_code === 'A_LOCATION'),
          );
          if (resp.unit_id) {
            await updateExistingUnitCapitalInvestment(trx, linkedUnitId, answers);
          }

          // ── Save survey response ───────────────────────────────────────────
          const surveyResp = trx.create(SurveyResponse, {
            id:            resp.response_id,
            form_id:       resp.form_id,
            unit_id:       linkedUnitId,
            surveyor_id:   user_id,
            device_id,
            gps_lat:       gpsLat,
            gps_lng:       gpsLng,
            gps_accuracy_m: gpsAccuracy,
            started_at:    new Date(resp.started_at),
            submitted_at:  new Date(resp.submitted_at),
            status:        'PENDING_CONFIRMATION',
            sync_status:   isDuplicate ? 'DUPLICATE' : 'SYNCED',
            synced_at:     new Date(),
          });
          await trx.save(SurveyResponse, surveyResp);

          await saveNormalizedSurveyAnswers(
            trx,
            resp.response_id,
            answers,
            questions,
            isPermanentlyClosed,
          );
          await this.photoService.attachRequiredPhotos(
            trx,
            resp.form_id,
            resp.response_id,
            user_id,
            answers,
          );

          // ── Flag duplicate ─────────────────────────────────────────────────
          if (isDuplicate && matchedUnitId) {
            await trx.save(DuplicateFlag, trx.create(DuplicateFlag, {
              unit_id:         linkedUnitId,
              matched_unit_id: matchedUnitId,
              reason:          'BOTH',
              details:         matchReason,
              name_similarity: similarity,
              distance_m:      distanceM,
              resolution:      'OPEN',
            }));
          }

          return {
            response_id:  resp.response_id,
            status:       (isDuplicate ? 'duplicate_flagged' : 'synced') as SyncItemResult['status'],
            is_duplicate: isDuplicate,
            message: isDuplicate
              ? `Duplicate flagged — ${matchReason}. Held for supervisor review.`
              : 'Response synced successfully.',
          };
        });

        results.push(result);
        if (result.status === 'synced' || result.status === 'already_synced') successCount++;
      } catch (err: any) {
        results.push({
          response_id:  resp.response_id,
          status:       'failed',
          is_duplicate: false,
          message:      err?.message ?? 'Unexpected error during sync.',
        });
      }
    }

    // ── Update sync log ────────────────────────────────────────────────────────
    const duplicates = results.filter((r) => r.status === 'duplicate_flagged').length;
    const failed     = results.filter((r) => r.status === 'failed').length;
    const finalStatus = failed === 0 ? 'SUCCESS'
                      : failed === responses.length ? 'FAILED'
                      : 'PARTIAL';

    await this.dataSource.query(
      `UPDATE sync_log
          SET finished_at       = NOW(),
              records_sent      = $1,
              records_synced    = $2,
              records_duplicate = $3,
              records_rejected  = $4,
              status            = $5
        WHERE id = $6`,
      [responses.length, successCount, duplicates, failed, finalStatus, syncLogId],
    );

    return { sync_id: syncLogId, status: finalStatus.toLowerCase(), results };
  }
}
