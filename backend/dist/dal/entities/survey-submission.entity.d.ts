export declare class SurveySubmission {
    survey_id: string;
    unit_code: string;
    survey_ref_no: string;
    interview_date: string;
    enumerator_name: string;
    enumerator_signature: string;
    coordinates_lat: number;
    coordinates_lng: number;
    gps_accuracy_m: number;
    geom: {
        type: 'Point';
        coordinates: [number, number];
    };
    photo_interview_session: string;
    photo_entrance_signboard: string;
    device_id: string;
    sync_status: 'draft' | 'pending_sync' | 'synced' | 'rejected';
    is_verified: boolean;
    verified_by: string;
    verified_at: Date;
    created_at: Date;
    updated_at: Date;
}
