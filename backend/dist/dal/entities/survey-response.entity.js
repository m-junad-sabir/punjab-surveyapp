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
let SurveyResponse = class SurveyResponse {
};
exports.SurveyResponse = SurveyResponse;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], SurveyResponse.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SurveyResponse.prototype, "form_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
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
    (0, typeorm_1.Column)({ length: 20, default: 'DRAFT' }),
    __metadata("design:type", String)
], SurveyResponse.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'PENDING' }),
    __metadata("design:type", String)
], SurveyResponse.prototype, "sync_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], SurveyResponse.prototype, "started_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SurveyResponse.prototype, "completed_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SurveyResponse.prototype, "submitted_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], SurveyResponse.prototype, "confirmed_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SurveyResponse.prototype, "confirmed_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SurveyResponse.prototype, "synced_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], SurveyResponse.prototype, "app_version", void 0);
exports.SurveyResponse = SurveyResponse = __decorate([
    (0, typeorm_1.Entity)({ name: 'survey_responses' })
], SurveyResponse);
//# sourceMappingURL=survey-response.entity.js.map