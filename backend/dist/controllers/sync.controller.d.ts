import { SyncService } from '../bll/services/sync.service';
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
        answers: Array<{
            question_id: number;
            answer_value: any;
        }>;
    }>;
}
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    syncBatch(body: SyncBody, user: any): Promise<{
        sync_id: number;
        status: string;
        results: import("../bll/services/sync.service").SyncItemResult[];
    }>;
}
export {};
