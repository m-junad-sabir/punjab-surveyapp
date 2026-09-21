import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { getDatabaseConfig } from './database/database.config';

// Entities
import { User } from './dal/entities/user.entity';
import { Role } from './dal/entities/role.entity';
import { SurveySubmission } from './dal/entities/survey-submission.entity';
import {
  District,
  Tehsil,
  Sector,
  IndustrialEstate,
} from './dal/entities/reference.entity';
import {
  SectionAEstablishmentIdentity,
  SectionAAssociatedEstablishment,
  SectionBOperationalDetails,
  SectionCCoreSecondaryActivities,
  SectionCProduct,
  SectionDWorkforce,
  SectionEBackwardLinkages,
  SectionERawMaterial,
  SectionFForwardLinkages,
  SectionFProductSale,
  SectionGTechnologyProduction,
  SectionGCriticalMachine,
  SectionHEnergyWaste,
  SectionICertificationsCompliances,
  SectionJStrategicBusinessPlan,
  SectionKCollaborationsBarriers,
} from './dal/entities/section-record.entity';
import { SyncLog } from './dal/entities/sync-log.entity';

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
      SurveySubmission,
      District,
      Tehsil,
      Sector,
      IndustrialEstate,
      SectionAEstablishmentIdentity,
      SectionAAssociatedEstablishment,
      SectionBOperationalDetails,
      SectionCCoreSecondaryActivities,
      SectionCProduct,
      SectionDWorkforce,
      SectionEBackwardLinkages,
      SectionERawMaterial,
      SectionFForwardLinkages,
      SectionFProductSale,
      SectionGTechnologyProduction,
      SectionGCriticalMachine,
      SectionHEnergyWaste,
      SectionICertificationsCompliances,
      SectionJStrategicBusinessPlan,
      SectionKCollaborationsBarriers,
      SyncLog,
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
