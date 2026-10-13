import { SurveySection } from './survey-section.entity';
export declare class SurveyForm {
    form_id: number;
    title: string;
    version: string;
    description: string;
    is_active: boolean;
    created_at: Date;
    sections: SurveySection[];
}
