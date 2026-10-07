import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

// ─── Database config ──────────────────────────────────────────────────────────
import { getDatabaseConfig } from './database/database.config';

// ─── Entities ─────────────────────────────────────────────────────────────────
import { User }            from './dal/entities/user.entity';
import { Role }            from './dal/entities/role.entity';
import { SurveyForm }      from './dal/entities/survey-form.entity';
import { SurveySection }   from './dal/entities/survey-section.entity';
import { SurveyQuestion }  from './dal/entities/survey-question.entity';
import { SurveyResponse }  from './dal/entities/survey-response.entity';
import { ResponseChoice }  from './dal/entities/response-choice.entity';
import { IndustrialUnit }  from './dal/entities/industrial-unit.entity';
import { DuplicateFlag }   from './dal/entities/duplicate-flag.entity';
import { LookupValue }     from './dal/entities/lookup-value.entity';

// ─── Services ─────────────────────────────────────────────────────────────────
import { AuthService }           from './bll/services/auth.service';
import { SurveyFormService }     from './bll/services/survey-form.service';
import { SyncService }           from './bll/services/sync.service';
import { IndustrialUnitService } from './bll/services/industrial-unit.service';

// ─── Controllers ──────────────────────────────────────────────────────────────
import { AuthController }           from './controllers/auth.controller';
import { SurveyFormController }     from './controllers/survey-form.controller';
import { SyncController }           from './controllers/sync.controller';
import { IndustrialUnitController } from './controllers/industrial-unit.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),

    TypeOrmModule.forFeature([
      User,
      Role,
      SurveyForm,
      SurveySection,
      SurveyQuestion,
      SurveyResponse,
      ResponseChoice,
      IndustrialUnit,
      DuplicateFlag,
      LookupValue,
    ]),

    JwtModule.register({
      secret:      process.env.JWT_SECRET || 'punjab-industries-survey-secret-key-2026',
      signOptions: { expiresIn: '1d' },
    }),
  ],

  controllers: [
    AuthController,
    SurveyFormController,
    SyncController,
    IndustrialUnitController,
  ],

  providers: [
    AuthService,
    SurveyFormService,
    SyncService,
    IndustrialUnitService,
  ],
})
export class AppModule {}
