import { DataSource, EntityManager, Repository } from 'typeorm';
import { SurveyForm } from '../../dal/entities/survey-form.entity';
import { SurveyQuestion } from '../../dal/entities/survey-question.entity';
import { SurveyResponse } from '../../dal/entities/survey-response.entity';
import { SurveySection } from '../../dal/entities/survey-section.entity';
import { PhotoService } from './photo.service';
import { SurveyFormService } from './survey-form.service';
import { normalizeSectionDAnswers } from './survey-response-writer';
import { SyncPayload, SyncService } from './sync.service';

const levels = [
  { id: 11, code: 'UNSKILLED', label: 'Unskilled', requires_text: false, is_active: true },
  { id: 12, code: 'SEMI', label: 'Semi-skilled', requires_text: false, is_active: true },
  { id: 13, code: 'SKILLED', label: 'Skilled', requires_text: false, is_active: true },
  { id: 14, code: 'TECHNICAL', label: 'Technical', requires_text: false, is_active: true },
  { id: 15, code: 'PROFESSIONAL', label: 'Professional', requires_text: false, is_active: true },
  { id: 99, code: 'LEGACY', label: 'Legacy skill', requires_text: false, is_active: false },
];

const employment = [
  { gender: 1, regular_count: 4, contract_count: 2, daily_wage_count: '' },
  { gender: 'MALE', regular_count: 1 },
  { gender: 2, regular_count: 3, contract_count: null, daily_wage_count: 1 },
  { gender: 'Other', regular_count: 0, contract_count: 4, daily_wage_count: 2 },
];

const skills = [
  { gender: 1, skill_level_id: 11, headcount: 2 },
  { gender: 'MALE', skill_level_id: 11, headcount: 3 },
  { gender: 2, skill_level_id: 11, headcount: 2 },
  { gender: 3, skill_level_id: 11, headcount: 1 },
  { gender: 1, skill_level_id: 12, headcount: 2 },
  { gender: 2, skill_level_id: 12, headcount: 2 },
  { gender: 'Other', skill_level_id: 13, headcount: 5 },
];

function managerWithLevels(available = levels) {
  const query = jest.fn(async () => available);
  return { manager: { query } as unknown as EntityManager, query };
}

