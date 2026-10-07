import { SurveyFormService } from '../bll/services/survey-form.service';
export declare class SurveyFormController {
    private readonly formService;
    constructor(formService: SurveyFormService);
    getActiveForm(): Promise<{
        form_id: number;
        code: string;
        title: string;
        version: number;
        sections: {
            section_id: number;
            section_code: string;
            title: string;
            sort_order: number;
            questions: {
                question_id: number;
                question_code: string;
                question_no: string;
                question_text: string;
                answer_type: string;
                is_required: boolean;
                stored_in: string;
                options: import("../bll/services/survey-form.service").LookupOption[];
                fields: {
                    options: any;
                    key: string;
                    label: string;
                    type: import("../bll/services/survey-questionnaire").SurveyInputType;
                    lookup_type?: string;
                    reference?: string;
                    required?: boolean;
                }[];
                repeatable: boolean;
                matrix_items: {
                    id: number;
                    code: string;
                    label: string;
                    group_label: string;
                    answer_type: "CHOICE" | "RATING_1_5";
                    allows_text: boolean;
                    options: import("../bll/services/survey-form.service").LookupOption[];
                }[];
            }[];
        }[];
        references: any;
    }>;
}
