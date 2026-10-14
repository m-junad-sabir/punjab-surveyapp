import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SurveyResponse } from '../../dal/entities/survey-response.entity';
import { DuplicateFlag }  from '../../dal/entities/duplicate-flag.entity';
import {
  createIndustrialUnit,
  saveNormalizedSurveyAnswers,
  SubmittedQuestion,
  SurveyAnswers,
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

// ─── Service ───────────────────────────────────────────────────────────────────
@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SurveyResponse)
    private readonly responseRepo: Repository<SurveyResponse>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

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
          const questions: SubmittedQuestion[] = questionIds.length
            ? await trx.query(
                `SELECT q.id, q.question_code, q.answer_type, q.lookup_type_id
                   FROM survey_questions q
                   JOIN survey_sections s ON s.id = q.section_id
                  WHERE q.id = ANY($1::int[]) AND s.form_id = $2`,
                [questionIds, resp.form_id],
              )
            : [];
          if (questions.length !== questionIds.length) {
            throw new Error('The response contains a question that does not belong to its survey form.');
          }

          const questionById = new Map(questions.map((question) => [question.id, question]));
          const answers: SurveyAnswers = new Map();
          for (const answer of resp.answers) {
            const question = questionById.get(answer.question_id);
            if (!question) throw new Error(`Question ${answer.question_id} is not part of this form.`);
            answers.set(question.question_code, answer.answer_value);
          }

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

          await saveNormalizedSurveyAnswers(trx, resp.response_id, answers, questions);

          // ── Flag duplicate ─────────────────────────────────────────────────
          if (isDuplicate && matchedUnitId) {
            await trx.save(DuplicateFlag, trx.create(DuplicateFlag, {
              unit_id:         linkedUnitId,
              matched_unit_id: matchedUnitId,
              reason:          matchReason,
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
