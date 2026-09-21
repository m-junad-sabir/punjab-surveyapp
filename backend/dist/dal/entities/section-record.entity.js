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
exports.SectionGCriticalMachine = exports.SectionFProductSale = exports.SectionERawMaterial = exports.SectionCProduct = exports.SectionAAssociatedEstablishment = exports.SectionKCollaborationsBarriers = exports.SectionJStrategicBusinessPlan = exports.SectionICertificationsCompliances = exports.SectionHEnergyWaste = exports.SectionGTechnologyProduction = exports.SectionFForwardLinkages = exports.SectionEBackwardLinkages = exports.SectionDWorkforce = exports.SectionCCoreSecondaryActivities = exports.SectionBOperationalDetails = exports.SectionAEstablishmentIdentity = void 0;
const typeorm_1 = require("typeorm");
class SectionRecord {
}
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], SectionRecord.prototype, "survey_id", void 0);
let SectionAEstablishmentIdentity = class SectionAEstablishmentIdentity extends SectionRecord {
};
exports.SectionAEstablishmentIdentity = SectionAEstablishmentIdentity;
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], SectionAEstablishmentIdentity.prototype, "establishment_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SectionAEstablishmentIdentity.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], SectionAEstablishmentIdentity.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], SectionAEstablishmentIdentity.prototype, "tehsil", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], SectionAEstablishmentIdentity.prototype, "district", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], SectionAEstablishmentIdentity.prototype, "ownership_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], SectionAEstablishmentIdentity.prototype, "legal_structure", void 0);
exports.SectionAEstablishmentIdentity = SectionAEstablishmentIdentity = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_a_establishment_identity' })
], SectionAEstablishmentIdentity);
let SectionBOperationalDetails = class SectionBOperationalDetails extends SectionRecord {
};
exports.SectionBOperationalDetails = SectionBOperationalDetails;
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], SectionBOperationalDetails.prototype, "operational_status", void 0);
exports.SectionBOperationalDetails = SectionBOperationalDetails = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_b_operational_details' })
], SectionBOperationalDetails);
let SectionCCoreSecondaryActivities = class SectionCCoreSecondaryActivities extends SectionRecord {
};
exports.SectionCCoreSecondaryActivities = SectionCCoreSecondaryActivities;
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SectionCCoreSecondaryActivities.prototype, "has_secondary_products", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SectionCCoreSecondaryActivities.prototype, "summary_remarks", void 0);
exports.SectionCCoreSecondaryActivities = SectionCCoreSecondaryActivities = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_c_core_secondary_activities' })
], SectionCCoreSecondaryActivities);
let SectionDWorkforce = class SectionDWorkforce extends SectionRecord {
};
exports.SectionDWorkforce = SectionDWorkforce;
exports.SectionDWorkforce = SectionDWorkforce = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_d_workforce' })
], SectionDWorkforce);
let SectionEBackwardLinkages = class SectionEBackwardLinkages extends SectionRecord {
};
exports.SectionEBackwardLinkages = SectionEBackwardLinkages;
exports.SectionEBackwardLinkages = SectionEBackwardLinkages = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_e_backward_linkages' })
], SectionEBackwardLinkages);
let SectionFForwardLinkages = class SectionFForwardLinkages extends SectionRecord {
};
exports.SectionFForwardLinkages = SectionFForwardLinkages;
exports.SectionFForwardLinkages = SectionFForwardLinkages = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_f_forward_linkages' })
], SectionFForwardLinkages);
let SectionGTechnologyProduction = class SectionGTechnologyProduction extends SectionRecord {
};
exports.SectionGTechnologyProduction = SectionGTechnologyProduction;
exports.SectionGTechnologyProduction = SectionGTechnologyProduction = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_g_technology_production' })
], SectionGTechnologyProduction);
let SectionHEnergyWaste = class SectionHEnergyWaste extends SectionRecord {
};
exports.SectionHEnergyWaste = SectionHEnergyWaste;
exports.SectionHEnergyWaste = SectionHEnergyWaste = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_h_energy_waste' })
], SectionHEnergyWaste);
let SectionICertificationsCompliances = class SectionICertificationsCompliances extends SectionRecord {
};
exports.SectionICertificationsCompliances = SectionICertificationsCompliances;
exports.SectionICertificationsCompliances = SectionICertificationsCompliances = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_i_certifications_compliances' })
], SectionICertificationsCompliances);
let SectionJStrategicBusinessPlan = class SectionJStrategicBusinessPlan extends SectionRecord {
};
exports.SectionJStrategicBusinessPlan = SectionJStrategicBusinessPlan;
exports.SectionJStrategicBusinessPlan = SectionJStrategicBusinessPlan = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_j_strategic_business_plan' })
], SectionJStrategicBusinessPlan);
let SectionKCollaborationsBarriers = class SectionKCollaborationsBarriers extends SectionRecord {
};
exports.SectionKCollaborationsBarriers = SectionKCollaborationsBarriers;
exports.SectionKCollaborationsBarriers = SectionKCollaborationsBarriers = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_k_collaborations_barriers' })
], SectionKCollaborationsBarriers);
let SectionAAssociatedEstablishment = class SectionAAssociatedEstablishment {
};
exports.SectionAAssociatedEstablishment = SectionAAssociatedEstablishment;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], SectionAAssociatedEstablishment.prototype, "associated_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], SectionAAssociatedEstablishment.prototype, "survey_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SectionAAssociatedEstablishment.prototype, "sr_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], SectionAAssociatedEstablishment.prototype, "name_of_establishment", void 0);
exports.SectionAAssociatedEstablishment = SectionAAssociatedEstablishment = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_a_associated_establishments' })
], SectionAAssociatedEstablishment);
let SectionCProduct = class SectionCProduct {
};
exports.SectionCProduct = SectionCProduct;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], SectionCProduct.prototype, "product_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], SectionCProduct.prototype, "survey_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], SectionCProduct.prototype, "product_category", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SectionCProduct.prototype, "sr_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], SectionCProduct.prototype, "product_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], SectionCProduct.prototype, "unit_of_measurement", void 0);
exports.SectionCProduct = SectionCProduct = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_c_products' })
], SectionCProduct);
let SectionERawMaterial = class SectionERawMaterial {
};
exports.SectionERawMaterial = SectionERawMaterial;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], SectionERawMaterial.prototype, "raw_material_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], SectionERawMaterial.prototype, "survey_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SectionERawMaterial.prototype, "sr_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], SectionERawMaterial.prototype, "input_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], SectionERawMaterial.prototype, "unit_of_measurement", void 0);
exports.SectionERawMaterial = SectionERawMaterial = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_e_raw_materials' })
], SectionERawMaterial);
let SectionFProductSale = class SectionFProductSale {
};
exports.SectionFProductSale = SectionFProductSale;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], SectionFProductSale.prototype, "sale_product_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], SectionFProductSale.prototype, "survey_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SectionFProductSale.prototype, "sr_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], SectionFProductSale.prototype, "product_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], SectionFProductSale.prototype, "unit_of_measurement", void 0);
exports.SectionFProductSale = SectionFProductSale = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_f_product_sales' })
], SectionFProductSale);
let SectionGCriticalMachine = class SectionGCriticalMachine {
};
exports.SectionGCriticalMachine = SectionGCriticalMachine;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], SectionGCriticalMachine.prototype, "machine_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], SectionGCriticalMachine.prototype, "survey_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SectionGCriticalMachine.prototype, "sr_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], SectionGCriticalMachine.prototype, "machine_name", void 0);
exports.SectionGCriticalMachine = SectionGCriticalMachine = __decorate([
    (0, typeorm_1.Entity)({ name: 'section_g_critical_machines' })
], SectionGCriticalMachine);
//# sourceMappingURL=section-record.entity.js.map