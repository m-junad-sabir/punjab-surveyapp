import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { PhotoStorageService } from './photo-storage.service';

const PHOTO_TYPES = new Set([
  'L_PHOTO_INTERVIEW_SESSION',
  'L_PHOTO_ENTRANCE_SIGNBOARD',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

interface PhotoUploadMetadata {
  photo_id: string;
  response_id: string;
  photo_type: string;
  latitude: string;
  longitude: string;
  accuracy_m: string;
  captured_at: string;
}

interface UploadedPhoto {
  photo_id: string;
  response_id: string;
  uploaded_by: string;
  photo_type: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  latitude: number | string;
  longitude: number | string;
  accuracy_m: number | string;
  captured_at: Date | string;
}

@Injectable()
export class PhotoService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: PhotoStorageService,
  ) {}

  async uploadPhoto(
    metadata: PhotoUploadMetadata,
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    ownerId: string,
  ): Promise<{ photo_id: string; status: 'uploaded' | 'already_uploaded' }> {
    if (!file?.buffer?.length || file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('A JPEG image no larger than 3 MB is required.');
    }
    if (file.mimetype !== 'image/jpeg' || file.buffer[0] !== 0xff || file.buffer[1] !== 0xd8 || file.buffer[2] !== 0xff) {
      throw new BadRequestException('Only captured JPEG images are accepted.');
    }
    if (!UUID_PATTERN.test(metadata.photo_id) || !UUID_PATTERN.test(metadata.response_id)) {
      throw new BadRequestException('Photo and response IDs must be valid UUIDs.');
    }
    if (!PHOTO_TYPES.has(metadata.photo_type)) {
      throw new BadRequestException('Unknown photo evidence type.');
    }

    const latitude = Number(metadata.latitude);
    const longitude = Number(metadata.longitude);
    const accuracy = Number(metadata.accuracy_m);
    const capturedAt = new Date(metadata.captured_at);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 ||
        Number.isNaN(capturedAt.getTime())) {
      throw new BadRequestException('Valid capture coordinates, accuracy, and timestamp are required.');
    }

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const priorById: UploadedPhoto[] = await this.dataSource.query(
      'SELECT * FROM survey_photo_uploads WHERE photo_id = $1',
      [metadata.photo_id],
    );
    if (priorById[0]) {
      const prior = priorById[0];
      if (prior.uploaded_by !== ownerId || prior.response_id !== metadata.response_id ||
          prior.photo_type !== metadata.photo_type || prior.sha256.trim() !== sha256) {
        throw new ConflictException('This photo ID is already bound to different upload data.');
      }
      await this.storage.save(prior.storage_key, file.buffer, 'image/jpeg');
      return { photo_id: metadata.photo_id, status: 'already_uploaded' };
    }

    const priorByType: UploadedPhoto[] = await this.dataSource.query(
      `SELECT * FROM survey_photo_uploads
        WHERE response_id = $1 AND photo_type = $2`,
      [metadata.response_id, metadata.photo_type],
    );
    if (priorByType[0]) {
      if (priorByType[0].uploaded_by !== ownerId) {
        throw new ConflictException('This response photo is owned by another account.');
      }
      await this.dataSource.query('DELETE FROM survey_photo_uploads WHERE photo_id = $1', [priorByType[0].photo_id]);
      await this.storage.remove(priorByType[0].storage_key);
    }

    const storageKey = `${ownerId}/${metadata.response_id}/${metadata.photo_type}/${metadata.photo_id}.jpg`;
    await this.dataSource.query(
      `INSERT INTO survey_photo_uploads
         (photo_id, response_id, uploaded_by, photo_type, storage_key, mime_type, size_bytes,
          sha256, latitude, longitude, accuracy_m, captured_at)
       VALUES ($1, $2, $3, $4, $5, 'image/jpeg', $6, $7, $8, $9, $10, $11)`,
      [metadata.photo_id, metadata.response_id, ownerId, metadata.photo_type, storageKey,
        file.size, sha256, latitude, longitude, accuracy, capturedAt],
    );
    await this.storage.save(storageKey, file.buffer, 'image/jpeg');
    return { photo_id: metadata.photo_id, status: 'uploaded' };
  }

  async attachRequiredPhotos(
    manager: EntityManager,
    formId: number,
    responseId: string,
    ownerId: string,
    answers: Map<string, unknown>,
  ): Promise<void> {
    const requiredQuestions: Array<{ question_code: string }> = await manager.query(
      `SELECT q.question_code
         FROM survey_questions q
         JOIN survey_sections s ON s.id = q.section_id
        WHERE s.form_id = $1 AND q.answer_type = 'PHOTO' AND q.is_required = true`,
      [formId],
    );

    for (const question of requiredQuestions) {
      const answer = answers.get(question.question_code) as Record<string, unknown> | undefined;
      const photoId = typeof answer?.photo_id === 'string' ? answer.photo_id : '';
      if (!UUID_PATTERN.test(photoId)) {
        throw new BadRequestException(`Required photo ${question.question_code} is missing.`);
      }

      const uploads: UploadedPhoto[] = await manager.query(
        `SELECT * FROM survey_photo_uploads
          WHERE photo_id = $1 AND response_id = $2 AND uploaded_by = $3 AND photo_type = $4`,
        [photoId, responseId, ownerId, question.question_code],
      );
      const photo = uploads[0];
      if (!photo) throw new BadRequestException(`Photo ${question.question_code} has not been uploaded by this account.`);

      await manager.query(
        `INSERT INTO survey_attachments
           (response_id, section_code, file_type, file_name, storage_path, captured_at,
            photo_type, mime_type, size_bytes, sha256, latitude, longitude, accuracy_m, uploaded_by)
         VALUES ($1, 'L', 'IMAGE', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [responseId, `${question.question_code}.jpg`, photo.storage_key, photo.captured_at,
          photo.photo_type, photo.mime_type, photo.size_bytes, photo.sha256.trim(),
          photo.latitude, photo.longitude, photo.accuracy_m, ownerId],
      );
      await manager.query('DELETE FROM survey_photo_uploads WHERE photo_id = $1', [photoId]);
    }
  }

  async getAttachment(photoId: string, ownerId: string, canReviewAll: boolean) {
    const rows: Array<{ storage_path: string; surveyor_id: string; photo_type: string }> = await this.dataSource.query(
      `SELECT a.storage_path, a.photo_type, r.surveyor_id
         FROM survey_attachments a
         JOIN survey_responses r ON r.id = a.response_id
        WHERE a.id = $1`,
      [photoId],
    );
    const attachment = rows[0];
    if (!attachment || (!canReviewAll && attachment.surveyor_id !== ownerId)) {
      throw new NotFoundException('Photo attachment not found.');
    }
    return this.storage.read(attachment.storage_path);
  }

  async listUnitAttachments(unitId: string, ownerId: string, canReviewAll: boolean) {
    return this.dataSource.query(
      `SELECT a.id, a.photo_type, a.captured_at, a.latitude, a.longitude, a.accuracy_m
         FROM survey_attachments a
         JOIN survey_responses r ON r.id = a.response_id
        WHERE r.unit_id = $1
          AND ($3::boolean = true OR r.surveyor_id = $2)
        ORDER BY a.created_at, a.id`,
      [unitId, ownerId, canReviewAll],
    );
  }
}