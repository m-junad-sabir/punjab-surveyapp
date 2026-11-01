import type { SurveyQuestion, SurveySection } from '../types';
import { matrixEntryForDisplay } from './sectionEF';
import { isQuestionVisible } from './surveyVisibility';

export type SectionStatus = 'pending' | 'partial' | 'done';

function hasContent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === 'object' && value !== null) return Object.values(value).some(hasContent);
  return false;
}

function hasQuestionAnswer(question: SurveyQuestion, value: unknown): boolean {
  if (!hasContent(value)) return false;
  if (question.answer_type === 'YES_NO') return typeof value === 'boolean';
  if (question.answer_type === 'PHOTO') {
    return typeof value === 'object' && value !== null &&
      'photo_id' in value && typeof value.photo_id === 'string' && !!value.photo_id.trim();
  }
  if (question.answer_type === 'MATRIX') {
    const items = question.matrix_items ?? [];
    return items.length > 0 && items.every((item) => {
      const entry = matrixEntryForDisplay(question, item, value);
      return hasContent(item.answer_type === 'CHOICE'
        ? entry.choice_value_id ?? entry.option_id
        : entry.rating);
    });
  }
  if (question.answer_type === 'MULTI_CHOICE') {
    const selected = typeof value === 'object' && value !== null && 'option_ids' in value
      ? value.option_ids : value;
    return Array.isArray(selected) && selected.length > 0;
  }
  if (question.repeatable) return Array.isArray(value) && value.length > 0 && value.every(hasContent);
  return true;
}

export function surveySectionStatus(
  section: SurveySection,
  questions: SurveyQuestion[],
  answers: Record<number, unknown>,
  isIncomplete: (question: SurveyQuestion) => boolean,
): SectionStatus {
  const visible = section.questions.filter((question) => isQuestionVisible(question, questions, answers));
  if (!visible.length) return 'pending';
  const answered = visible.filter((question) => hasQuestionAnswer(question, answers[question.question_id]));
  if (answered.length === visible.length && !visible.some(isIncomplete)) return 'done';
  return visible.some((question) => hasContent(answers[question.question_id])) ? 'partial' : 'pending';
}

export function surveySectionIndex(sections: SurveySection[], code: string | null): number {
  return Math.max(0, sections.findIndex((section) => section.section_code === code));
}

export function scrollSurveyToTop(element: HTMLElement | null): void {
  const container = element?.closest<HTMLElement>('.page-scroll');
  if (container) container.scrollTo({ top: 0, behavior: 'auto' });
}
