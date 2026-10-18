import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SyncService, SyncPayload } from '../bll/services/sync.service';
import { PhotoService } from '../bll/services/photo.service';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

interface SyncBody {
  device_id: string;
  responses: Array<{
    response_id: string;
    surveyor_id: string;
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
  constructor(
    private readonly syncService: SyncService,
    private readonly photoService: PhotoService,
  ) {}

  @Post('photos')
  @UseGuards(RbacGuard)
  @RequirePermissions('SURVEY_SUBMIT')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 3 * 1024 * 1024 } }))
  async uploadPhoto(
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    @Body() body: {
      photo_id: string;
      response_id: string;
      photo_type: string;
      latitude: string;
      longitude: string;
      accuracy_m: string;
      captured_at: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.photoService.uploadPhoto(body, file, user.user_id);
  }

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
    if (body.responses.some((response) => response.surveyor_id !== user.user_id)) {
      throw new ForbiddenException('A survey response can only be synced by its owning account.');
    }

    const payload: SyncPayload = {
      device_id: body.device_id || 'unknown',
      user_id:   user.user_id,
      responses: body.responses,
    };

    return this.syncService.syncBatch(payload);
  }
}

@Controller('attachments')
export class AttachmentController {
  constructor(private readonly photoService: PhotoService) {}

  @Get('unit/:unitId')
  @UseGuards(RbacGuard)
  async listUnitAttachments(
    @Param('unitId') unitId: string,
    @CurrentUser() user: any,
  ) {
    return this.photoService.listUnitAttachments(
      unitId,
      user.user_id,
      user.permissions?.includes('SURVEY_CONFIRM') ?? false,
    );
  }

  @Get(':id')
  @UseGuards(RbacGuard)
  async getAttachment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() response: Response,
  ) {
    const image = await this.photoService.getAttachment(
      id,
      user.user_id,
      user.permissions?.includes('SURVEY_CONFIRM') ?? false,
    );
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(image.data);
  }
}
