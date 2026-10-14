import { Controller, Get, UseGuards } from '@nestjs/common';
import { SurveyFormService } from '../bll/services/survey-form.service';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('survey-forms')
export class SurveyFormController {
  constructor(private readonly formService: SurveyFormService) {}

  /**
   * GET /survey-forms/active
   * Returns the full active questionnaire — all sections, questions, and
   * skip-logic rules — ready to be cached offline by the PWA.
   * Requires SURVEY_SUBMIT permission (any surveyor/supervisor/admin).
   */
  @Get('active')
  @UseGuards(RbacGuard)
  @RequirePermissions('SURVEY_SUBMIT')
  async getActiveForm() {
    return this.formService.getActiveForm();
  }
}
