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
exports.IndustrialEstate = exports.Sector = exports.Tehsil = exports.District = exports.NamedReference = void 0;
const typeorm_1 = require("typeorm");
class NamedReference {
}
exports.NamedReference = NamedReference;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], NamedReference.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], NamedReference.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, unique: true }),
    __metadata("design:type", String)
], NamedReference.prototype, "code", void 0);
let District = class District extends NamedReference {
};
exports.District = District;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], District.prototype, "division_id", void 0);
exports.District = District = __decorate([
    (0, typeorm_1.Entity)({ name: 'districts' })
], District);
let Tehsil = class Tehsil extends NamedReference {
};
exports.Tehsil = Tehsil;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Tehsil.prototype, "district_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], Tehsil.prototype, "urban_rural", void 0);
exports.Tehsil = Tehsil = __decorate([
    (0, typeorm_1.Entity)({ name: 'tehsils' })
], Tehsil);
let Sector = class Sector extends NamedReference {
};
exports.Sector = Sector;
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Sector.prototype, "parent_sector_id", void 0);
exports.Sector = Sector = __decorate([
    (0, typeorm_1.Entity)({ name: 'sectors' })
], Sector);
let IndustrialEstate = class IndustrialEstate extends NamedReference {
};
exports.IndustrialEstate = IndustrialEstate;
__decorate([
    (0, typeorm_1.Column)({ length: 60, nullable: true }),
    __metadata("design:type", String)
], IndustrialEstate.prototype, "estate_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], IndustrialEstate.prototype, "district_id", void 0);
exports.IndustrialEstate = IndustrialEstate = __decorate([
    (0, typeorm_1.Entity)({ name: 'industrial_estates' })
], IndustrialEstate);
//# sourceMappingURL=reference.entity.js.map