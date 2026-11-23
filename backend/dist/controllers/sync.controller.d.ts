import { Response } from 'express';
import { SyncService } from '../bll/services/sync.service';
import { PhotoService } from '../bll/services/photo.service';
import { SyncBatchDto, SyncPhotoDto } from './sync.dto';
export declare class SyncController {
    private readonly syncService;
    private readonly photoService;
    constructor(syncService: SyncService, photoService: PhotoService);
    uploadPhoto(file: {
        buffer: Buffer;
        mimetype: string;
        size: number;
    } | undefined, body: SyncPhotoDto, user: any): Promise<{
        photo_id: string;
        status: "uploaded" | "already_uploaded";
    }>;
    syncBatch(body: SyncBatchDto, user: any): Promise<{
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
