import { SurveyFormService } from '../bll/services/survey-form.service';
export declare class SurveyFormController {
    private formService;
    constructor(formService: SurveyFormService);
    getActiveForm(): Promise<{
        form_id: number;
        title: string;
        version: string;
        description: string;
        sections: {
            section_id: number;
            title: string;
            sort_order: number;
            questions: any[];
        }[];
        logic: any[];
    }>;
}
