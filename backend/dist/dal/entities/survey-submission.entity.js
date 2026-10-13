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
exports.SurveySubmission = void 0;
const typeorm_1 = require("typeorm");
let SurveySubmission = class SurveySubmission {
};
exports.SurveySubmission = SurveySubmission;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SurveySubmission.prototype, "survey_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, unique: true }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "unit_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "survey_ref_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', default: () => 'CURRENT_DATE' }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "interview_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "enumerator_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "enumerator_signature", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 9, scale: 6 }),
    __metadata("design:type", Number)
], SurveySubmission.prototype, "coordinates_lat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 9, scale: 6 }),
    __metadata("design:type", Number)
], SurveySubmission.prototype, "coordinates_lng", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 6, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SurveySubmission.prototype, "gps_accuracy_m", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true }),
    __metadata("design:type", Object)
], SurveySubmission.prototype, "geom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "photo_interview_session", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "photo_entrance_signboard", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "device_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'draft' }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "sync_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SurveySubmission.prototype, "is_verified", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], SurveySubmission.prototype, "verified_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SurveySubmission.prototype, "verified_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], SurveySubmission.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], SurveySubmission.prototype, "updated_at", void 0);
exports.SurveySubmission = SurveySubmission = __decorate([
    (0, typeorm_1.Entity)({ name: 'survey_submissions' })
], SurveySubmission);
//# sourceMappingURL=survey-submission.entity.js.map