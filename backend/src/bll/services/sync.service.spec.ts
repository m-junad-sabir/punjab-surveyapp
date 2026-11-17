import { DataSource, Repository } from 'typeorm';
import { SurveyResponse } from '../../dal/entities/survey-response.entity';
import { PhotoService } from './photo.service';
import { SyncPayload, SyncService } from './sync.service';

describe('Section B sync', () => {
  const questions = [
    { id: 1, question_code: 'B_OPERATION_STATUS', answer_type: 'SINGLE_CHOICE', lookup_type_id: 20 },
    { id: 2, question_code: 'B_OPERATION_MONTHS', answer_type: 'MULTI_CHOICE', lookup_type_id: null },
    { id: 3, question_code: 'B_CLOSURE_REASON', answer_type: 'TEXT', lookup_type_id: null },
    { id: 4, question_code: 'B_OPERATIONAL_HOURS', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
  ];

  function setup(status: 'RUNNING' | 'PERM_CLOSED') {
    const query = jest.fn(async (sql: string, parameters?: unknown[]) => {
      if (sql.includes('SELECT q.id, q.question_code')) {
        const ids = parameters?.[0] as number[];
        return questions.filter((question) => ids.includes(question.id));
      }
      if (sql.includes("lt.code = 'OPERATION_STATUS'")) return [{ code: status }];
      if (sql.includes("lt.code = 'DAILY_HOURS'")) return [{ id: 21 }];
      return [];
    });
    const trx = {
      findOne: jest.fn().mockResolvedValue(null),
      query,
      create: jest.fn((_entity, values) => values),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      query: jest.fn(async (sql: string) => sql.includes('INSERT INTO sync_log') ? [{ id: 1 }] : []),
      transaction: jest.fn(async (operation: (manager: typeof trx) => Promise<unknown>) => operation(trx)),
    };
    const photoService = { attachRequiredPhotos: jest.fn().mockResolvedValue(undefined) };
    const service = new SyncService(
      {} as Repository<SurveyResponse>,
      dataSource as unknown as DataSource,
      photoService as unknown as PhotoService,
    );
    const payload = (answers: SyncPayload['responses'][number]['answers']): SyncPayload => ({
      device_id: 'device-id',
      user_id: 'surveyor-id',
      responses: [{
        response_id: 'response-id',
        form_id: 1,
        unit_id: 'unit-id',
        started_at: '2026-01-01T00:00:00.000Z',
        submitted_at: '2026-01-02T00:00:00.000Z',
        answers,
      }],
    });
    return { service, trx, query, payload };
  }

  it('rejects invalid working months before writing the response', async () => {
    const { service, trx, payload } = setup('RUNNING');
    const result = await service.syncBatch(payload([
      { question_id: 1, answer_value: 10 },
      { question_id: 4, answer_value: { working_months_per_year: 13 } },
    ]));

    expect(result.results[0]).toMatchObject({
      status: 'failed',
      message: 'Total working months per year must be a whole number between 1 and 12.',
    });
    expect(trx.save).not.toHaveBeenCalled();
  });

  it('rejects a malformed working schedule before writing the response', async () => {
    const { service, trx, payload } = setup('RUNNING');
    const result = await service.syncBatch(payload([
      { question_id: 1, answer_value: 10 },
      { question_id: 4, answer_value: [{ working_months_per_year: 13 }] },
    ]));

    expect(result.results[0]).toMatchObject({
      status: 'failed',
      message: 'Provide a valid working schedule.',
    });
    expect(trx.save).not.toHaveBeenCalled();
  });

  it('saves the operating branch with selected months and working schedule', async () => {
    const { service, query, payload } = setup('RUNNING');
    const result = await service.syncBatch(payload([
      { question_id: 1, answer_value: 10 },
      { question_id: 2, answer_value: { operating_months: [1, 2, 12] } },
      { question_id: 4, answer_value: {
        daily_shift_id: 21,
        working_days_per_week: 7,
        working_months_per_year: 12,
        daily_hours: 7,
      } },
    ]));

    expect(result.results[0].status).toBe('synced');
    const operationInsert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_b_operations'));
    expect(operationInsert?.[1]).toEqual(['response-id', [1, 2, 12], 10, null, 21, 7, 7, 12]);
  });

  it('stores the existing six-day default for a blank operating schedule', async () => {
    const { service, query, payload } = setup('RUNNING');
    const result = await service.syncBatch(payload([
      { question_id: 1, answer_value: 10 },
    ]));

    expect(result.results[0].status).toBe('synced');
    const operationInsert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_b_operations'));
    expect(operationInsert?.[1]).toEqual(['response-id', null, 10, null, null, null, 6, null]);
  });

  it('discards stale hours and months for a permanently closed response', async () => {
    const { service, query, payload } = setup('PERM_CLOSED');
    const result = await service.syncBatch(payload([
      { question_id: 1, answer_value: 10 },
      { question_id: 2, answer_value: { operating_months: [1, 2] } },
      { question_id: 3, answer_value: { closure_reason: 'Closed' } },
      { question_id: 4, answer_value: { daily_hours: 8, working_days_per_week: 9, working_months_per_year: 13 } },
    ]));

    expect(result.results[0].status).toBe('synced');
    const operationInsert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO sec_b_operations'));
    expect(operationInsert?.[1]).toEqual(['response-id', null, 10, 'Closed', null, null, null, null]);
  });
});
