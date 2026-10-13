"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurveyFormService = void 0;
const common_1 = require("@nestjs/common");
let SurveyFormService = class SurveyFormService {
    getActiveForm() {
        const titles = [
            'Establishment Identity',
            'Operational Details',
            'Core and Secondary Activities',
            'Workforce',
            'Backward Linkages',
            'Forward Linkages',
            'Technology and Production Processes',
            'Energy and Waste Management',
            'Certifications and Compliances',
            'Strategic Business Plan',
            'Future Collaborations and Barriers',
        ];
        return {
            form_id: 1,
            title: 'Punjab Industrial Unit Survey 2026',
            version: '3.0',
            description: 'Typed 11-section industrial establishment survey',
            sections: titles.map((title, index) => ({
                section_id: index + 1,
                title: `Section ${String.fromCharCode(65 + index)}: ${title}`,
                sort_order: index + 1,
                questions: [],
            })),
            logic: [],
        };
    }
};
exports.SurveyFormService = SurveyFormService;
exports.SurveyFormService = SurveyFormService = __decorate([
    (0, common_1.Injectable)()
], SurveyFormService);
//# sourceMappingURL=survey-form.service.js.map