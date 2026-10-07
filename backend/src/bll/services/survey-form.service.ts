import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SurveyForm }     from '../../dal/entities/survey-form.entity';
import { SurveySection }  from '../../dal/entities/survey-section.entity';
import { SurveyQuestion } from '../../dal/entities/survey-question.entity';
import { QUESTION_INPUTS, SURVEY_REFERENCES } from './survey-questionnaire';

export interface LookupOption {
  id: number;
  code: string;
  label: string;
  requires_text: boolean;
  parent_id?: number | null;
}

interface MatrixItem {
  id: number;
  question_id: number;
  group_label: string | null;
  item_code: string;
  item_label: string;
  answer_type: 'CHOICE' | 'RATING_1_5';
  allows_text: boolean;
  scale_type_id: number | null;
}

const ROMAN_NUMERALS: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8,
  ix: 9, x: 10, xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16,
};

@Injectable()
export class SurveyFormService {
  constructor(
    @InjectRepository(SurveyForm)
    private readonly formRepo: Repository<SurveyForm>,

    @InjectRepository(SurveySection)
    private readonly sectionRepo: Repository<SurveySection>,

    @InjectRepository(SurveyQuestion)
    private readonly questionRepo: Repository<SurveyQuestion>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getActiveForm() {
    // 1. Active form
    const form = await this.formRepo.findOne({
      where: { is_active: true },
      order: { version: 'DESC' },
    });
    if (!form) throw new NotFoundException('No active survey form found');

    // 2. Sections ordered
    const sections = await this.sectionRepo.find({
      where:  { form_id: form.id },
      order:  { sort_order: 'ASC' },
    });

    // 3. All questions for this form in one query
    const sectionIds = sections.map((s) => s.id);
    const questions = sectionIds.length
      ? await this.questionRepo
          .createQueryBuilder('q')
          .where('q.section_id IN (:...ids)', { ids: sectionIds })
          .orderBy('q.section_id', 'ASC')
          .addOrderBy('q.id', 'ASC')
          .getMany()
      : [];

    const questionIds = questions.map((q) => q.id);
    const matrixItems: MatrixItem[] = questionIds.length
      ? await this.dataSource.query(
          `SELECT mi.id, mi.question_id, mi.group_label, mi.item_code, mi.item_label,
                  mi.answer_type, mi.allows_text, lt.id AS scale_type_id
             FROM matrix_items mi
             LEFT JOIN lookup_types lt ON lt.id = mi.scale_type_id
            WHERE mi.question_id = ANY($1::int[])
            ORDER BY mi.question_id, mi.sort_order, mi.id`,
          [questionIds],
        )
      : [];

    const referenceData = Object.fromEntries(
      await Promise.all(
        Object.entries(SURVEY_REFERENCES).map(async ([key, query]) => [
          key,
          await this.dataSource.query(query),
        ]),
      ),
    );

    const lookupTypeIds = [
      ...new Set([
        ...questions
          .map((q) => q.lookup_type_id)
          .filter((id): id is number => id !== null),
        ...matrixItems
          .map((item) => item.scale_type_id)
          .filter((id): id is number => id !== null),
      ]),
    ];
    const lookupTypeCodes = [
      ...new Set(
        questions.flatMap((q) =>
          (QUESTION_INPUTS[q.question_code]?.fields ?? [])
            .map((input) => input.lookup_type)
            .filter((code): code is string => Boolean(code)),
        ),
      ),
    ];
    const lookupRows: Array<LookupOption & { type_id: number; type_code: string }> =
      lookupTypeIds.length || lookupTypeCodes.length
        ? await this.dataSource.query(
            `SELECT lv.id, lv.code, lv.label, lv.requires_text,
                    l.parent_value_id AS parent_id,
                    lv.type_id, lt.code AS type_code
               FROM lookup_values lv
               JOIN lookup_types lt ON lt.id = lv.type_id
               LEFT JOIN lookup_value_links l ON l.child_value_id = lv.id
              WHERE lv.is_active = true
                AND (lv.type_id = ANY($1::int[]) OR lt.code = ANY($2::text[]))
              ORDER BY lv.sort_order, lv.id, l.parent_value_id`,
            [lookupTypeIds, lookupTypeCodes],
          )
        : [];

    const lookupMap = new Map<number, LookupOption[]>();
    const lookupCodeMap = new Map<string, LookupOption[]>();
    for (const option of lookupRows) {
      const byId = lookupMap.get(option.type_id) ?? [];
      if (!byId.some((item) => item.id === option.id && item.parent_id === option.parent_id)) {
        byId.push(option);
      }
      lookupMap.set(option.type_id, byId);

      const byCode = lookupCodeMap.get(option.type_code) ?? [];
      if (!byCode.some((item) => item.id === option.id && item.parent_id === option.parent_id)) {
        byCode.push(option);
      }
      lookupCodeMap.set(option.type_code, byCode);
    }

    // 5. Group questions under their section
    const qBySection = new Map<number, SurveyQuestion[]>();
    for (const q of questions) {
      const list = qBySection.get(q.section_id) ?? [];
      list.push(q);
      qBySection.set(q.section_id, list);
    }

    return {
      form_id:     form.id,
      code:        form.code,
      title:       form.title,
      version:     form.version,
      sections: sections.map((sec) => ({
        section_id:   sec.id,
        section_code: sec.section_code,
        title:        sec.title,
        sort_order:   sec.sort_order,
        questions: [...(qBySection.get(sec.id) ?? [])]
          .sort((a, b) =>
            (ROMAN_NUMERALS[a.question_no?.toLowerCase() ?? ''] ?? 0) -
            (ROMAN_NUMERALS[b.question_no?.toLowerCase() ?? ''] ?? 0),
          )
          .map((q) => ({
          question_id:    q.id,
          question_code:  q.question_code,
          question_no:    q.question_no,
          question_text:  q.question_text,
          answer_type:    q.answer_type,
          is_required:    q.is_required,
          stored_in:      q.stored_in,
          options: q.lookup_type_id
            ? (lookupMap.get(q.lookup_type_id) ?? [])
            : [],
          fields: (QUESTION_INPUTS[q.question_code]?.fields ?? []).map((input) => ({
            ...input,
            options: input.lookup_type
              ? (lookupCodeMap.get(input.lookup_type) ?? [])
              : input.reference
                ? (referenceData[input.reference] ?? [])
                : input.type === 'MONTHS'
                  ? Array.from({ length: 12 }, (_, i) => ({
                      id: i + 1,
                      code: String(i + 1),
                      label: new Date(2020, i, 1).toLocaleString('en', { month: 'long' }),
                      requires_text: false,
                    }))
                  : [],
            })),
          repeatable: QUESTION_INPUTS[q.question_code]?.repeatable ?? false,
          matrix_items: matrixItems
            .filter((item) => item.question_id === q.id)
            .map((item) => ({
              id: item.id,
              code: item.item_code,
              label: item.item_label,
              group_label: item.group_label,
              answer_type: item.answer_type,
              allows_text: item.allows_text,
              options: item.scale_type_id
                ? (lookupMap.get(item.scale_type_id) ?? [])
                : [],
            })),
        })),
      })),
      references: referenceData,
    };
  }
}
