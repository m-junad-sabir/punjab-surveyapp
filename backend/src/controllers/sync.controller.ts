import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SyncService, SyncPayload } from '../bll/services/sync.service';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

interface SyncBody {
  device_id: string;
  responses: Array<{
    response_id: string;
    form_id: number;
    gps_lat?: number;
    gps_lng?: number;
    gps_accuracy_m?: number;
    started_at: string;
    submitted_at: string;
    answers: Array<{ question_id: number; answer_value: any }>;
  }>;
}

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * POST /sync
   * Accepts a batch of offline survey responses, processes duplicate
   * detection, creates industrial unit records, and returns per-response
   * status results.
   */
  @Post()
  @UseGuards(RbacGuard)
  @RequirePermissions('SURVEY_SUBMIT')
  async syncBatch(@Body() body: SyncBody, @CurrentUser() user: any) {
    if (!Array.isArray(body?.responses) || body.responses.length === 0) {
      throw new BadRequestException('Request must include a non-empty responses array');
    }

    const payload: SyncPayload = {
      device_id: body.device_id || 'unknown',
      user_id:   user.user_id,
      responses: body.responses,
    };

    return this.syncService.syncBatch(payload);
  }
}