describe('Section D normalization', () => {
  it('only defaults Section D when its questions belong to the response', async () => {
    const { manager, query } = managerWithLevels();
    const answers = new Map<string, unknown>([['UNRELATED', null]]);
    await normalizeSectionDAnswers(manager, answers);
    expect(answers).toEqual(new Map([['UNRELATED', null]]));
    expect(query).not.toHaveBeenCalled();
  });

  it('materializes blank counts for all genders and five active skill levels', async () => {
    const { manager } = managerWithLevels();
    const answers = new Map<string, unknown>([['D_EMPLOYMENT', null], ['D_SKILLS', []]]);
    await normalizeSectionDAnswers(manager, answers);
    expect(answers.get('D_EMPLOYMENT')).toEqual([
      { gender: 'MALE', regular_count: 0, contract_count: 0, daily_wage_count: 0 },
      { gender: 'FEMALE', regular_count: 0, contract_count: 0, daily_wage_count: 0 },
      { gender: 'Other', regular_count: 0, contract_count: 0, daily_wage_count: 0 },
    ]);
    const rows = answers.get('D_SKILLS') as Array<{ gender: string; skill_level_id: number; headcount: number }>;
    expect(rows).toHaveLength(15);
    expect(new Set(rows.map((row) => row.skill_level_id))).toEqual(new Set([11, 12, 13, 14, 15]));
    expect(rows.every((row) => row.headcount === 0)).toBe(true);
    expect(rows.filter((row) => row.gender === 'Other')).toHaveLength(5);
  });

  it('combines legacy duplicate rows and keeps referenced inactive skill levels', async () => {
    const { manager } = managerWithLevels();
    const answers = new Map<string, unknown>([
      ['D_EMPLOYMENT', employment],
      ['D_SKILLS', [...skills, { gender: { option_id: 'Other' }, skill_level_id: { option_id: '99' }, headcount: '7' }]],
    ]);
    await normalizeSectionDAnswers(manager, answers);
    const employmentRows = answers.get('D_EMPLOYMENT') as Array<Record<string, unknown>>;
    expect(employmentRows).toEqual([
      { gender: 'MALE', regular_count: 5, contract_count: 2, daily_wage_count: 0 },
      { gender: 'FEMALE', regular_count: 3, contract_count: 0, daily_wage_count: 1 },
      { gender: 'Other', regular_count: 0, contract_count: 4, daily_wage_count: 2 },
    ]);
    const skillRows = answers.get('D_SKILLS') as Array<{ gender: string; skill_level_id: number; headcount: number }>;
    expect(skillRows).toHaveLength(18);
    expect(skillRows.find((row) => row.skill_level_id === 11 && row.gender === 'MALE')?.headcount).toBe(5);
    expect(skillRows.find((row) => row.skill_level_id === 99 && row.gender === 'Other')?.headcount).toBe(7);
  });

  it.each([-1, 0.5, 2_147_483_648, 'bad', true, NaN])(
    'rejects invalid counts instead of replacing %p with zero',
    async (invalid) => {
      const { manager } = managerWithLevels();
      const answers = new Map<string, unknown>([['D_EMPLOYMENT', [{ gender: 1, regular_count: invalid }]]]);
      await expect(normalizeSectionDAnswers(manager, answers)).rejects.toThrow('whole number between 0 and');
    },
  );

  it('rejects invalid shapes, genders, skill IDs, and missing references', async () => {
    const { manager } = managerWithLevels();
    const badAnswers: Array<[string, unknown, string]> = [
      ['D_EMPLOYMENT', {}, 'valid employment rows'],
      ['D_EMPLOYMENT', [null], 'valid employment rows'],
      ['D_EMPLOYMENT', [{ gender: 'OTHER', regular_count: 1 }], 'valid gender'],
      ['D_SKILLS', [{ gender: 1, skill_level_id: 404, headcount: 1 }], 'valid skill level'],
      ['D_SKILLS', [{ gender: 1, skill_level_id: 11, headcount: -1 }], 'whole number between 0 and'],
    ];
    for (const [key, value, message] of badAnswers) {
      await expect(normalizeSectionDAnswers(manager, new Map([[key, value]]))).rejects.toThrow(message);
    }
    const noActive = managerWithLevels(levels.filter((level) => !level.is_active)).manager;
    await expect(normalizeSectionDAnswers(noActive, new Map([['D_SKILLS', []]]))).rejects.toThrow('unavailable');
  });

  it('rejects duplicate-cell and generated employment-total overflow', async () => {
    const { manager } = managerWithLevels();
    const max = 2_147_483_647;
    const cases = [
      ['D_EMPLOYMENT', [{ gender: 1, regular_count: max }, { gender: 1, regular_count: 1 }]],
      ['D_EMPLOYMENT', [{ gender: 1, regular_count: max, contract_count: 1 }]],
      ['D_SKILLS', [{ gender: 1, skill_level_id: 11, headcount: max }, { gender: 1, skill_level_id: 11, headcount: 1 }]],
    ] as Array<[string, unknown]>;
    for (const [key, value] of cases) {
      await expect(normalizeSectionDAnswers(manager, new Map([[key, value]]))).rejects.toThrow('cannot exceed');
    }
  });
});

describe('Section D form references', () => {
  it('provides zero defaults, safe integer bounds, active choices and historical labels offline', async () => {
    const questions = [
      { id: 1, section_id: 1, question_code: 'D_EMPLOYMENT', question_no: 'i', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      { id: 2, section_id: 1, question_code: 'D_SKILLS', question_no: 'ii', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
    ];
    const builder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(questions),
    };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('lv.is_active AS is_selectable')) {
        return levels.map(({ is_active, ...level }) => ({ ...level, is_selectable: is_active }));
      }
      if (sql.includes('l.parent_value_id AS parent_id')) {
        return levels.filter((level) => level.is_active).map((level) => ({
          ...level, parent_id: null, type_id: 50, type_code: 'SKILL_LEVEL',
        }));
      }
      return [];
    });
    const service = new SurveyFormService(
      { findOne: jest.fn().mockResolvedValue({ id: 1, version: 3 }) } as unknown as Repository<SurveyForm>,
      { find: jest.fn().mockResolvedValue([{ id: 1, section_code: 'D', title: 'Workforce', sort_order: 1 }]) } as unknown as Repository<SurveySection>,
      { createQueryBuilder: jest.fn().mockReturnValue(builder) } as unknown as Repository<SurveyQuestion>,
      { query } as unknown as DataSource,
    );
    const form = await service.getActiveForm();
    const [employmentQuestion, skillsQuestion] = form.sections[0].questions;
    expect(employmentQuestion.fields.find((field) => field.key === 'regular_count'))
      .toMatchObject({ min: 0, max: 2_147_483_647, step: 1, default_value: 0 });
    expect(skillsQuestion.fields.find((field) => field.key === 'headcount'))
      .toMatchObject({ min: 0, max: 2_147_483_647, step: 1, default_value: 0 });
    expect(skillsQuestion.fields.find((field) => field.key === 'skill_level_id')?.options).toHaveLength(5);
    expect(form.references.workforce_skill_levels).toHaveLength(6);
    expect(form.references.workforce_skill_levels.find((level: { id: number }) => level.id === 99))
      .toMatchObject({ is_selectable: false, label: 'Legacy skill' });
  });
});

