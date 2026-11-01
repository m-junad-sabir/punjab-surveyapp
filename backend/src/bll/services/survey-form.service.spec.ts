import { DataSource, Repository } from 'typeorm';
import { SurveyForm } from '../../dal/entities/survey-form.entity';
import { SurveyQuestion } from '../../dal/entities/survey-question.entity';
import { SurveySection } from '../../dal/entities/survey-section.entity';
import { SurveyFormService } from './survey-form.service';

describe('SurveyFormService Section B', () => {
  it('orders status first and returns month, shift, and working-schedule metadata', async () => {
    const questions = [
      { id: 1, section_id: 1, question_code: 'B_OPERATION_MONTHS', question_no: 'i', answer_type: 'MULTI_CHOICE', lookup_type_id: null },
      { id: 2, section_id: 1, question_code: 'B_OPERATION_STATUS', question_no: 'ii', answer_type: 'SINGLE_CHOICE', lookup_type_id: 20 },
      { id: 3, section_id: 1, question_code: 'B_CLOSURE_REASON', question_no: 'ii', answer_type: 'TEXT', lookup_type_id: null },
      { id: 4, section_id: 1, question_code: 'B_OPERATIONAL_HOURS', question_no: 'iii', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      { id: 5, section_id: 2, question_code: 'A_ESTABLISHMENT_YEAR', question_no: 'ii', answer_type: 'NUMBER', lookup_type_id: null },
      { id: 6, section_id: 2, question_code: 'A_INTERVIEWEES', question_no: 'i(a)', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
    ];
    const builder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(questions),
    };
    const formRepo = { findOne: jest.fn().mockResolvedValue({ id: 1, version: 3 }) };
    const sectionRepo = { find: jest.fn().mockResolvedValue([
      { id: 1, section_code: 'B', title: 'Operations', sort_order: 2 },
      { id: 2, section_code: 'A', title: 'Identity', sort_order: 1 },
    ]) };
    const questionRepo = { createQueryBuilder: jest.fn().mockReturnValue(builder) };
    const dataSource = { query: jest.fn(async (sql: string) => {
      if (sql.includes('SELECT lv.id, lv.code, lv.label')) {
        return [
          { id: 10, code: 'RUNNING', label: 'Running', requires_text: false, parent_id: null, type_id: 20, type_code: 'OPERATION_STATUS' },
          { id: 21, code: 'LESS_THAN_8', label: 'Less than 8 Hours', requires_text: false, parent_id: null, type_id: 22, type_code: 'DAILY_HOURS' },
        ];
      }
      return [];
    }) };

    const service = new SurveyFormService(
      formRepo as unknown as Repository<SurveyForm>,
      sectionRepo as unknown as Repository<SurveySection>,
      questionRepo as unknown as Repository<SurveyQuestion>,
      dataSource as unknown as DataSource,
    );
    const form = await service.getActiveForm();
    const sectionB = form.sections.find((section) => section.section_code === 'B');
    const sectionA = form.sections.find((section) => section.section_code === 'A');

    expect(sectionB?.questions.map((question) => question.question_code)).toEqual([
      'B_OPERATION_STATUS', 'B_OPERATION_MONTHS', 'B_CLOSURE_REASON', 'B_OPERATIONAL_HOURS',
    ]);
    expect(sectionA?.questions.map((question) => question.question_code)).toEqual([
      'A_INTERVIEWEES', 'A_ESTABLISHMENT_YEAR',
    ]);
    const monthField = sectionB?.questions.find((question) => question.question_code === 'B_OPERATION_MONTHS')?.fields[0];
    expect(monthField?.options).toHaveLength(12);
    expect(monthField?.options.map((option) => option.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const fields = sectionB?.questions.find((question) => question.question_code === 'B_OPERATIONAL_HOURS')?.fields;
    expect(fields?.map((field) => field.key)).toEqual([
      'daily_shift_id', 'working_days_per_week', 'working_months_per_year', 'daily_hours',
    ]);
    expect(fields?.[0].options[0].code).toBe('LESS_THAN_8');
    expect(fields?.[1]).toMatchObject({ min: 1, max: 7, step: 1, default_value: 6 });
    expect(fields?.[2]).toMatchObject({ min: 1, max: 12, step: 1 });
  });
});

describe('SurveyFormService Section G', () => {
  it('returns the updated references, share metadata, and innovation gate before its matrix', async () => {
    const questions = [
      { id: 1, section_id: 1, question_code: 'E_MAJOR_INPUTS', question_no: 'ix', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      { id: 2, section_id: 2, question_code: 'G_CRITICAL_MACHINES', question_no: 'i', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      { id: 3, section_id: 2, question_code: 'G_AUTOMATION_LEVEL', question_no: 'v', answer_type: 'SHARE_PERCENT', lookup_type_id: 801 },
      { id: 4, section_id: 2, question_code: 'G_MACHINERY_AGE', question_no: 'viii', answer_type: 'SHARE_PERCENT', lookup_type_id: 802 },
      { id: 5, section_id: 2, question_code: 'G_BOILERS', question_no: 'xi', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      { id: 6, section_id: 2, question_code: 'G_WEIGHTS_MEASURES', question_no: 'xii', answer_type: 'REPEATING_GROUP', lookup_type_id: null },
      { id: 7, section_id: 2, question_code: 'G_INNOVATION', question_no: 'xv', answer_type: 'MATRIX', lookup_type_id: null },
      { id: 8, section_id: 2, question_code: 'G_INNOVATION_GATE', question_no: 'xv', answer_type: 'YES_NO', lookup_type_id: null },
    ];
    const builder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(questions),
    };
    const other = { id: 0, code: 'OTHER', label: 'Other (specify)', requires_text: true, parent_id: null, is_selectable: true };
    const formRepo = { findOne: jest.fn().mockResolvedValue({ id: 1, version: 3 }) };
    const sectionRepo = { find: jest.fn().mockResolvedValue([
      { id: 1, section_code: 'E', title: 'Supply', sort_order: 1 },
      { id: 2, section_code: 'G', title: 'Machinery', sort_order: 2 },
    ]) };
    const questionRepo = { createQueryBuilder: jest.fn().mockReturnValue(builder) };
    const dataSource = { query: jest.fn(async (sql: string) => {
      if (sql.includes('LEFT JOIN lookup_types lt ON lt.id = mi.scale_type_id')) {
        return [{ id: 1001, question_id: 7, group_label: null, item_code: 'I01',
          item_label: 'New product', answer_type: 'CHOICE', allows_text: false, scale_type_id: 803 }];
      }
      if (sql.includes('SELECT lv.id, lv.code, lv.label')) {
        return [
          { id: 81, code: 'MANUAL', label: 'Manual', requires_text: false, type_id: 801, type_code: 'AUTOMATION_LEVEL' },
          { id: 91, code: 'LT5', label: 'Less than 5 years', requires_text: false, type_id: 802, type_code: 'MACHINE_AGE' },
          { id: 901, code: 'NO_PLAN', label: 'No Plan', requires_text: false, type_id: 803, type_code: 'INNOVATION_STATUS' },
        ];
      }
      if (sql.includes('machine_name AS label')) return [other, { id: 101, code: '101', label: 'Boiler', requires_text: false, parent_id: 10, is_selectable: true }];
      if (sql.includes('specification AS label')) return [other, { id: 101, code: '101', label: '20-150 TPH', requires_text: false, parent_id: 101, is_selectable: true }];
      if (sql.includes('LEFT JOIN product_measurement_units p')) {
        return [
          { id: 1, code: 'KG', label: 'Kilogram (kg)', requires_text: false, is_selectable: true },
          { id: 99, code: 'OLD', label: 'Legacy ton', requires_text: false, is_selectable: false },
        ];
      }
      if (sql.includes("'BOILER' AS code")) return [{ id: 1, code: 'BOILER', label: 'Boiler', requires_text: false }];
      return [];
    }) };
    const service = new SurveyFormService(
      formRepo as unknown as Repository<SurveyForm>,
      sectionRepo as unknown as Repository<SurveySection>,
      questionRepo as unknown as Repository<SurveyQuestion>,
      dataSource as unknown as DataSource,
    );
    const form = await service.getActiveForm();
    const sectionG = form.sections.find((section) => section.section_code === 'G')!;
    const byCode = (code: string) => sectionG.questions.find((question) => question.question_code === code)!;
    expect(sectionG.questions.map((question) => question.question_code).slice(-2))
      .toEqual(['G_INNOVATION_GATE', 'G_INNOVATION']);
    expect(byCode('G_AUTOMATION_LEVEL').options[0].code).toBe('MANUAL');
    expect(byCode('G_MACHINERY_AGE').options[0].code).toBe('LT5');
    expect(byCode('G_INNOVATION').matrix_items[0].options[0].code).toBe('NO_PLAN');
    expect(byCode('G_CRITICAL_MACHINES').fields.find((field) => field.key === 'machine_name')?.options)
      .toEqual(form.references.industry_machines);
    expect(byCode('G_CRITICAL_MACHINES').fields.find((field) => field.key === 'specification')?.options)
      .toEqual(form.references.machine_specifications);
    const majorInputs = form.sections.find((section) => section.section_code === 'E')!.questions[0];
    expect(majorInputs.fields.find((field) => field.key === 'unit_id')?.options)
      .toEqual(form.references.product_units);
    expect(form.references.product_units).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, is_selectable: true }),
      expect.objectContaining({ id: 99, is_selectable: false }),
    ]));
  });
});
