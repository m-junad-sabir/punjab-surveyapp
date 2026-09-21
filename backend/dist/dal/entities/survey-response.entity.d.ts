import { SurveyAnswer } from './survey-answer.entity';
export declare class SurveyResponse {
    response_id: string;
    form_id: number;
    unit_id: string;
    surveyor_id: string;
    device_id: string;
    gps_lat: number;
    gps_lng: number;
    gps_accuracy_m: number;
    started_at: Date;
    submitted_at: Date;
    sync_status: string;
    is_offline_capture: boolean;
    completeness_score: number;
    is_duplicate: boolean;
    created_at: Date;
    updated_at: Date;
    answers: SurveyAnswer[];
}
