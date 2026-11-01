import { jsPDF } from 'jspdf';
import { getPhoto } from './db';
import { isQuestionVisible } from './surveyVisibility';
import {
  EMPLOYMENT_CATEGORIES,
  WORKFORCE_GENDERS,
  normalizeEmployment,
  normalizeSkills,
  workforceSkillOptions,
} from './sectionDWorkforce';
import {
  isProductFieldVisible,
  productKind,
  productUnitValueForDisplay,
  productValueForDisplay,
} from './sectionCProducts';
import {
  formatPercentage,
  isDefaultedShare,
  isSectionEfReason,
  matrixOptions,
  normalizeMatrix,
  normalizeReason,
  normalizeShares,
  reasonOptions,
  shareOptions,
} from './sectionEF';
import {
  isLegacyMachineryAgeWrapper,
  isSectionGFieldVisible,
  legacySectionGFields,
  machineValueForDisplay,
  sectionGSelectionId,
} from './sectionG';
import {
  isSectionHFieldVisible,
  sectionHSelectionId,
  totalGenerationCapacity,
} from './sectionH';
import type {
  OfflineResponse,
  QuestionOption,
  SurveyForm,
  SurveyQuestion,
} from '../types';

const SECTION_TITLES: Record<string, string> = {
  A: 'Establishment Identity',
  B: 'Operational Details',
  C: 'Core and Secondary Activities',
  D: 'Workforce',
  E: 'Backward Linkages',
  F: 'Forward Linkages',
  G: 'Technology and Production Processes',
  H: 'Energy and Waste Management',
  I: 'Certifications and Compliances',
  J: 'Strategic Business Plan',
  K: 'Future Collaborations and Barriers',
  L: 'Photo Evidence',
};

type AnswerLine = { label: string; value: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function displayValue(
  value: unknown,
  options: QuestionOption[] = [],
): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return options.find((option) => option.id === value)?.label ?? String(value);
  }
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => displayValue(item, options)).join(', ');
  }
  if (isRecord(value)) {
    if ('option_id' in value) {
      const optionId = value.option_id;
      const option = options.find((item) => item.id === optionId);
      const label = option?.label ?? String(optionId);
      return value.other_text ? `${label}: ${displayValue(value.other_text)}` : label;
    }
    if (Array.isArray(value.option_ids)) {
      const labels = value.option_ids.map((id) => {
        const option = options.find((item) => item.id === id);
        const label = option?.label ?? String(id);
        const otherText = isRecord(value.other_text) ? value.other_text[String(id)] : undefined;
        return otherText ? `${label}: ${displayValue(otherText)}` : label;
      });
      return labels.join(', ') || 'Not provided';
    }
    if ('lat' in value && 'lng' in value) {
      const lat = Number(value.lat);
      const lng = Number(value.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Location unavailable';
      const accuracy = Number(value.accuracy);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}${
        Number.isFinite(accuracy) ? ` (accuracy ±${Math.round(accuracy)} m)` : ''
      }`;
    }
    if ('preview' in value) {
      return `Photo attached: ${String(value.file_name ?? 'image')}`;
    }
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${displayValue(item)}`)
      .join('; ');
  }
  return String(value);
}

