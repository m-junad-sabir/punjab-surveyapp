import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { SurveyResponse } from '../../dal/entities/survey-response.entity';
import { SurveyAnswer } from '../../dal/entities/survey-answer.entity';
import { IndustrialUnit } from '../../dal/entities/industrial-unit.entity';
import { DuplicateFlag } from '../../dal/entities/duplicate-flag.entity';
import { SurveyQuestion } from '../../dal/entities/survey-question.entity';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SurveyResponse)
    private responseRepository: Repository<SurveyResponse>,
    @InjectRepository(IndustrialUnit)
    private unitRepository: Repository<IndustrialUnit>,
    private entityManager: EntityManager,
  ) {}

  // Basic string similarity helper (Levenshtein distance ratio)
  private calculateNameSimilarity(str1: string, str2: string): number {
    const s1 = (str1 || '').toLowerCase().trim();
    const s2 = (str2 || '').toLowerCase().trim();
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;

    const m = s1.length;
    const n = s2.length;
    const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1, // deletion
          d[i][j - 1] + 1, // insertion
          d[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    const maxLength = Math.max(m, n);
    return 1 - d[m][n] / maxLength;
  }

  async syncBatch(
    payload: {
      device_id: string;
      user_id: string;
      responses: Array<{
        response_id: string;
        form_id: number;
        gps_lat?: number;
        gps_lng?: number;
        gps_accuracy_m?: number;
        started_at: string;
        submitted_at: string;
        answers: Array<{
          question_id: number;
          answer_value: any;
        }>;
      }>;
    },
  ) {
    const { device_id, user_id, responses } = payload;
    let recordsPushed = 0;
    const results: Array<{ response_id: string; status: string; is_duplicate: boolean; message: string }> = [];

    // Create sync log header
    const syncLogInsert = await this.entityManager.query(
      `INSERT INTO sync_log (device_id, user_id, sync_started_at, status) 
       VALUES ($1, $2, NOW(), 'partial') RETURNING sync_id`,
      [device_id, user_id],
    );
    const syncId = syncLogInsert[0].sync_id;

    // Load active form's mandatory questions to compute completeness scores
    const activeQuestions = await this.entityManager.getRepository(SurveyQuestion).find();
    const mandatoryQuestions = activeQuestions.filter((q) => q.is_mandatory);

    for (const response of responses) {
      try {
        await this.entityManager.transaction(async (trxManager) => {
          // Check if response already exists
          const existingResponse = await trxManager.findOne(SurveyResponse, {
            where: { response_id: response.response_id },
          });
          if (existingResponse) {
            results.push({
              response_id: response.response_id,
              status: 'synced',
              is_duplicate: existingResponse.is_duplicate,
              message: 'Already synced previously.',
            });
            return;
          }

          // 1. Calculate completeness score
          const answeredQuestionIds = response.answers
            .filter((a) => a.answer_value !== null && a.answer_value !== undefined && a.answer_value !== '')
            .map((a) => a.question_id);

          const mandatoryAnswered = mandatoryQuestions.filter((q) =>
            answeredQuestionIds.includes(q.question_id),
          ).length;

          const completenessScore = mandatoryQuestions.length > 0
            ? Math.round((mandatoryAnswered / mandatoryQuestions.length) * 100)
            : 100;

          // Extract basic unit answers (Q1.1 Name, Q1.3 Ownership, Q1.4 Sector etc.)
          // (Matching seed configuration: question_id 1 = Unit Name, 3 = Ownership, 4 = Sector)
          const nameAnswer = response.answers.find((a) => a.question_id === 1)?.answer_value || 'Unnamed Unit';
          const ownershipAnswer = response.answers.find((a) => a.question_id === 3)?.answer_value || 'Private Limited';
          
          // 2. Perform duplicate checks (Proximity < 50m AND Name Similarity > 0.6)
          let isDuplicate = false;
          let matchedUnitId: string | null = null;
          let matchReason = '';

          if (response.gps_lat && response.gps_lng) {
            // Find units within 50 meters using PostGIS
            const nearbyUnits: Array<{ unit_id: string; unit_name: string; distance: number }> = await trxManager.query(
              `SELECT unit_id, unit_name, 
                      ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance
               FROM industrial_units
               WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 50.0)`,
              [response.gps_lng, response.gps_lat],
            );

            for (const unit of nearbyUnits) {
              const similarity = this.calculateNameSimilarity(nameAnswer, unit.unit_name);
              if (similarity > 0.6) {
                isDuplicate = true;
                matchedUnitId = unit.unit_id;
                matchReason = `Spatial proximity check: Located ${Math.round(unit.distance)}m away from existing unit "${unit.unit_name}" (ID: ${unit.unit_id}) with ${Math.round(similarity * 100)}% name match.`;
                break;
              }
            }
          }

          // 3. Create or Link Industrial Unit
          let linkedUnitId: string | null = null;

          if (!isDuplicate) {
            // Create a new industrial unit since no duplicate is found
            const randomCodeSuffix = Math.floor(10000 + Math.random() * 90000);
            const unitCode = `PK-PB-LHR-${randomCodeSuffix}`;
            
            const newUnit = new IndustrialUnit();
            newUnit.unit_code = unitCode;
            newUnit.unit_name = nameAnswer;
            newUnit.ownership_type = ownershipAnswer;
            newUnit.operational_status = 'Unverified'; // Surveyor capture is unverified by default
            newUnit.gps_accuracy_m = response.gps_accuracy_m || 0.0;
            newUnit.created_by = user_id;
            
            // Geographic tagging mapping
            newUnit.province_id = 1;
            newUnit.division_id = 1;
            newUnit.district_id = 1;
            newUnit.tehsil_id = 1; // Defaulting to seeded Lahore District
            
            if (response.gps_lat && response.gps_lng) {
              newUnit.geom = {
                type: 'Point',
                coordinates: [response.gps_lng, response.gps_lat],
              };
            }

            const savedUnit = await trxManager.save(IndustrialUnit, newUnit);
            linkedUnitId = savedUnit.unit_id;
          } else {
            // Link to the duplicate unit for log history
            linkedUnitId = matchedUnitId;
          }

          // 4. Save Survey Response header
          const newResponse = new SurveyResponse();
          newResponse.response_id = response.response_id;
          newResponse.form_id = response.form_id;
          newResponse.unit_id = linkedUnitId;
          newResponse.surveyor_id = user_id;
          newResponse.device_id = device_id;
          newResponse.gps_lat = response.gps_lat;
          newResponse.gps_lng = response.gps_lng;
          newResponse.gps_accuracy_m = response.gps_accuracy_m;
          newResponse.started_at = new Date(response.started_at);
          newResponse.submitted_at = new Date(response.submitted_at);
          newResponse.completeness_score = completenessScore;
          newResponse.is_duplicate = isDuplicate;
          newResponse.sync_status = isDuplicate ? 'pending_sync' : 'synced'; // Duplicates are held for supervisor review
          newResponse.is_offline_capture = true;

          await trxManager.save(SurveyResponse, newResponse);

          // 5. Save Survey Answers
          const answerEntities = response.answers.map((ans) => {
            const answer = new SurveyAnswer();
            answer.response_id = response.response_id;
            answer.question_id = ans.question_id;
            answer.answer_value = ans.answer_value;
            return answer;
          });
          await trxManager.save(SurveyAnswer, answerEntities);

          // 6. Write Duplicate Flag if needed
          if (isDuplicate && linkedUnitId) {
            const flag = new DuplicateFlag();
            flag.response_id = response.response_id;
            flag.matched_unit_id = linkedUnitId;
            flag.match_reason = matchReason;
            flag.is_resolved = false;
            await trxManager.save(DuplicateFlag, flag);
          }

          recordsPushed++;
          results.push({
            response_id: response.response_id,
            status: isDuplicate ? 'duplicate_flagged' : 'synced',
            is_duplicate: isDuplicate,
            message: isDuplicate ? matchReason : 'Response synced and industrial unit created successfully.',
          });
        });
      } catch (err) {
        results.push({
          response_id: response.response_id,
          status: 'failed',
          is_duplicate: false,
          message: err.message || 'Unknown database error occurred during transaction.',
        });
      }
    }

    // Update sync log status
    const status = recordsPushed === responses.length ? 'success' : recordsPushed > 0 ? 'partial' : 'failed';
    await this.entityManager.query(
      `UPDATE sync_log 
       SET sync_completed_at = NOW(), records_pushed = $1, status = $2 
       WHERE sync_id = $3`,
      [recordsPushed, status, syncId],
    );

    return {
      sync_id: syncId,
      status,
      results,
    };
  }
}
