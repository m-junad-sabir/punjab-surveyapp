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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurveyQuestion = void 0;
const typeorm_1 = require("typeorm");
const survey_section_entity_1 = require("./survey-section.entity");
let SurveyQuestion = class SurveyQuestion {
};
exports.SurveyQuestion = SurveyQuestion;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SurveyQuestion.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SurveyQuestion.prototype, "section_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30 }),
    __metadata("design:type", String)
], SurveyQuestion.prototype, "question_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30, nullable: true }),
    __metadata("design:type", String)
], SurveyQuestion.prototype, "question_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SurveyQuestion.prototype, "question_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30 }),
    __metadata("design:type", String)
], SurveyQuestion.prototype, "answer_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], SurveyQuestion.prototype, "lookup_type_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SurveyQuestion.prototype, "is_required", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80, nullable: true }),
    __metadata("design:type", String)
], SurveyQuestion.prototype, "stored_in", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => survey_section_entity_1.SurveySection, (s) => s.questions),
    (0, typeorm_1.JoinColumn)({ name: 'section_id' }),
    __metadata("design:type", survey_section_entity_1.SurveySection)
], SurveyQuestion.prototype, "section", void 0);
exports.SurveyQuestion = SurveyQuestion = __decorate([
    (0, typeorm_1.Entity)({ name: 'survey_questions' })
], SurveyQuestion);
//# sourceMappingURL=survey-question.entity.js.map