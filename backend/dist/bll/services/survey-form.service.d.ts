export declare class SurveyFormService {
    getActiveForm(): {
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
    };
}
