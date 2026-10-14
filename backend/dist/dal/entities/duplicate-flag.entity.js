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
exports.DuplicateFlag = void 0;
const typeorm_1 = require("typeorm");
let DuplicateFlag = class DuplicateFlag {
};
exports.DuplicateFlag = DuplicateFlag;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment', { type: 'bigint' }),
    __metadata("design:type", Number)
], DuplicateFlag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], DuplicateFlag.prototype, "unit_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], DuplicateFlag.prototype, "matched_unit_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], DuplicateFlag.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 5, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], DuplicateFlag.prototype, "name_similarity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], DuplicateFlag.prototype, "distance_m", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30, default: 'OPEN' }),
    __metadata("design:type", String)
], DuplicateFlag.prototype, "resolution", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], DuplicateFlag.prototype, "resolved_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], DuplicateFlag.prototype, "resolved_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], DuplicateFlag.prototype, "created_at", void 0);
exports.DuplicateFlag = DuplicateFlag = __decorate([
    (0, typeorm_1.Entity)({ name: 'duplicate_flags' })
], DuplicateFlag);
//# sourceMappingURL=duplicate-flag.entity.js.map