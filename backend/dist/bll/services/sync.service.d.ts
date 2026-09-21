import { EntityManager } from 'typeorm';
type SectionPayload = Record<string, Record<string, unknown> | Array<Record<string, unknown>>>;
interface SyncResponse {
    survey_id?: string;
    response_id?: string;
    form_id?: number;
    interview_date?: string;
    enumerator_name?: string;
    coordinates_lat?: number;
    coordinates_lng?: number;
    gps_accuracy_m?: number;
    device_id?: string;
    sections?: SectionPayload;
    answers?: Array<{
        question_id: number;
        answer_value: unknown;
    }>;
}
export declare class SyncService {
    private readonly entityManager;
    constructor(entityManager: EntityManager);
    syncBatch(payload: {
        device_id: string;
        user_id: string;
        responses: SyncResponse[];
    }): Promise<{
        sync_id: any;
        status: string;
        results: Record<string, unknown>[];
    }>;
    private saveSubmission;
    private insertSection;
    private legacyAnswersToSections;
    private asRecord;
    private isEmpty;
    private readableDatabaseError;
}
export {};
