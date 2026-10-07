import { SurveySection } from './survey-section.entity';
export declare class SurveyForm {
    id: number;
    code: string;
    title: string;
    version: number;
    is_active: boolean;
    created_at: Date;
    sections: SurveySection[];
}
