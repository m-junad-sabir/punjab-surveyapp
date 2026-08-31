import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { SurveyForm } from '../../dal/entities/survey-form.entity';

@Injectable()
export class SurveyFormService {
  constructor(
    @InjectRepository(SurveyForm)
    private formRepository: Repository<SurveyForm>,
    private entityManager: EntityManager,
  ) {}

  async getActiveForm() {
    const form = await this.formRepository.findOne({
      where: { is_active: true },
      relations: ['sections', 'sections.questions'],
    });

    if (!form) {
      throw new NotFoundException('No active survey form found');
    }

    // Sort sections and questions in application layer
    form.sections.sort((a, b) => a.sort_order - b.sort_order);
    form.sections.forEach((section) => {
      section.questions.sort((a, b) => a.sort_order - b.sort_order);
    });

    // Fetch skip logic rules associated with the form questions
    const questionIds: number[] = [];
    form.sections.forEach((section) => {
      section.questions.forEach((q) => {
        questionIds.push(q.question_id);
      });
    });

    let logicRules = [];
    if (questionIds.length > 0) {
      logicRules = await this.entityManager.query(
        `SELECT logic_id, question_id, condition_question_id, condition_operator, condition_value, action 
         FROM survey_question_logic
         WHERE question_id = ANY($1)`,
        [questionIds],
      );
    }

    return {
      form_id: form.form_id,
      title: form.title,
      version: form.version,
      description: form.description,
      sections: form.sections.map((sec) => ({
        section_id: sec.section_id,
        title: sec.title,
        sort_order: sec.sort_order,
        questions: sec.questions.map((q) => ({
          question_id: q.question_id,
          question_code: q.question_code,
          question_text: q.question_text,
          question_type: q.question_type,
          is_mandatory: q.is_mandatory,
          validation_rule: q.validation_rule,
          options: q.options,
          sort_order: q.sort_order,
        })),
      })),
      logic: logicRules,
    };
  }
}
