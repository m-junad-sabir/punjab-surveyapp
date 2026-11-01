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
exports.SurveyFormService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const survey_form_entity_1 = require("../../dal/entities/survey-form.entity");
const survey_section_entity_1 = require("../../dal/entities/survey-section.entity");
const survey_question_entity_1 = require("../../dal/entities/survey-question.entity");
const survey_questionnaire_1 = require("./survey-questionnaire");
const ROMAN_NUMERALS = {
    i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8,
    ix: 9, x: 10, xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16,
};
function questionNumberOrder(value) {
    const match = value?.match(/^([ivxlcdm]+)(?:\(([a-z])\))?$/i);
    if (!match)
        return 0;
    const romanOrder = ROMAN_NUMERALS[match[1].toLowerCase()] ?? 0;
    const subQuestionOrder = match[2] ? match[2].toLowerCase().charCodeAt(0) - 96 : 0;
    return romanOrder * 100 + subQuestionOrder;
}
function questionOrder(question, sectionCode) {
    if (sectionCode === 'B' && question.question_code === 'B_OPERATION_STATUS')
        return -1;
    return questionNumberOrder(question.question_no);
}
let SurveyFormService = class SurveyFormService {
    constructor(formRepo, sectionRepo, questionRepo, dataSource) {
        this.formRepo = formRepo;
        this.sectionRepo = sectionRepo;
        this.questionRepo = questionRepo;
        this.dataSource = dataSource;
    }
    async getActiveForm() {
        const form = await this.formRepo.findOne({
            where: { is_active: true },
            order: { version: 'DESC' },
        });
        if (!form)
            throw new common_1.NotFoundException('No active survey form found');
        const sections = await this.sectionRepo.find({
            where: { form_id: form.id },
            order: { sort_order: 'ASC' },
        });
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
        const matrixItems = questionIds.length
            ? await this.dataSource.query(`SELECT mi.id, mi.question_id, mi.group_label, mi.item_code, mi.item_label,
                  mi.answer_type, mi.allows_text, lt.id AS scale_type_id
             FROM matrix_items mi
             LEFT JOIN lookup_types lt ON lt.id = mi.scale_type_id
            WHERE mi.question_id = ANY($1::int[])
            ORDER BY mi.question_id, mi.sort_order, mi.id`, [questionIds])
            : [];
        const referenceData = Object.fromEntries(await Promise.all(Object.entries(survey_questionnaire_1.SURVEY_REFERENCES).map(async ([key, query]) => [
            key,
            await this.dataSource.query(query),
        ])));
        const lookupTypeIds = [
            ...new Set([
                ...questions
                    .map((q) => q.lookup_type_id)
                    .filter((id) => id !== null),
                ...matrixItems
                    .map((item) => item.scale_type_id)
                    .filter((id) => id !== null),
            ]),
        ];
        const lookupTypeCodes = [
            ...new Set(questions.flatMap((q) => (survey_questionnaire_1.QUESTION_INPUTS[q.question_code]?.fields ?? [])
                .map((input) => input.lookup_type)
                .filter((code) => Boolean(code)))),
        ];
        const lookupRows = lookupTypeIds.length || lookupTypeCodes.length
            ? await this.dataSource.query(`SELECT lv.id, lv.code, lv.label, lv.requires_text,
                    l.parent_value_id AS parent_id,
                    lv.type_id, lt.code AS type_code
               FROM lookup_values lv
               JOIN lookup_types lt ON lt.id = lv.type_id
               LEFT JOIN lookup_value_links l ON l.child_value_id = lv.id
              WHERE lv.is_active = true
                AND (lv.type_id = ANY($1::int[]) OR lt.code = ANY($2::text[]))
              ORDER BY lv.sort_order, lv.id, l.parent_value_id`, [lookupTypeIds, lookupTypeCodes])
            : [];
        const lookupMap = new Map();
        const lookupCodeMap = new Map();
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
        if (questions.some((question) => question.question_code === 'A_UNIT_TYPE')) {
            referenceData.unit_type_psic_classes = await this.dataSource.query(`SELECT c.id, c.code, c.code || ' - ' || c.name AS label,
                false AS requires_text, m.unit_type_id AS parent_id
           FROM unit_type_psic_classes m
           JOIN psic_classes c ON c.id = m.psic_class_id
          ORDER BY c.code`);
        }
        const qBySection = new Map();
        for (const q of questions) {
            const list = qBySection.get(q.section_id) ?? [];
            list.push(q);
            qBySection.set(q.section_id, list);
        }
        return {
            form_id: form.id,
            code: form.code,
            title: form.title,
            version: form.version,
            sections: sections.map((sec) => ({
                section_id: sec.id,
                section_code: sec.section_code,
                title: sec.title,
                sort_order: sec.sort_order,
                questions: [...(qBySection.get(sec.id) ?? [])]
                    .sort((a, b) => questionOrder(a, sec.section_code) - questionOrder(b, sec.section_code))
                    .map((q) => ({
                    question_id: q.id,
                    question_code: q.question_code,
                    question_no: q.question_no,
                    question_text: q.question_code === 'A_LOCATION'
                        ? 'District and tehsil'
                        : q.question_text,
                    answer_type: q.answer_type,
                    is_required: q.is_required,
                    stored_in: q.stored_in,
                    options: q.lookup_type_id
                        ? (lookupMap.get(q.lookup_type_id) ?? [])
                        : [],
                    fields: (survey_questionnaire_1.QUESTION_INPUTS[q.question_code]?.fields ?? []).map((input) => ({
                        ...input,
                        options: input.lookup_type
                            ? (lookupCodeMap.get(input.lookup_type) ?? [])
                            : input.reference
                                ? ['psic_divisions', 'psic_groups', 'psic_classes', 'hs_codes'].includes(input.reference)
                                    ? []
                                    : (referenceData[input.reference] ?? [])
                                : input.type === 'MONTHS'
                                    ? Array.from({ length: 12 }, (_, i) => ({
                                        id: i + 1,
                                        code: String(i + 1),
                                        label: new Date(2020, i, 1).toLocaleString('en', { month: 'long' }),
                                        requires_text: false,
                                    }))
                                    : [],
                    })),
                    repeatable: survey_questionnaire_1.QUESTION_INPUTS[q.question_code]?.repeatable ?? false,
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
};
exports.SurveyFormService = SurveyFormService;
exports.SurveyFormService = SurveyFormService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(survey_form_entity_1.SurveyForm)),
    __param(1, (0, typeorm_1.InjectRepository)(survey_section_entity_1.SurveySection)),
    __param(2, (0, typeorm_1.InjectRepository)(survey_question_entity_1.SurveyQuestion)),
    __param(3, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], SurveyFormService);
//# sourceMappingURL=survey-form.service.js.map