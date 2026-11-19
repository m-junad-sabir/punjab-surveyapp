import type { SurveyInputField, SurveyQuestion } from '../types';
import { isSectionGFieldVisible } from './sectionG';
import { photoMetadataError } from './photoCapture';

function numericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function decimalPlaces(value: unknown): number {
  const text = String(value).trim().toLowerCase();
  const [coefficient, exponentText] = text.split('e');
  const fraction = coefficient.split('.')[1]?.length ?? 0;
  return Math.max(0, fraction - Number(exponentText ?? 0));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function fieldFormatError(field: SurveyInputField, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (field.type === 'TEXT' && typeof value !== 'string') {
    return `${field.label} must be text.`;
  }
  if (field.max_length !== undefined && typeof value === 'string' &&
      Array.from(value).length > field.max_length) {
    return `${field.label} must be ${field.max_length} characters or fewer.`;
  }
  if (field.type === 'PHONE' && (typeof value !== 'string' || !/^\d{11}$/.test(value))) {
    return `${field.label} must contain exactly 11 digits.`;
  }
  if (field.type === 'EMAIL' && (
    typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )) {
    return `${field.label} must be a valid email address.`;
  }
  if (field.type === 'YES_NO' && typeof value !== 'boolean') {
    return `${field.label} must be Yes or No.`;
  }
  if (field.type === 'SINGLE_CHOICE') {
    const raw = isRecord(value) ? value.option_id : value;
    if (!(typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) &&
        !(typeof raw === 'string' && /^\d+$/.test(raw)) &&
        !(typeof value === 'string' && value.trim() !== '' &&
          ['hs_codes', 'industry_machines', 'machine_specifications'].includes(field.reference ?? ''))) {
      return `${field.label} must be selected from the available options.`;
    }
  }
  if (field.type === 'MULTI_CHOICE' || field.type === 'MONTHS') {
    const selected = Array.isArray(value) ? value
      : isRecord(value) ? value.option_ids ?? value.operating_months
        : null;
    if (selected === null || (selected !== undefined &&
        (!Array.isArray(selected) || selected.some((item) =>
          !(typeof item === 'number' && Number.isInteger(item) && item >= 0) &&
          !(typeof item === 'string' && /^\d+$/.test(item)))))) {
      return `${field.label} contains an invalid selection.`;
    }
  }
  if (field.type === 'NUMBER' || field.type === 'YEAR') {
    const number = numericValue(value);
    const wholeNumber = field.step === 1 || field.type === 'YEAR';
    const min = field.min;
    const max = field.max;
    if (number === null || (wholeNumber && !Number.isInteger(number)) ||
        (min !== undefined && number !== null && number < min) ||
        (max !== undefined && number !== null && number > max)) {
      if (wholeNumber && min !== undefined && max !== undefined) {
        return `${field.label} must be a whole number between ${min} and ${max}.`;
      }
      if (wholeNumber) return `${field.label} must be a whole number.`;
      if (number === null) return `${field.label} must be a valid number.`;
      if (min !== undefined && number < min) return `${field.label} must be at least ${min}.`;
      if (max !== undefined && number > max) return `${field.label} must be no more than ${max}.`;
    }
    if (number === null) return `${field.label} must be a valid number.`;
    if (field.precision !== undefined) {
      const integerDigits = Math.trunc(Math.abs(number)).toString().replace(/^0+/, '').length;
      if (integerDigits > field.precision - (field.scale ?? 0)) {
        return `${field.label} exceeds the maximum numeric precision (${field.precision},${field.scale ?? 0}).`;
      }
    }
    if (field.scale !== undefined && decimalPlaces(value) > field.scale) {
      return `${field.label} may have at most ${field.scale} decimal places.`;
    }
  }
  if (field.type === 'GPS') {
    if (!isRecord(value)) return `${field.label} must contain valid GPS coordinates.`;
    const nested = isRecord(value.location) ? value.location : value;
    const latitude = numericValue(nested.lat);
    const longitude = numericValue(nested.lng);
    const accuracy = numericValue(nested.accuracy ?? nested.accuracy_m);
    if (latitude === null || latitude < -90 || latitude > 90) {
      return `${field.label} latitude must be between -90 and 90.`;
    }
    if (longitude === null || longitude < -180 || longitude > 180) {
      return `${field.label} longitude must be between -180 and 180.`;
    }
    if (accuracy !== null && accuracy < 0) {
      return `${field.label} accuracy cannot be negative.`;
    }
    if (accuracy !== null && Math.trunc(accuracy).toString().length > 6) {
      return `${field.label} accuracy exceeds the supported numeric range.`;
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
  if (value !== undefined && value !== null && value !== '' && !question.fields?.length) {
    if (question.answer_type === 'YES_NO' && typeof value !== 'boolean') {
      return `${question.question_text} must be Yes or No.`;
    }
    if (question.answer_type === 'NUMBER' && numericValue(value) === null) {
      return `${question.question_text} must be a valid number.`;
    }
    if (question.answer_type === 'TEXT' && typeof value !== 'string') {
      return `${question.question_text} must be text.`;
    }
    if (question.answer_type === 'SINGLE_CHOICE') {
      const selected = isRecord(value) ? value.option_id : value;
      if (!(typeof selected === 'number' && Number.isInteger(selected) && selected >= 0) &&
          !(typeof selected === 'string' && /^\d+$/.test(selected))) {
        return `${question.question_text} must be selected from the available options.`;
      }
    }
    if (question.answer_type === 'MULTI_CHOICE') {
      const selected = Array.isArray(value) ? value
        : isRecord(value) ? value.option_ids
          : null;
      if (!Array.isArray(selected) || selected.some((item) =>
        !(typeof item === 'number' && Number.isInteger(item) && item >= 0) &&
        !(typeof item === 'string' && /^\d+$/.test(item)))) {
        return `${question.question_text} contains an invalid selection.`;
      }
    }
  }
  if (!question.fields?.length) return null;
  if (value !== undefined && value !== null &&
      (question.repeatable ? !Array.isArray(value) : !isRecord(value))) {
    return question.repeatable
      ? `${question.question_text} must be a list of entries.`
      : `${question.question_text} must contain field values.`;
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
