import { SyncService } from '../bll/services/sync.service';
export declare class SyncController {
    private syncService;
    constructor(syncService: SyncService);
    syncBatch(body: any, user: any): Promise<{
        sync_id: any;
        status: string;
        results: Record<string, unknown>[];
    }>;
}
