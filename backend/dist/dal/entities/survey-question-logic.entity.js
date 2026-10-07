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
exports.SurveyQuestionLogic = void 0;
const typeorm_1 = require("typeorm");
let SurveyQuestionLogic = class SurveyQuestionLogic {
};
exports.SurveyQuestionLogic = SurveyQuestionLogic;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], SurveyQuestionLogic.prototype, "logic_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SurveyQuestionLogic.prototype, "question_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SurveyQuestionLogic.prototype, "condition_question_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10 }),
    __metadata("design:type", String)
], SurveyQuestionLogic.prototype, "condition_operator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SurveyQuestionLogic.prototype, "condition_value", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 15 }),
    __metadata("design:type", String)
], SurveyQuestionLogic.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], SurveyQuestionLogic.prototype, "created_at", void 0);
exports.SurveyQuestionLogic = SurveyQuestionLogic = __decorate([
    (0, typeorm_1.Entity)({ name: 'survey_question_logic' })
], SurveyQuestionLogic);
//# sourceMappingURL=survey-question-logic.entity.js.map