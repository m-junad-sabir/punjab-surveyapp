export declare class SurveyResponse {
    id: string;
    form_id: number;
    unit_id: string;
    surveyor_id: string;
    device_id: string;
    gps_lat: number;
    gps_lng: number;
    gps_accuracy_m: number;
    status: string;
    sync_status: string;
    started_at: Date;
    completed_at: Date;
    submitted_at: Date;
    confirmed_by: string;
    confirmed_at: Date;
    synced_at: Date;
    app_version: string;
}
