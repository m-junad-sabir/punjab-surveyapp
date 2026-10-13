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
exports.IndustrialUnit = void 0;
const typeorm_1 = require("typeorm");
let IndustrialUnit = class IndustrialUnit {
};
exports.IndustrialUnit = IndustrialUnit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "unit_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 30 }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "unit_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "unit_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], IndustrialUnit.prototype, "sector_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], IndustrialUnit.prototype, "estate_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], IndustrialUnit.prototype, "cluster_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], IndustrialUnit.prototype, "province_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], IndustrialUnit.prototype, "division_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], IndustrialUnit.prototype, "district_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], IndustrialUnit.prototype, "tehsil_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "contact_person", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "contact_phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150, nullable: true }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "contact_email", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30, nullable: true }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "ownership_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], IndustrialUnit.prototype, "employment_size", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'Unverified' }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "operational_status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'geometry',
        spatialFeatureType: 'Point',
        srid: 4326,
        nullable: true,
    }),
    __metadata("design:type", Object)
], IndustrialUnit.prototype, "geom", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 6, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], IndustrialUnit.prototype, "gps_accuracy_m", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], IndustrialUnit.prototype, "is_verified", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "verified_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], IndustrialUnit.prototype, "verified_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], IndustrialUnit.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], IndustrialUnit.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], IndustrialUnit.prototype, "updated_at", void 0);
exports.IndustrialUnit = IndustrialUnit = __decorate([
    (0, typeorm_1.Entity)({ name: 'industrial_units' })
], IndustrialUnit);
//# sourceMappingURL=industrial-unit.entity.js.map