import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { IndustrialUnitService } from '../bll/services/industrial-unit.service';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('industrial-units')
export class IndustrialUnitController {
  constructor(private unitService: IndustrialUnitService) {}

  @Get()
  @UseGuards(RbacGuard)
  async findAll() {
    return this.unitService.findAll();
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  async findOne(@Param('id') id: string) {
    return this.unitService.findOne(id);
  }

  @Post(':id/approve')
  @UseGuards(RbacGuard)
  @RequirePermissions('UNIT_APPROVE')
  async approveUnit(
    @Param('id') id: string,
    @Body() body: { response_id?: string; remarks?: string },
    @CurrentUser() user: any,
  ) {
    return this.unitService.approveUnit(id, user.user_id);
  }

  @Post(':id/reject')
  @UseGuards(RbacGuard)
  @RequirePermissions('UNIT_APPROVE')
  async rejectUnit(
    @Param('id') id: string,
    @Body() body: { response_id?: string; remarks?: string },
    @CurrentUser() user: any,
  ) {
    return this.unitService.rejectUnit(id);
  }
}
