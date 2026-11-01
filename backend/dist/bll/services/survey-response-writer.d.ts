import { EntityManager } from 'typeorm';
export interface SubmittedQuestion {
    id: number;
    question_code: string;
    answer_type: string;
    lookup_type_id: number | null;
}
export type SurveyAnswers = Map<string, unknown>;
export declare function clearHiddenSurveyAnswers(manager: EntityManager, answers: SurveyAnswers): Promise<boolean>;
export declare function validateSectionAAnswers(manager: EntityManager, answers: SurveyAnswers): Promise<void>;
export declare function validateSectionBAnswers(manager: EntityManager, answers: SurveyAnswers): Promise<void>;
export declare function normalizeSectionCAnswers(manager: EntityManager, answers: SurveyAnswers): Promise<void>;
export declare function updateExistingUnitCapitalInvestment(manager: EntityManager, unitId: string, answers: SurveyAnswers): Promise<void>;
export declare function createIndustrialUnit(manager: EntityManager, userId: string, answers: SurveyAnswers, unitName: string, gps: {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
}, legacyLocationFallback: boolean): Promise<string>;
export declare function saveNormalizedSurveyAnswers(manager: EntityManager, responseId: string, answers: SurveyAnswers, questions: SubmittedQuestion[], isPermanentlyClosed?: boolean): Promise<void>;
