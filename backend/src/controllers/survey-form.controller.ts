import { Controller, Get, UseGuards } from '@nestjs/common';
import { SurveyFormService } from '../bll/services/survey-form.service';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('survey-forms')
export class SurveyFormController {
  constructor(private formService: SurveyFormService) {}

  @Get('active')
  @UseGuards(RbacGuard)
  @RequirePermissions('SURVEY_SUBMIT')
  async getActiveForm() {
    return this.formService.getActiveForm();
  }
}
