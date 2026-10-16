import { jsPDF } from 'jspdf';
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

function getQuestionAnswers(question: SurveyQuestion, answer: unknown): AnswerLine[] {
  const fields = question.fields ?? [];

  const fieldLines = (row: unknown): AnswerLine[] => {
    if (!isRecord(row)) {
      return fields.map((field) => ({ label: field.label, value: 'Not provided' }));
    }
    return fields.map((field) => ({
      label: field.label,
      value: displayValue(row[field.key], field.options),
    }));
  };

  if (question.repeatable) {
    if (!Array.isArray(answer) || answer.length === 0) {
      return [{ label: 'Response', value: 'No entries recorded' }];
    }
    return answer.flatMap((row, index) => [
      { label: `Entry ${index + 1}`, value: '' },
      ...fieldLines(row),
    ]);
  }

  if (fields.length > 0) return fieldLines(answer);

  if (question.answer_type === 'MATRIX' && isRecord(answer)) {
    const items = question.matrix_items ?? [];
    if (items.length === 0) return [{ label: 'Response', value: displayValue(answer) }];
    return items.map((item) => ({
      label: item.group_label ? `${item.group_label} - ${item.label}` : item.label,
      value: displayValue(answer[String(item.id)], item.options),
    }));
  }

  if (question.answer_type === 'SHARE_PERCENT' && isRecord(answer)) {
    return question.options.map((option) => ({
      label: option.label,
      value: answer[String(option.id)] == null ? 'Not provided' : `${answer[String(option.id)]}%`,
    }));
  }

  return [{ label: 'Answer', value: displayValue(answer, question.options) }];
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

  const drawQuestion = (question: SurveyQuestion, answer: unknown) => {
    ensureSpace(14);
    const title = questionTitle(question);
    const titleLines = pdf.splitTextToSize(title, contentW - 8) as string[];
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.navy);
    pdf.text(titleLines, margin + 4, y + 5);
    y += Math.max(9, titleLines.length * 4.1 + 3);

    const lines = getQuestionAnswers(question, answer);
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
    for (const section of form.sections) {
      drawSection(section.section_code, sectionTitle(section.section_code, section.title));
      for (const question of section.questions) {
        knownQuestionIds.add(question.question_id);
        drawQuestion(question, answersByQuestion.get(question.question_id));
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
