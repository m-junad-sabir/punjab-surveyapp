import { Injectable } from '@nestjs/common';

@Injectable()
export class SurveyFormService {
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
}
