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
