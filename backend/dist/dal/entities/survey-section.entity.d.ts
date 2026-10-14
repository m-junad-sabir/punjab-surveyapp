import { SurveyForm } from './survey-form.entity';
import { SurveyQuestion } from './survey-question.entity';
export declare class SurveySection {
    id: number;
    form_id: number;
    section_code: string;
    title: string;
    sort_order: number;
    form: SurveyForm;
    questions: SurveyQuestion[];
}