function getQuestionAnswers(
  question: SurveyQuestion,
  answer: unknown,
  references: Record<string, QuestionOption[]>,
  allAnswers: Record<number, unknown>,
  allQuestions: SurveyQuestion[],
): AnswerLine[] {
  const fields = question.fields ?? [];

  if (question.question_code === 'H_ENERGY_CONSUMPTION') {
    const sourceRows = Array.isArray(answer) ? answer.filter(isRecord) : [];
    const bySource = new Map<number, Record<string, unknown>>();
    for (const row of sourceRows) {
      const sourceId = sectionHSelectionId(row.energy_source_id);
      if (sourceId !== null) bySource.set(sourceId, row);
    }
    const totalShare = [...bySource.values()].reduce((total, row) => {
      const share = row.share_pct == null || row.share_pct === '' ? 0 : Number(row.share_pct);
      return total + (Number.isFinite(share) ? share : 0);
    }, 0);
    const lines: AnswerLine[] = [];
    for (const source of question.options) {
      if (source.is_selectable === false) continue;
      const row = bySource.get(source.id);
      const quantity = row?.quantity_per_month;
      const unitId = sectionHSelectionId(row?.unit_id);
      const unit = (references.energy_source_units ?? []).find((option) =>
        option.id === unitId && option.parent_id === source.id,
      );
      const share = row?.share_pct == null || row.share_pct === ''
        ? 0
        : Number(row.share_pct);
      const otherText = typeof row?.other_text === 'string' ? row.other_text.trim() : '';
      const sourceLabel = otherText ? `${source.label}: ${otherText}` : source.label;
      lines.push({
        label: `${sourceLabel} - Quantity per month`,
        value: quantity === null || quantity === undefined || quantity === ''
          ? 'Not provided'
          : `${String(quantity)}${unit ? ` ${unit.label}` : ''}`,
      });
      lines.push({
        label: `${sourceLabel} - Energy use share`,
        value: `${Number.isFinite(share) ? share.toFixed(2) : '0.00'}%`,
      });
    }
    for (const [sourceId, row] of bySource) {
      if (question.options.some((source) => source.id === sourceId)) continue;
      lines.push({
        label: `Previously selected energy source (${sourceId})`,
        value: `${row.share_pct == null ? '0.00' : Number(row.share_pct).toFixed(2)}%`,
      });
    }
    lines.push({ label: 'Total energy use share', value: `${totalShare.toFixed(2)}%` });
    return lines;
  }

  if (question.question_code === 'H_CAPTIVE_EXPORT_CAPACITY') {
    const generationQuestion = allQuestions.find((candidate) =>
      candidate.question_code === 'H_ENERGY_GENERATION',
    );
    const generatedCapacity = totalGenerationCapacity(
      generationQuestion ? allAnswers[generationQuestion.question_id] : [],
    );
    return [
      { label: 'Total captive capacity (kW)', value: `${generatedCapacity}` },
      {
        label: 'Export capacity (kW)',
        value: displayValue(isRecord(answer) ? answer.export_capacity_kw : undefined),
      },
    ];
  }

  if (question.question_code === 'D_EMPLOYMENT') {
    const normalized = normalizeEmployment(answer);
    if (!normalized.ok) return [{ label: 'Workforce data', value: normalized.error }];
    const rows = normalized.value;
    return [
      ...EMPLOYMENT_CATEGORIES.flatMap((category) => [
        ...WORKFORCE_GENDERS.map((gender) => ({
          label: `${category.label} - ${gender.label}`,
          value: String(rows.find((row) => row.gender === gender.id)![category.key]),
        })),
        {
          label: `${category.label} total`,
          value: String(rows.reduce((total, row) => total + row[category.key], 0)),
        },
      ]),
      ...WORKFORCE_GENDERS.map((gender) => {
        const row = rows.find((item) => item.gender === gender.id)!;
        return {
          label: `${gender.label} employee subtotal`,
          value: String(EMPLOYMENT_CATEGORIES.reduce((total, category) => total + row[category.key], 0)),
        };
      }),
      {
        label: 'All employees',
        value: String(rows.reduce((total, row) =>
          total + EMPLOYMENT_CATEGORIES.reduce((sum, category) => sum + row[category.key], 0), 0)),
      },
    ];
  }

  if (question.question_code === 'D_SKILLS') {
    const normalized = normalizeSkills(question, answer, references);
    if (!normalized.ok) return [{ label: 'Workforce data', value: normalized.error }];
    const rows = normalized.value;
    const options = workforceSkillOptions(question, answer, references);
    return [
      ...options.flatMap((option) => [
        ...WORKFORCE_GENDERS.map((gender) => ({
          label: `${option.label} - ${gender.label}`,
          value: String(rows.find((row) => row.skill_level_id === option.id && row.gender === gender.id)!.headcount),
        })),
        {
          label: `${option.label} total`,
          value: String(rows.filter((row) => row.skill_level_id === option.id)
            .reduce((total, row) => total + row.headcount, 0)),
        },
      ]),
      ...WORKFORCE_GENDERS.map((gender) => ({
        label: `${gender.label} employee subtotal`,
        value: String(rows.filter((row) => row.gender === gender.id)
          .reduce((total, row) => total + row.headcount, 0)),
      })),
      { label: 'All employees', value: String(rows.reduce((total, row) => total + row.headcount, 0)) },
    ];
  }

  const fieldLines = (row: unknown): AnswerLine[] => {
    return fields.filter((field) =>
      isProductFieldVisible(question.question_code, row, field.key) &&
      isSectionGFieldVisible(question.question_code, row, field.key) &&
      isSectionHFieldVisible(question.question_code, row, field.key, question.fields),
    ).map((field) => {
      const value = isRecord(row) ? row[field.key] : undefined;
      const useDefault = (value === undefined || value === null || value === '') &&
        field.default_value !== undefined;
      const options = question.question_code === 'C_PRODUCTS' && field.reference === 'hs_codes'
        ? references.hs_codes ?? field.options
        : field.options;
      const kind = question.question_code === 'C_PRODUCTS' && field.key === 'product_kind'
        ? productKind(value)
        : null;
      let display = value;
      if (question.question_code === 'H_SOLID_WASTE' && field.key === 'disposal_method_ids' &&
          isRecord(row) && typeof row.other_text === 'string' && row.other_text.trim()) {
        const selected = Array.isArray(value)
          ? value
          : isRecord(value) && Array.isArray(value.option_ids) ? value.option_ids : [];
        const other = options.find((option) => option.code === 'OTHER');
        if (other && selected.some((id) => Number(id) === other.id)) {
          const existingText = isRecord(value) && isRecord(value.other_text)
            ? value.other_text[String(other.id)]
            : undefined;
          display = {
            option_ids: selected,
            other_text: {
              [other.id]: typeof existingText === 'string' && existingText.trim()
                ? existingText
                : row.other_text,
            },
          };
        }
      }
      if (typeof value === 'string' && kind) {
        display = kind === 'MAIN' ? 1 : 2;
      } else if (field.reference === 'product_units') {
        display = productUnitValueForDisplay(value);
      } else if (question.question_code === 'C_PRODUCTS' &&
          field.reference === 'industry_products' && typeof value !== 'string') {
        display = productValueForDisplay(value, options);
      } else if (['industry_machines', 'machine_specifications'].includes(field.reference ?? '') &&
          typeof value !== 'string') {
        display = machineValueForDisplay(value, options);
      }
      return {
        label: field.label,
        value: useDefault ? `${field.default_value} (default)` : displayValue(display, options),
      };
    });
  };

  if (question.repeatable) {
    const applicableRows = Array.isArray(answer) ? answer.filter((row) =>
      !isRecord(row) || Object.values(row).some((value) =>
        value !== undefined && value !== null && value !== '',
      ),
    ) : [];
    if (applicableRows.length === 0) {
      const notApplicable = ['G_CRITICAL_MACHINES', 'G_BOILERS', 'G_WEIGHTS_MEASURES']
        .includes(question.question_code);
      return [{ label: 'Response', value: notApplicable ? 'Not Applicable' : 'No entries recorded' }];
    }
    return applicableRows.flatMap((row, index) => [
      { label: `Entry ${index + 1}`, value: '' },
      ...legacySectionGFields(question.question_code, row),
      ...fieldLines(row),
    ]);
  }

  if (fields.length > 0) return fieldLines(answer);

  const legacyAgeLines = (value: unknown): AnswerLine[] => {
    if (!Array.isArray(value)) return [];
    return value.map((row, index) => {
      if (!isRecord(row)) return { label: `Previous count ${index + 1}`, value: displayValue(row) };
      const option = question.options.find((item) => item.id === sectionGSelectionId(row.age_bracket_id));
      return {
        label: `Previous count - ${option?.label ?? `age bracket ${String(row.age_bracket_id ?? index + 1)}`}`,
        value: `${displayValue(row.machine_count)} machines`,
      };
    });
  };
  if (question.question_code === 'G_MACHINERY_AGE' && Array.isArray(answer) && answer.length > 0) {
    return [
      { label: 'Previous machinery-age data', value: 'Counts; percentage shares require re-entry' },
      ...legacyAgeLines(answer),
    ];
  }

  if (isDefaultedShare(question)) {
    const shares = question.question_code === 'G_MACHINERY_AGE' && isLegacyMachineryAgeWrapper(answer)
      ? answer.shares
      : question.question_code === 'G_MACHINERY_AGE' && Array.isArray(answer) && answer.length === 0
        ? {} : answer;
    const normalized = normalizeShares(question, answer, references);
    if (!normalized.ok) return [{ label: 'Share data', value: normalized.error }];
    return [
      ...(question.question_code === 'G_MACHINERY_AGE' && isLegacyMachineryAgeWrapper(answer)
        ? legacyAgeLines(answer.legacy_counts) : []),
      ...shareOptions(question, shares, references).map((option) => {
        const entry = normalized.value.entries[String(option.id)];
        const percent = typeof entry === 'number' ? entry : entry.percent;
        const text = typeof entry === 'number' ? '' : entry.other_text;
        return {
          label: text ? `${option.label}: ${text}` : option.label,
          value: `${formatPercentage(percent)}%`,
        };
      }),
      { label: 'Total', value: `${formatPercentage(normalized.value.total)}% / 100%` },
    ];
  }

  if (question.answer_type === 'MATRIX') {
    const items = question.matrix_items ?? [];
    const normalized = normalizeMatrix(question, answer, references);
    if (!normalized.ok) return [{ label: 'Matrix data', value: normalized.error }];
    if (items.length === 0) return [{ label: 'Response', value: displayValue(answer) }];
    return items.map((item) => {
      const entry = normalized.value[String(item.id)] ?? {};
      const options = matrixOptions(item, entry, references);
      const selection = item.answer_type === 'RATING_1_5'
        ? entry.rating
        : entry.choice_value_id;
      const value = displayValue(selection, item.answer_type === 'RATING_1_5' ? [] : options);
      return {
        label: item.group_label ? `${item.group_label} - ${item.label}` : item.label,
        value: entry.other_text ? `${value}: ${entry.other_text}` : value,
      };
    });
  }

  if (question.answer_type === 'SHARE_PERCENT' && isRecord(answer)) {
    return question.options.map((option) => ({
      label: option.label,
      value: answer[String(option.id)] == null ? 'Not provided' : `${answer[String(option.id)]}%`,
    }));
  }

  if (question.answer_type === 'PHOTO' && isRecord(answer)) {
    const captured = typeof answer.captured_at === 'string'
      ? new Date(answer.captured_at).toLocaleString()
      : 'Capture time unavailable';
    return [{ label: 'Evidence', value: `Captured ${captured}; see photo evidence page.` }];
  }

  if (isSectionEfReason(question)) {
    const normalized = normalizeReason(question, answer, references);
    if (!normalized.ok) return [{ label: 'Reason data', value: normalized.error }];
    return [{
      label: 'Answer',
      value: displayValue(normalized.value, reasonOptions(question, normalized.value, references)),
    }];
  }

  return [{
    label: 'Answer',
    value: displayValue(answer, question.options),
  }];
}

