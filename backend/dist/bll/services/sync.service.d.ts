import { Repository, DataSource } from 'typeorm';
import { SurveyResponse } from '../../dal/entities/survey-response.entity';
import { PhotoService } from './photo.service';
export interface AnswerPayload {
    question_id: number;
    answer_value: any;
}
export interface SyncPayload {
    device_id: string;
    user_id: string;
    responses: Array<{
        response_id: string;
        form_id: number;
        unit_id?: string;
        gps_lat?: number;
        gps_lng?: number;
        gps_accuracy_m?: number;
        started_at: string;
        submitted_at: string;
        answers: AnswerPayload[];
    }>;
}
export interface SyncItemResult {
    response_id: string;
    status: 'synced' | 'duplicate_flagged' | 'already_synced' | 'failed';
    is_duplicate: boolean;
    message: string;
}
export declare class SyncService {
    private readonly responseRepo;
    private readonly dataSource;
    private readonly photoService;
    constructor(responseRepo: Repository<SurveyResponse>, dataSource: DataSource, photoService: PhotoService);
    syncBatch(payload: SyncPayload): Promise<{
        sync_id: number;
        status: string;
        results: SyncItemResult[];
    }>;
}
