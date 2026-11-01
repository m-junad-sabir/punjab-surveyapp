export type SurveyInputType = 'TEXT' | 'PHONE' | 'EMAIL' | 'NUMBER' | 'YES_NO' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'SHARE_PERCENT' | 'GPS' | 'MONTHS';
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
    readonly districts: "SELECT d.id, d.code, d.name AS label, false AS requires_text\n                FROM districts d\n                JOIN divisions dv ON dv.id = d.division_id\n                JOIN provinces p ON p.id = dv.province_id\n               WHERE lower(p.name) = 'punjab'\n               ORDER BY d.name";
    readonly tehsils: "SELECT t.id, t.code, t.name AS label, false AS requires_text,\n                   t.district_id AS parent_id\n              FROM tehsils t\n              JOIN districts d ON d.id = t.district_id\n              JOIN divisions dv ON dv.id = d.division_id\n              JOIN provinces p ON p.id = dv.province_id\n             WHERE lower(p.name) = 'punjab'\n             ORDER BY t.name";
    readonly measurement_units: "SELECT id, code, name AS label\n                         FROM measurement_units\n                        WHERE unit_kind <> 'AREA'\n                           OR code IN ('SQM', 'SQFT', 'SQYD', 'HECTARE', 'ACRE')\n                        ORDER BY name";
    readonly area_units: "SELECT id, code, name AS label, false AS requires_text\n                 FROM measurement_units\n                WHERE unit_kind = 'AREA'\n                ORDER BY name";
    readonly product_kinds: "SELECT 1 AS id, 'MAIN' AS code, 'Main product' AS label, false AS requires_text UNION ALL SELECT 2, 'SECONDARY', 'Secondary product', false";
    readonly capacity_periods: "SELECT 1 AS id, 'PER_DAY' AS code, 'Per day' AS label, false AS requires_text UNION ALL SELECT 2, 'PER_MONTH', 'Per month', false";
    readonly genders: "SELECT 1 AS id, 'MALE' AS code, 'Male' AS label, false AS requires_text UNION ALL SELECT 2, 'FEMALE', 'Female', false UNION ALL SELECT 3, 'Other', 'Other', false";
    readonly psic_divisions: "SELECT id, code, name AS label, false AS requires_text\n                     FROM psic_divisions\n                    ORDER BY code";
    readonly psic_groups: "SELECT id, code, name AS label, false AS requires_text,\n                       division_id AS parent_id\n                  FROM psic_groups\n                 ORDER BY code";
    readonly psic_classes: "SELECT id, code, name AS label, false AS requires_text,\n                        group_id AS parent_id\n                   FROM psic_classes\n                  ORDER BY code";
    readonly associated_psic_classes: "SELECT id, code, name AS label, false AS requires_text\n                             FROM psic_classes\n                            ORDER BY code";
    readonly hs_codes: "SELECT id, code, description AS label, false AS requires_text\n               FROM hs_codes\n              ORDER BY code";
};
