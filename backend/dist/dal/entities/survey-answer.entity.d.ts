import { SurveyResponse } from './survey-response.entity';
import { SurveyQuestion } from './survey-question.entity';
export declare class SurveyAnswer {
    answer_id: number;
    response_id: string;
    response: SurveyResponse;
    question_id: number;
    question: SurveyQuestion;
    answer_value: any;
    answered_at: Date;
}
