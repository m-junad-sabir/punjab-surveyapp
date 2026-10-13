import { jsPDF } from 'jspdf';
import type { SurveySubmissionDraft } from '../types';

type PdfSurvey = Partial<SurveySubmissionDraft> & {
  unit_code?: string;
  unit_name?: string;
  sections?: Record<string, unknown>;
};

const sectionTitles: Record<string, string> = {
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

const labelFor = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (object.preview) return `[Photo: ${object.file_name || 'attached'}]`;
    return Object.entries(object).map(([key, item]) => `${labelFor(key)}: ${displayValue(item)}`).join('; ');
  }
  return String(value);
}

export function downloadSurveyPdf(survey: PdfSurvey, filenameId?: string) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 16;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 18;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 18) {
      pdf.addPage();
      y = 18;
    }
  };

  const write = (text: string, size = 9, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, pageWidth - margin * 2);
    ensureSpace(lines.length * 4.5);
    pdf.text(lines, margin, y);
    y += lines.length * 4.5;
  };

  pdf.setTextColor(15, 30, 48);
  write('Punjab Industrial Survey', 18, true);
  write(survey.unit_name || survey.sections?.A && displayValue((survey.sections.A as Record<string, unknown>).establishment_name) || 'Industrial Unit Survey', 12, true);
  write(`Survey ID: ${survey.survey_id || '—'}   Unit Code: ${survey.unit_code || '—'}`, 9);
  write(`Enumerator: ${survey.enumerator_name || '—'}   Interview date: ${survey.interview_date || '—'}`, 9);
  y += 4;

  const sections = survey.sections || {};
  Object.keys(sections).sort().forEach((sectionKey) => {
    const raw = sections[sectionKey];
    const rows = Array.isArray(raw) ? raw : [raw];
    ensureSpace(14);
    pdf.setFillColor(26, 46, 74);
    pdf.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(`Section ${sectionKey}: ${sectionTitles[sectionKey] || 'Survey Data'}`, margin + 3, y + 1.5);
    pdf.setTextColor(15, 30, 48);
    y += 10;

    rows.forEach((row, rowIndex) => {
      if (!row || typeof row !== 'object') return;
      if (rows.length > 1) write(`Record ${rowIndex + 1}`, 9, true);
      Object.entries(row as Record<string, unknown>)
        .filter(([key]) => key !== 'survey_id')
        .forEach(([key, value]) => write(`${labelFor(key)}: ${displayValue(value)}`, 8));
      y += 2;
    });
  });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(120, 130, 145);
    pdf.text(`Punjab Industrial Survey | Page ${page} of ${pageCount}`, margin, pageHeight - 8);
  }

  const safeId = filenameId || survey.survey_id || 'survey';
  pdf.save(`industrial-survey-${safeId}.pdf`);
}