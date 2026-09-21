import { SurveyQuestion } from './survey-question.entity';
export declare class SurveyQuestionLogic {
    logic_id: number;
    question_id: number;
    question: SurveyQuestion;
    condition_question_id: number;
    conditionQuestion: SurveyQuestion;
    condition_operator: string;
    condition_value: string;
    action: string;
}
