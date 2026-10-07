export type SurveyInputType = 'TEXT' | 'NUMBER' | 'YES_NO' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'SHARE_PERCENT' | 'GPS' | 'MONTHS';
export interface SurveyInputField {
    key: string;
    label: string;
    type: SurveyInputType;
    lookup_type?: string;
    reference?: string;
    required?: boolean;
    options?: Array<{
        id: number;
        code: string;
        label: string;
        requires_text: boolean;
        parent_id?: number;
    }>;
}
export interface SurveyQuestionInput {
    fields: SurveyInputField[];
    repeatable?: boolean;
}
export declare const QUESTION_INPUTS: Record<string, SurveyQuestionInput>;
export declare const SURVEY_REFERENCES: {
    readonly measurement_units: "SELECT id, code, name AS label FROM measurement_units ORDER BY name";
    readonly product_kinds: "SELECT 1 AS id, 'MAIN' AS code, 'Main product' AS label, false AS requires_text UNION ALL SELECT 2, 'SECONDARY', 'Secondary product', false";
    readonly capacity_periods: "SELECT 1 AS id, 'PER_DAY' AS code, 'Per day' AS label, false AS requires_text UNION ALL SELECT 2, 'PER_MONTH', 'Per month', false";
    readonly genders: "SELECT 1 AS id, 'MALE' AS code, 'Male' AS label, false AS requires_text UNION ALL SELECT 2, 'FEMALE', 'Female', false";
};
