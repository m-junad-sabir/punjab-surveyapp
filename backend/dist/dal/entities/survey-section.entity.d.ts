import { SurveyForm } from './survey-form.entity';
import { SurveyQuestion } from './survey-question.entity';
export declare class SurveySection {
    section_id: number;
    form_id: number;
    form: SurveyForm;
    title: string;
    sort_order: number;
    questions: SurveyQuestion[];
}
