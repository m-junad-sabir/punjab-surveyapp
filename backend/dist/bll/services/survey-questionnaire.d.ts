export type SurveyInputType = 'TEXT' | 'PHONE' | 'EMAIL' | 'NUMBER' | 'YES_NO' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'SHARE_PERCENT' | 'GPS' | 'MONTHS';
export interface SurveyInputField {
    key: string;
    label: string;
    type: SurveyInputType;
    lookup_type?: string;
    reference?: string;
    required?: boolean;
    min?: number;
    max?: number;
    step?: number;
    default_value?: number;
    options?: Array<{
        id: number;
        code: string;
        label: string;
        requires_text: boolean;
        parent_id?: number | null;
        product_kind?: 'MAIN' | 'SECONDARY' | null;
        is_selectable?: boolean;
    }>;
}
export interface SurveyQuestionInput {
    fields: SurveyInputField[];
    repeatable?: boolean;
}
export declare const SECTION_B_WORKING_RANGES: {
    readonly working_days_per_week: {
        readonly min: 1;
        readonly max: 7;
        readonly step: 1;
    };
    readonly working_months_per_year: {
        readonly min: 1;
        readonly max: 12;
        readonly step: 1;
    };
};
export declare const SECTION_B_DEFAULT_WORKING_DAYS = 6;
export declare const SECTION_D_MAX_COUNT = 2147483647;
export declare const QUESTION_INPUTS: Record<string, SurveyQuestionInput>;
export declare const SURVEY_REFERENCES: {
    readonly districts: "SELECT d.id, d.code, d.name AS label, false AS requires_text\n                FROM districts d\n                JOIN divisions dv ON dv.id = d.division_id\n                JOIN provinces p ON p.id = dv.province_id\n               WHERE lower(p.name) = 'punjab'\n               ORDER BY d.name";
    readonly tehsils: "SELECT t.id, t.code, t.name AS label, false AS requires_text,\n                   t.district_id AS parent_id\n              FROM tehsils t\n              JOIN districts d ON d.id = t.district_id\n              JOIN divisions dv ON dv.id = d.division_id\n              JOIN provinces p ON p.id = dv.province_id\n             WHERE lower(p.name) = 'punjab'\n             ORDER BY t.name";
    readonly measurement_units: "SELECT m.id, m.code, m.name AS label\n                         FROM measurement_units m\n                        WHERE (m.unit_kind <> 'AREA'\n                           OR m.code IN ('SQM', 'SQFT', 'SQYD', 'HECTARE', 'ACRE'))\n                          AND NOT EXISTS (\n                            SELECT 1 FROM product_measurement_units p\n                             WHERE p.unit_id = m.id AND p.product_only\n                          )\n                        ORDER BY m.name";
    readonly product_units: "SELECT m.id, m.code, COALESCE(p.display_label, m.name) AS label,\n                         false AS requires_text, COALESCE(p.is_active, false) AS is_selectable\n                    FROM measurement_units m\n                    LEFT JOIN product_measurement_units p ON p.unit_id = m.id\n                   ORDER BY p.sort_order NULLS LAST, m.name, m.id";
    readonly industry_products: "SELECT id, code, label, requires_text, parent_id, product_kind, is_selectable\n                        FROM (\n                          SELECT p.id, p.id::text AS code, p.product_name AS label,\n                                 false AS requires_text, p.unit_type_id AS parent_id,\n                                 p.product_kind, p.is_active AS is_selectable, p.sort_order\n                            FROM industry_product_options p\n                          UNION ALL\n                          SELECT 0, 'OTHER', 'Other (specify)', true, NULL::integer,\n                                 NULL::varchar, true, 0::smallint\n                        ) options\n                       ORDER BY parent_id NULLS FIRST, product_kind, sort_order, id";
    readonly industry_machines: "SELECT id, code, label, requires_text, parent_id, is_selectable\n                        FROM (\n                          SELECT id, id::text AS code, machine_name AS label,\n                                 false AS requires_text, unit_type_id AS parent_id,\n                                 is_active AS is_selectable, sort_order\n                            FROM industry_machine_options\n                          UNION ALL\n                          SELECT 0, 'OTHER', 'Other (specify)', true, NULL::integer, true, 0::smallint\n                        ) options\n                       ORDER BY parent_id NULLS FIRST, sort_order, id";
    readonly machine_specifications: "SELECT id, code, label, requires_text, parent_id, is_selectable\n                             FROM (\n                               SELECT id, id::text AS code, specification AS label,\n                                      false AS requires_text, id AS parent_id,\n                                      is_active AS is_selectable, sort_order\n                                 FROM industry_machine_options\n                               UNION ALL\n                               SELECT 0, 'OTHER', 'Other (specify)', true, NULL::integer, true, 0::smallint\n                             ) options\n                            ORDER BY parent_id NULLS FIRST, sort_order, id";
    readonly g_vessel_kinds: "SELECT 1 AS id, 'BOILER' AS code, 'Boiler' AS label, false AS requires_text\n                   UNION ALL\n                   SELECT 2, 'VESSEL', 'Pressure vessel', false";
    readonly area_units: "SELECT m.id, m.code, m.name AS label, false AS requires_text\n                 FROM measurement_units m\n                WHERE m.unit_kind = 'AREA'\n                  AND NOT EXISTS (\n                    SELECT 1 FROM product_measurement_units p\n                     WHERE p.unit_id = m.id AND p.product_only\n                  )\n                ORDER BY m.name";
    readonly product_kinds: "SELECT 1 AS id, 'MAIN' AS code, 'Main product' AS label, false AS requires_text UNION ALL SELECT 2, 'SECONDARY', 'Secondary product', false";
    readonly capacity_periods: "SELECT 1 AS id, 'PER_DAY' AS code, 'Per day' AS label, false AS requires_text UNION ALL SELECT 2, 'PER_MONTH', 'Per month', false";
    readonly energy_source_units: "SELECT mapping.unit_id AS id, m.code, m.name AS label,\n                              false AS requires_text, mapping.energy_source_id AS parent_id\n                         FROM energy_source_units mapping\n                         JOIN measurement_units m ON m.id = mapping.unit_id\n                         JOIN lookup_values source ON source.id = mapping.energy_source_id\n                         JOIN lookup_types source_type ON source_type.id = source.type_id\n                        WHERE source_type.code = 'ENERGY_SOURCE'\n                          AND source.is_active = true\n                        ORDER BY source.sort_order, m.name";
    readonly genders: "SELECT 1 AS id, 'MALE' AS code, 'Male' AS label, false AS requires_text UNION ALL SELECT 2, 'FEMALE', 'Female', false UNION ALL SELECT 3, 'Other', 'Other', false";
    readonly psic_divisions: "SELECT id, code, name AS label, false AS requires_text\n                     FROM psic_divisions\n                    ORDER BY code";
    readonly psic_groups: "SELECT id, code, name AS label, false AS requires_text,\n                       division_id AS parent_id\n                  FROM psic_groups\n                 ORDER BY code";
    readonly psic_classes: "SELECT id, code, name AS label, false AS requires_text,\n                        group_id AS parent_id\n                   FROM psic_classes\n                  ORDER BY code";
    readonly associated_psic_classes: "SELECT id, code, name AS label, false AS requires_text\n                             FROM psic_classes\n                            ORDER BY code";
    readonly hs_codes: "SELECT id, code, description AS label, false AS requires_text\n               FROM hs_codes\n              ORDER BY code";
};
