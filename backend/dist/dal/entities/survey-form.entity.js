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
exports.SurveyForm = void 0;
const typeorm_1 = require("typeorm");
const survey_section_entity_1 = require("./survey-section.entity");
let SurveyForm = class SurveyForm {
};
exports.SurveyForm = SurveyForm;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SurveyForm.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 50 }),
    __metadata("design:type", String)
], SurveyForm.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SurveyForm.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1 }),
    __metadata("design:type", Number)
], SurveyForm.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], SurveyForm.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], SurveyForm.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => survey_section_entity_1.SurveySection, (s) => s.form, { eager: false }),
    __metadata("design:type", Array)
], SurveyForm.prototype, "sections", void 0);
exports.SurveyForm = SurveyForm = __decorate([
    (0, typeorm_1.Entity)({ name: 'survey_forms' })
], SurveyForm);
//# sourceMappingURL=survey-form.entity.js.map