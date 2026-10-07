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
const survey_form_entity_1 = require("./dal/entities/survey-form.entity");
const survey_section_entity_1 = require("./dal/entities/survey-section.entity");
const survey_question_entity_1 = require("./dal/entities/survey-question.entity");
const survey_response_entity_1 = require("./dal/entities/survey-response.entity");
const response_choice_entity_1 = require("./dal/entities/response-choice.entity");
const industrial_unit_entity_1 = require("./dal/entities/industrial-unit.entity");
const duplicate_flag_entity_1 = require("./dal/entities/duplicate-flag.entity");
const lookup_value_entity_1 = require("./dal/entities/lookup-value.entity");
const auth_service_1 = require("./bll/services/auth.service");
const survey_form_service_1 = require("./bll/services/survey-form.service");
const sync_service_1 = require("./bll/services/sync.service");
const industrial_unit_service_1 = require("./bll/services/industrial-unit.service");
const auth_controller_1 = require("./controllers/auth.controller");
const survey_form_controller_1 = require("./controllers/survey-form.controller");
const sync_controller_1 = require("./controllers/sync.controller");
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
                survey_form_entity_1.SurveyForm,
                survey_section_entity_1.SurveySection,
                survey_question_entity_1.SurveyQuestion,
                survey_response_entity_1.SurveyResponse,
                response_choice_entity_1.ResponseChoice,
                industrial_unit_entity_1.IndustrialUnit,
                duplicate_flag_entity_1.DuplicateFlag,
                lookup_value_entity_1.LookupValue,
            ]),
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || 'punjab-industries-survey-secret-key-2026',
                signOptions: { expiresIn: '1d' },
            }),
        ],
        controllers: [
            auth_controller_1.AuthController,
            survey_form_controller_1.SurveyFormController,
            sync_controller_1.SyncController,
            industrial_unit_controller_1.IndustrialUnitController,
        ],
        providers: [
            auth_service_1.AuthService,
            survey_form_service_1.SurveyFormService,
            sync_service_1.SyncService,
            industrial_unit_service_1.IndustrialUnitService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map