function sectionTitle(code: string, title: string): string {
  const descriptiveTitle = SECTION_TITLES[code] ?? title;
  return title && title !== code ? title : descriptiveTitle;
}

function questionTitle(question: SurveyQuestion): string {
  const number = question.question_no ? `${question.question_no}  ` : '';
  return `${number}${question.question_text || question.question_code}`;
}

function safeFilename(value: string): string {
  const safe = value
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return safe || 'survey-response';
}

async function loadLogoData(path: string): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Unable to load PDF logo: ${path}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error(`Unable to read PDF logo: ${path}`));
    };
    reader.onerror = () => reject(reader.error ?? new Error(`Unable to read PDF logo: ${path}`));
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates a formatted, sectioned PDF of a saved survey response.
 */
export async function downloadSurveyPdf(response: OfflineResponse, form?: SurveyForm | null): Promise<void> {
  const [punjabLogo, nespakLogo] = await Promise.all([
    loadLogoData('logos/punjab-industries.png'),
    loadLogoData('logos/nespak.jpeg'),
  ]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  const footerY = pageH - 10;
  let y = 18;

  const colors = {
    navy: [20, 43, 70] as [number, number, number],
    blue: [36, 91, 138] as [number, number, number],
    teal: [24, 135, 132] as [number, number, number],
    ink: [40, 52, 66] as [number, number, number],
    muted: [105, 119, 133] as [number, number, number],
    line: [220, 227, 234] as [number, number, number],
    pale: [244, 248, 251] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  const startContinuationPage = () => {
    pdf.addPage();
    y = 16;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.muted);
    pdf.text('MAPPING OF MANUFACTURING UNITS IN PUNJAB', margin, y);
    pdf.setDrawColor(...colors.line);
    pdf.line(margin, y + 3, pageW - margin, y + 3);
    y += 12;
  };

  const ensureSpace = (height: number) => {
    if (y + height > footerY - 4) startContinuationPage();
  };

  const writeWrapped = (
    text: string,
    x: number,
    width: number,
    size: number,
    color: [number, number, number],
    bold = false,
    lineHeight = 4.4,
  ): number => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, width) as string[];
    pdf.text(lines, x, y);
    const height = Math.max(lineHeight, lines.length * lineHeight);
    y += height;
    return height;
  };

  // Official document heading.
  pdf.setFillColor(...colors.navy);
  pdf.rect(0, 0, pageW, 59, 'F');
  pdf.setFillColor(...colors.teal);
  pdf.rect(0, 59, pageW, 2, 'F');
  pdf.setFillColor(...colors.white);
  pdf.roundedRect(margin, 8, 27, 27, 2, 2, 'F');
  pdf.addImage(punjabLogo, 'PNG', margin + 2, 10, 23, 23);
  pdf.roundedRect(pageW - margin - 31, 8, 31, 27, 2, 2, 'F');
  pdf.addImage(nespakLogo, 'JPEG', pageW - margin - 29, 11.5, 27, 20);
  pdf.setTextColor(...colors.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('GOVERNMENT OF THE PUNJAB', pageW / 2, 17, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text('DIRECTOR GENERAL OF INDUSTRIES', pageW / 2, 27, { align: 'center' });
  pdf.setFontSize(17);
  pdf.text('MAPPING OF MANUFACTURING UNITS', pageW / 2, 40, { align: 'center' });
  pdf.setFontSize(13);
  pdf.text('IN PUNJAB', pageW / 2, 49, { align: 'center' });

  const responseDate = response.submitted_at ?? response.created_at ?? response.started_at;
  const dateLabel = responseDate && !Number.isNaN(new Date(responseDate).getTime())
    ? new Date(responseDate).toLocaleString()
    : 'Not recorded';
  y = 70;
  pdf.setFillColor(...colors.pale);
  pdf.roundedRect(margin, y, contentW, 24, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.muted);
  pdf.text('RESPONSE ID', margin + 5, y + 7);
  pdf.text('DATE', margin + 5, y + 16);
  pdf.text('STATUS', pageW / 2 + 4, y + 7);
  pdf.text('GPS LOCATION', pageW / 2 + 4, y + 16);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...colors.ink);
  pdf.setFontSize(8);
  pdf.text(response.response_id, margin + 29, y + 7);
  pdf.text(dateLabel, margin + 29, y + 16);
  pdf.text(response.sync_status.replace(/_/g, ' ').toUpperCase(), pageW / 2 + 26, y + 7);
  const gps = response.gps_lat != null && response.gps_lng != null
    ? `${response.gps_lat.toFixed(5)}, ${response.gps_lng.toFixed(5)}`
    : 'Not captured';
  pdf.text(gps, pageW / 2 + 26, y + 16);
  y += 33;

  const answersByQuestion = new Map(
    response.answers.map((answer) => [answer.question_id, answer.answer_value]),
  );

  const drawSection = (code: string, title: string) => {
    ensureSpace(16);
    pdf.setFillColor(...colors.blue);
    pdf.roundedRect(margin, y, contentW, 10, 1.5, 1.5, 'F');
    pdf.setTextColor(...colors.white);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    if (code) {
      pdf.text(`SECTION ${code}`, margin + 4, y + 6.5);
      pdf.setFontSize(10);
      pdf.text(title, margin + 31, y + 6.5);
    } else {
      pdf.setFontSize(10);
      pdf.text(title, margin + 4, y + 6.5);
    }
    y += 15;
  };

  const drawQuestion = (
    question: SurveyQuestion,
    answer: unknown,
    allAnswers: Record<number, unknown>,
    allQuestions: SurveyQuestion[],
  ) => {
    ensureSpace(14);
    const title = questionTitle(question);
    const titleLines = pdf.splitTextToSize(title, contentW - 8) as string[];
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.navy);
    pdf.text(titleLines, margin + 4, y + 5);
    y += Math.max(9, titleLines.length * 4.1 + 3);

    const lines = getQuestionAnswers(
      question, answer, form?.references ?? {}, allAnswers, allQuestions,
    );
    for (const line of lines) {
      const isEntry = line.value === '' && line.label.startsWith('Entry ');
      if (isEntry) {
        ensureSpace(9);
        pdf.setFillColor(...colors.pale);
        pdf.rect(margin + 3, y, contentW - 6, 7, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.blue);
        pdf.text(line.label.toUpperCase(), margin + 5, y + 4.8);
        y += 9;
        continue;
      }

      const label = `${line.label}:`;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      const labelX = margin + 5;
      const labelWidth = contentW * 0.36;
      const valueX = labelX + labelWidth + 3;
      const valueWidth = pageW - margin - 5 - valueX;
      const labelLines = pdf.splitTextToSize(label, labelWidth) as string[];
      pdf.setFont('helvetica', 'normal');
      const valueLines = pdf.splitTextToSize(line.value, valueWidth) as string[];
      const lineCount = Math.max(labelLines.length, valueLines.length, 1);
      const rowHeight = Math.max(6, lineCount * 4.2 + 1.5);
      ensureSpace(rowHeight);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...colors.muted);
      pdf.text(labelLines, labelX, y + 4);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.ink);
      pdf.text(valueLines, valueX, y + 4);
      y += rowHeight;
    }

    y += 3;
    pdf.setDrawColor(...colors.line);
    pdf.line(margin, y, pageW - margin, y);
    y += 5;
  };

  if (form?.sections.length) {
    const knownQuestionIds = new Set<number>();
    const questions = form.sections.flatMap((section) => section.questions);
    const answersRecord = Object.fromEntries(answersByQuestion);
    for (const section of form.sections) {
      drawSection(section.section_code, sectionTitle(section.section_code, section.title));
      for (const question of section.questions) {
        knownQuestionIds.add(question.question_id);
        if (!isQuestionVisible(question, questions, answersRecord)) continue;
        drawQuestion(question, answersByQuestion.get(question.question_id), answersRecord, questions);
      }
    }

    const unlabelledAnswers = [...answersByQuestion]
      .filter(([questionId]) => !knownQuestionIds.has(questionId));
    if (unlabelledAnswers.length > 0) {
      drawSection('', 'Additional Saved Answers');
      for (const [questionId, answer] of unlabelledAnswers) {
        ensureSpace(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(...colors.navy);
        pdf.text(`Question ${questionId}`, margin + 4, y);
        y += 5;
        writeWrapped(displayValue(answer), margin + 4, contentW - 8, 8, colors.ink);
        y += 4;
      }
    }
  } else {
    drawSection('', 'Survey Responses');
    for (const [questionId, answer] of answersByQuestion) {
      ensureSpace(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...colors.navy);
      pdf.text(`Question ${questionId}`, margin + 4, y);
      y += 5;
      writeWrapped(displayValue(answer), margin + 4, contentW - 8, 8, colors.ink);
      y += 4;
    }
  }

  const photoQuestions = (form?.sections ?? []).flatMap((section) => section.questions)
    .filter((question) => question.answer_type === 'PHOTO');
  for (const question of photoQuestions) {
    const answer = answersByQuestion.get(question.question_id);
    const photoId = isRecord(answer) && typeof answer.photo_id === 'string' ? answer.photo_id : null;
    if (!photoId) continue;
    const storedPhoto = await getPhoto(photoId);
    if (!storedPhoto || storedPhoto.owner_id !== response.surveyor_id) continue;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Photo could not be read.'));
      reader.onerror = () => reject(new Error('Photo could not be read.'));
      reader.readAsDataURL(storedPhoto.blob);
    });
    const bitmap = await createImageBitmap(storedPhoto.blob);
    pdf.addPage();
    pdf.setTextColor(...colors.navy);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(question.question_text, margin, 24);

    const maxWidth = contentW;
    const maxHeight = footerY - 34 - 24;
    const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height);
    const imageWidth = bitmap.width * scale;
    const imageHeight = bitmap.height * scale;
    pdf.addImage(dataUrl, 'JPEG', margin + (contentW - imageWidth) / 2, 34, imageWidth, imageHeight);
    bitmap.close();

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.muted);
    pdf.text(
      `${new Date(storedPhoto.captured_at).toLocaleString()} | ${storedPhoto.latitude.toFixed(6)}, ${storedPhoto.longitude.toFixed(6)} | ±${Math.round(storedPhoto.accuracy_m)} m`,
      margin,
      pageH - footerY - 8,
    );
  }

  const total = pdf.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(...colors.line);
    pdf.line(margin, footerY - 4, pageW - margin, footerY - 4);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...colors.muted);
    pdf.text('DIRECTOR GENERAL OF INDUSTRIES  |  PUNJAB', margin, footerY);
    pdf.text(`Page ${page} of ${total}`, pageW - margin, footerY, { align: 'right' });
  }

  const unitNameAnswer = form?.sections
    .flatMap((section) => section.questions)
    .find((question) => question.question_code === 'A_ESTABLISHMENT_NAME');
  const unitNameValue = unitNameAnswer
    ? answersByQuestion.get(unitNameAnswer.question_id)
    : undefined;
  const unitName = isRecord(unitNameValue) && typeof unitNameValue.name === 'string'
    ? unitNameValue.name
    : unitNameAnswer
      ? displayValue(unitNameValue)
      : response.response_id.slice(0, 8);
  pdf.save(`${safeFilename(unitName)}-survey.pdf`);
}

// Keep legacy export name for any remaining imports
export { downloadSurveyPdf as downloadSurveyPdfLegacy };
export { SECTION_TITLES };
