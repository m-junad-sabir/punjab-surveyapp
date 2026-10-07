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
exports.SurveySection = void 0;
const typeorm_1 = require("typeorm");
const survey_form_entity_1 = require("./survey-form.entity");
const survey_question_entity_1 = require("./survey-question.entity");
let SurveySection = class SurveySection {
};
exports.SurveySection = SurveySection;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SurveySection.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SurveySection.prototype, "form_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'char', length: 1 }),
    __metadata("design:type", String)
], SurveySection.prototype, "section_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SurveySection.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', default: 0 }),
    __metadata("design:type", Number)
], SurveySection.prototype, "sort_order", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => survey_form_entity_1.SurveyForm, (f) => f.sections),
    (0, typeorm_1.JoinColumn)({ name: 'form_id' }),
    __metadata("design:type", survey_form_entity_1.SurveyForm)
], SurveySection.prototype, "form", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => survey_question_entity_1.SurveyQuestion, (q) => q.section, { eager: false }),
    __metadata("design:type", Array)
], SurveySection.prototype, "questions", void 0);
exports.SurveySection = SurveySection = __decorate([
    (0, typeorm_1.Entity)({ name: 'survey_sections' })
], SurveySection);
//# sourceMappingURL=survey-section.entity.js.map