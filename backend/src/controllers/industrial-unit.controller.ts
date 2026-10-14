import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  IndustrialUnitService,
  ApproveRejectDto,
} from '../bll/services/industrial-unit.service';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('industrial-units')
@UseGuards(RbacGuard)
export class IndustrialUnitController {
  constructor(private readonly unitService: IndustrialUnitService) {}

  /**
   * GET /industrial-units
   * All authenticated users can list units (supervisor dashboard,
   * surveyor status check).
   */
  @Get()
  async findAll() {
    return this.unitService.findAll();
  }

  /**
   * GET /industrial-units/:id
   * Returns a single industrial unit by UUID.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.unitService.findOne(id);
  }

  /**
   * POST /industrial-units/:id/approve
   * Supervisor approves a unit — sets is_verified=true, status=Active,
   * writes unit_approval_log, and optionally marks the response as synced.
   */
  @Post(':id/approve')
  @RequirePermissions('SURVEY_CONFIRM')
  async approve(
    @Param('id') id: string,
    @Body() body: ApproveRejectDto,
    @CurrentUser() user: any,
  ) {
    return this.unitService.approveUnit(id, user.user_id, body);
  }

  /**
   * POST /industrial-units/:id/reject
   * Supervisor rejects a unit — writes unit_approval_log and marks
   * the associated response as rejected.
   */
  @Post(':id/reject')
  @RequirePermissions('SURVEY_CONFIRM')
  async reject(
    @Param('id') id: string,
    @Body() body: ApproveRejectDto,
    @CurrentUser() user: any,
  ) {
    return this.unitService.rejectUnit(id, user.user_id, body);
  }
}
