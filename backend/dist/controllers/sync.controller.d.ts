import { Response } from 'express';
import { SyncService } from '../bll/services/sync.service';
import { PhotoService } from '../bll/services/photo.service';
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
        answers: Array<{
            question_id: number;
            answer_value: any;
        }>;
    }>;
}
export declare class SyncController {
    private readonly syncService;
    private readonly photoService;
    constructor(syncService: SyncService, photoService: PhotoService);
    uploadPhoto(file: {
        buffer: Buffer;
        mimetype: string;
        size: number;
    } | undefined, body: {
        photo_id: string;
        response_id: string;
        photo_type: string;
        latitude: string;
        longitude: string;
        accuracy_m: string;
        captured_at: string;
    }, user: any): Promise<{
        photo_id: string;
        status: "uploaded" | "already_uploaded";
    }>;
    syncBatch(body: SyncBody, user: any): Promise<{
        sync_id: number;
        status: string;
        results: import("../bll/services/sync.service").SyncItemResult[];
    }>;
}
export declare class AttachmentController {
    private readonly photoService;
    constructor(photoService: PhotoService);
    listUnitAttachments(unitId: string, user: any): Promise<any>;
    getAttachment(id: string, user: any, response: Response): Promise<void>;
}
export {};
