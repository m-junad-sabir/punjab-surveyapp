import { SurveySection } from './survey-section.entity';
export declare class SurveyQuestion {
    id: number;
    section_id: number;
    question_code: string;
    question_no: string;
    question_text: string;
    answer_type: string;
    lookup_type_id: number;
    is_required: boolean;
    stored_in: string;
    section: SurveySection;
}
