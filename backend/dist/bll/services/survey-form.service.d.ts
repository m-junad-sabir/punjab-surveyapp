import { Repository, DataSource } from 'typeorm';
import { SurveyForm } from '../../dal/entities/survey-form.entity';
import { SurveySection } from '../../dal/entities/survey-section.entity';
import { SurveyQuestion } from '../../dal/entities/survey-question.entity';
export interface LookupOption {
    id: number;
    code: string;
    label: string;
    requires_text: boolean;
    parent_id?: number | null;
    product_kind?: 'MAIN' | 'SECONDARY' | null;
    is_selectable?: boolean;
}
export declare class SurveyFormService {
    private readonly formRepo;
    private readonly sectionRepo;
    private readonly questionRepo;
    private readonly dataSource;
    constructor(formRepo: Repository<SurveyForm>, sectionRepo: Repository<SurveySection>, questionRepo: Repository<SurveyQuestion>, dataSource: DataSource);
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
                options: LookupOption[];
                fields: {
                    options: any;
                    key: string;
                    label: string;
                    type: import("./survey-questionnaire").SurveyInputType;
                    lookup_type?: string;
                    reference?: string;
                    required?: boolean;
                    min?: number;
                    max?: number;
                    step?: number;
                    default_value?: number;
                }[];
                repeatable: boolean;
                matrix_items: {
                    id: number;
                    code: string;
                    label: string;
                    group_label: string;
                    answer_type: "CHOICE" | "RATING_1_5";
                    allows_text: boolean;
                    options: LookupOption[];
                }[];
            }[];
        }[];
        references: any;
    }>;
}
