import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { getDatabaseConfig } from './database/database.config';

// Entities
import { User } from './dal/entities/user.entity';
import { Role } from './dal/entities/role.entity';
import { IndustrialUnit } from './dal/entities/industrial-unit.entity';
import { SurveyForm } from './dal/entities/survey-form.entity';
import { SurveySection } from './dal/entities/survey-section.entity';
import { SurveyQuestion } from './dal/entities/survey-question.entity';
import { SurveyQuestionLogic } from './dal/entities/survey-question-logic.entity';
import { SurveyResponse } from './dal/entities/survey-response.entity';
import { SurveyAnswer } from './dal/entities/survey-answer.entity';
import { DuplicateFlag } from './dal/entities/duplicate-flag.entity';

// Services (BLL)
import { AuthService } from './bll/services/auth.service';
import { SyncService } from './bll/services/sync.service';
import { SurveyFormService } from './bll/services/survey-form.service';
import { IndustrialUnitService } from './bll/services/industrial-unit.service';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { SyncController } from './controllers/sync.controller';
import { SurveyFormController } from './controllers/survey-form.controller';
import { IndustrialUnitController } from './controllers/industrial-unit.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([
      User,
      Role,
      IndustrialUnit,
      SurveyForm,
      SurveySection,
      SurveyQuestion,
      SurveyQuestionLogic,
      SurveyResponse,
      SurveyAnswer,
      DuplicateFlag,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'punjab-industries-survey-secret-key-2026',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    AuthController,
    SyncController,
    SurveyFormController,
    IndustrialUnitController,
  ],
  providers: [
    AuthService,
    SyncService,
    SurveyFormService,
    IndustrialUnitService,
  ],
  exports: [AuthService, SyncService, SurveyFormService, IndustrialUnitService],
})
export class AppModule {}
