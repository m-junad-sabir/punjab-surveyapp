import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SyncAnswerDto {
  @IsInt()
  @Min(1)
  question_id: number;

  @Allow()
  answer_value: unknown;
}

export class SyncResponseDto {
  @IsUUID()
  response_id: string;

  @IsUUID()
  surveyor_id: string;

  @IsInt()
  @Min(1)
  form_id: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  gps_lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  gps_lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999.99)
  gps_accuracy_m?: number;

  @IsISO8601()
  started_at: string;

  @IsISO8601()
  submitted_at: string;

  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => SyncAnswerDto)
  answers: SyncAnswerDto[];
}

export class SyncBatchDto {
  @IsString()
  @MaxLength(100)
  device_id: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SyncResponseDto)
  responses: SyncResponseDto[];
}

export class SyncPhotoDto {
  @IsUUID()
  photo_id: string;

  @IsUUID()
  response_id: string;

  @IsString()
  @IsIn(['L_PHOTO_INTERVIEW_SESSION', 'L_PHOTO_ENTRANCE_SIGNBOARD'])
  @MaxLength(60)
  photo_type: string;

  @IsString()
  @Matches(/^-?\d+(?:\.\d+)?$/, { message: 'latitude must be a valid number.' })
  latitude: string;

  @IsString()
  @Matches(/^-?\d+(?:\.\d+)?$/, { message: 'longitude must be a valid number.' })
  longitude: string;

  @IsString()
  @Matches(/^(?:\d+(?:\.\d+)?|\.\d+)$/, { message: 'accuracy_m must be a non-negative number.' })
  accuracy_m: string;

  @IsISO8601()
  captured_at: string;
}
