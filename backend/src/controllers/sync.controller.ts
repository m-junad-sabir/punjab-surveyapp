import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SyncService } from '../bll/services/sync.service';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermissions('SURVEY_SUBMIT')
  async syncBatch(@Body() body: any, @CurrentUser() user: any) {
    const payload = {
      device_id: body.device_id || 'unknown_device',
      user_id: user.user_id,
      responses: body.responses || [],
    };
    return this.syncService.syncBatch(payload);
  }
}
