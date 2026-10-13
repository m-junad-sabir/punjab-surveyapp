"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const database_config_1 = require("./database/database.config");
const user_entity_1 = require("./dal/entities/user.entity");
const role_entity_1 = require("./dal/entities/role.entity");
const survey_submission_entity_1 = require("./dal/entities/survey-submission.entity");
const reference_entity_1 = require("./dal/entities/reference.entity");
const section_record_entity_1 = require("./dal/entities/section-record.entity");
const sync_log_entity_1 = require("./dal/entities/sync-log.entity");
const auth_service_1 = require("./bll/services/auth.service");
const sync_service_1 = require("./bll/services/sync.service");
const survey_form_service_1 = require("./bll/services/survey-form.service");
const industrial_unit_service_1 = require("./bll/services/industrial-unit.service");
const auth_controller_1 = require("./controllers/auth.controller");
const sync_controller_1 = require("./controllers/sync.controller");
const survey_form_controller_1 = require("./controllers/survey-form.controller");
const industrial_unit_controller_1 = require("./controllers/industrial-unit.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot((0, database_config_1.getDatabaseConfig)()),
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                role_entity_1.Role,
                survey_submission_entity_1.SurveySubmission,
                reference_entity_1.District,
                reference_entity_1.Tehsil,
                reference_entity_1.Sector,
                reference_entity_1.IndustrialEstate,
                section_record_entity_1.SectionAEstablishmentIdentity,
                section_record_entity_1.SectionAAssociatedEstablishment,
                section_record_entity_1.SectionBOperationalDetails,
                section_record_entity_1.SectionCCoreSecondaryActivities,
                section_record_entity_1.SectionCProduct,
                section_record_entity_1.SectionDWorkforce,
                section_record_entity_1.SectionEBackwardLinkages,
                section_record_entity_1.SectionERawMaterial,
                section_record_entity_1.SectionFForwardLinkages,
                section_record_entity_1.SectionFProductSale,
                section_record_entity_1.SectionGTechnologyProduction,
                section_record_entity_1.SectionGCriticalMachine,
                section_record_entity_1.SectionHEnergyWaste,
                section_record_entity_1.SectionICertificationsCompliances,
                section_record_entity_1.SectionJStrategicBusinessPlan,
                section_record_entity_1.SectionKCollaborationsBarriers,
                sync_log_entity_1.SyncLog,
            ]),
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || 'punjab-industries-survey-secret-key-2026',
                signOptions: { expiresIn: '1d' },
            }),
        ],
        controllers: [
            auth_controller_1.AuthController,
            sync_controller_1.SyncController,
            survey_form_controller_1.SurveyFormController,
            industrial_unit_controller_1.IndustrialUnitController,
        ],
        providers: [
            auth_service_1.AuthService,
            sync_service_1.SyncService,
            survey_form_service_1.SurveyFormService,
            industrial_unit_service_1.IndustrialUnitService,
        ],
        exports: [auth_service_1.AuthService, sync_service_1.SyncService, survey_form_service_1.SurveyFormService, industrial_unit_service_1.IndustrialUnitService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map