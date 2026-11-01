import type { SurveyInputField, SurveyQuestion } from '../types';
import { isSectionGFieldVisible } from './sectionG';
import { photoMetadataError } from './photoCapture';

function fieldFormatError(field: SurveyInputField, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (field.type === 'PHONE' && (typeof value !== 'string' || !/^\d{11}$/.test(value))) {
    return `${field.label} must contain exactly 11 digits.`;
  }
  if (field.type === 'EMAIL' && (
    typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )) {
    return `${field.label} must be a valid email address.`;
  }
  if (field.type === 'NUMBER' && field.min !== undefined && field.max !== undefined) {
    const numberValue = typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (
      !Number.isFinite(numberValue) ||
      (field.step === 1 && !Number.isInteger(numberValue)) ||
      numberValue < field.min || numberValue > field.max
    ) {
      const kind = field.step === 1 ? 'a whole number' : 'a number';
      return `${field.label} must be ${kind} between ${field.min} and ${field.max}.`;
    }
  }
  return null;
}

function fieldValue(row: unknown, key: string): unknown {
  if (typeof row !== 'object' || row === null || Array.isArray(row)) return undefined;
  return (row as Record<string, unknown>)[key];
}

export function questionFormatError(question: SurveyQuestion, value: unknown): string | null {
  if (question.answer_type === 'PHOTO' && value !== undefined && value !== null) {
    return photoMetadataError(value);
  }
  const rows = question.repeatable ? (Array.isArray(value) ? value : []) : [value];
  for (const row of rows) {
    for (const field of question.fields ?? []) {
      if (!isSectionGFieldVisible(question.question_code, row, field.key)) continue;
      const error = fieldFormatError(field, fieldValue(row, field.key));
      if (error) return error;
    }
  }
  return null;
}
