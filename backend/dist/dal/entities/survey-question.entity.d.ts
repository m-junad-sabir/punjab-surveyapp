import { SurveySection } from './survey-section.entity';
export declare class SurveyQuestion {
    question_id: number;
    section_id: number;
    section: SurveySection;
    question_code: string;
    question_text: string;
    question_type: string;
    is_mandatory: boolean;
    validation_rule: any;
    options: any;
    sort_order: number;
}
