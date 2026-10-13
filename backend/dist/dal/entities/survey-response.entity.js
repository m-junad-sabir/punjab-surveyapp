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
exports.SurveyResponse = void 0;
const typeorm_1 = require("typeorm");
const survey_answer_entity_1 = require("./survey-answer.entity");
let SurveyResponse = class SurveyResponse {
};
exports.SurveyResponse = SurveyResponse;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], SurveyResponse.prototype, "response_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SurveyResponse.prototype, "form_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], SurveyResponse.prototype, "unit_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SurveyResponse.prototype, "surveyor_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], SurveyResponse.prototype, "device_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 9, scale: 6, nullable: true }),
    __metadata("design:type", Number)
], SurveyResponse.prototype, "gps_lat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 9, scale: 6, nullable: true }),
    __metadata("design:type", Number)
], SurveyResponse.prototype, "gps_lng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 6, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SurveyResponse.prototype, "gps_accuracy_m", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SurveyResponse.prototype, "started_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SurveyResponse.prototype, "submitted_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 15, default: 'draft' }),
    __metadata("design:type", String)
], SurveyResponse.prototype, "sync_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], SurveyResponse.prototype, "is_offline_capture", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SurveyResponse.prototype, "completeness_score", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SurveyResponse.prototype, "is_duplicate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], SurveyResponse.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], SurveyResponse.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => survey_answer_entity_1.SurveyAnswer, (answer) => answer.response),
    __metadata("design:type", Array)
], SurveyResponse.prototype, "answers", void 0);
exports.SurveyResponse = SurveyResponse = __decorate([
    (0, typeorm_1.Entity)({ name: 'survey_responses' })
], SurveyResponse);
//# sourceMappingURL=survey-response.entity.js.map