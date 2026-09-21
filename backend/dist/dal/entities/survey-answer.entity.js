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
exports.SurveyAnswer = void 0;
const typeorm_1 = require("typeorm");
const survey_response_entity_1 = require("./survey-response.entity");
const survey_question_entity_1 = require("./survey-question.entity");
let SurveyAnswer = class SurveyAnswer {
};
exports.SurveyAnswer = SurveyAnswer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], SurveyAnswer.prototype, "answer_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SurveyAnswer.prototype, "response_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => survey_response_entity_1.SurveyResponse, (response) => response.answers, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'response_id' }),
    __metadata("design:type", survey_response_entity_1.SurveyResponse)
], SurveyAnswer.prototype, "response", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SurveyAnswer.prototype, "question_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => survey_question_entity_1.SurveyQuestion),
    (0, typeorm_1.JoinColumn)({ name: 'question_id' }),
    __metadata("design:type", survey_question_entity_1.SurveyQuestion)
], SurveyAnswer.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], SurveyAnswer.prototype, "answer_value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], SurveyAnswer.prototype, "answered_at", void 0);
exports.SurveyAnswer = SurveyAnswer = __decorate([
    (0, typeorm_1.Entity)({ name: 'survey_answers' })
], SurveyAnswer);
//# sourceMappingURL=survey-answer.entity.js.map