describe('Section D sync and persisted totals', () => {
  function setup() {
    const questions = [
      { id: 1, question_code: 'D_EMPLOYMENT', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      { id: 2, question_code: 'D_SKILLS', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      { id: 3, question_code: 'UNRELATED', answer_type: 'TEXT', lookup_type_id: null },
    ];
    const query = jest.fn(async (sql: string, parameters: unknown[] = []) => {
      if (sql.includes('SELECT q.id, q.question_code')) {
        const ids = parameters[0] as number[];
        const formQuestions = parameters[1] === 1 ? questions : questions.filter((question) => question.id === 3);
        return formQuestions.filter((question) =>
          ids.includes(question.id) || question.question_code === 'D_EMPLOYMENT' || question.question_code === 'D_SKILLS');
      }
      if (sql.includes("lt.code = 'SKILL_LEVEL'")) return levels;
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
    const service = new SyncService(
      {} as Repository<SurveyResponse>,
      dataSource as unknown as DataSource,
      { attachRequiredPhotos: jest.fn().mockResolvedValue(undefined) } as unknown as PhotoService,
    );
    const payload = (answers: SyncPayload['responses'][number]['answers'], formId = 1): SyncPayload => ({
      device_id: 'device-id', user_id: 'surveyor-id',
      responses: [{
        response_id: 'response-id', form_id: formId, unit_id: 'unit-id',
        started_at: '2026-01-01T00:00:00.000Z', submitted_at: '2026-01-02T00:00:00.000Z', answers,
      }],
    });
    return { service, trx, query, payload };
  }

  it('materializes wholly omitted workforce questions from an older queued response', async () => {
    const { service, query, payload } = setup();
    const result = await service.syncBatch(payload([]));
    expect(result.results[0].status).toBe('synced');
    const employees = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO workforce_employment'));
    const skillRows = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO workforce_skills'));
    expect(employees).toHaveLength(3);
    expect(skillRows).toHaveLength(15);
    expect(employees.map(([, params]) => params)).toContainEqual(['response-id', 'Other', 0, 0, 0]);
    expect(skillRows.map(([, params]) => params)).toContainEqual(['response-id', 'Other', 15, 0]);
  });

  it('stores the same subtotals as the form and PDF, including Other', async () => {
    const { service, query, payload } = setup();
    const result = await service.syncBatch(payload([
      { question_id: 1, answer_value: employment },
      { question_id: 2, answer_value: skills },
    ]));
    expect(result.results[0].status).toBe('synced');
    const employees = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO workforce_employment'))
      .map(([, params]) => params);
    expect(employees).toEqual([
      ['response-id', 'MALE', 5, 2, 0],
      ['response-id', 'FEMALE', 3, 0, 1],
      ['response-id', 'Other', 0, 4, 2],
    ]);
    expect(employees.map((params) => Number(params[2]) + Number(params[3]) + Number(params[4]))).toEqual([7, 4, 6]);
    const skillRows = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO workforce_skills'))
      .map(([, params]) => params);
    expect(skillRows).toHaveLength(15);
    const totals = ['MALE', 'FEMALE', 'Other'].map((gender) => skillRows
      .filter((params) => params[1] === gender).reduce((sum, params) => sum + Number(params[3]), 0));
    expect(totals).toEqual([7, 4, 6]);
    expect(totals.reduce((sum, total) => sum + total, 0)).toBe(17);
  });

  it('does not add Section D to a different form or accept foreign question IDs', async () => {
    const { service, query, payload } = setup();
    const result = await service.syncBatch(payload([{ question_id: 3, answer_value: 'x' }], 2));
    expect(result.results[0].status).toBe('synced');
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO workforce_'))).toBe(false);
    const invalid = await service.syncBatch(payload([{ question_id: 1, answer_value: [] }], 2));
    expect(invalid.results[0]).toMatchObject({ status: 'failed', message: expect.stringContaining('does not belong') });
  });

  it('rejects invalid workforce data before writing the response', async () => {
    const { service, trx, payload } = setup();
    const result = await service.syncBatch(payload([
      { question_id: 1, answer_value: [{ gender: 1, regular_count: -1 }] },
    ]));
    expect(result.results[0]).toMatchObject({ status: 'failed', message: expect.stringContaining('whole number') });
    expect(trx.save).not.toHaveBeenCalled();
  });
});
