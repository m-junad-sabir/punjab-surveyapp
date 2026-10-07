import { jsPDF } from 'jspdf';
import type { OfflineResponse } from '../types';

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

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (o.preview)   return `[Photo: ${o.file_name ?? 'attached'}]`;
    if ('lat' in o)  return `${(o.lat as number).toFixed(6)}, ${(o.lng as number).toFixed(6)}`;
    return Object.entries(o).map(([k, v]) => `${k}: ${displayValue(v)}`).join('; ');
  }
  return String(value);
}

/**
 * Generates a PDF of an OfflineResponse and triggers download.
 */
export function downloadSurveyPdf(response: OfflineResponse): void {
  const pdf      = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin   = 16;
  const pageW    = pdf.internal.pageSize.getWidth();
  const pageH    = pdf.internal.pageSize.getHeight();
  let y          = 18;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - 18) { pdf.addPage(); y = 18; }
  };

  const write = (text: string, size = 9, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, pageW - margin * 2);
    ensureSpace(lines.length * 4.5);
    pdf.text(lines, margin, y);
    y += lines.length * 4.5;
  };

  // ── Header ──────────────────────────────────────────────────
  pdf.setTextColor(15, 30, 48);
  write('Government of Punjab — Industrial Unit Survey', 14, true);
  write(`Response ID: ${response.response_id}`, 9);
  const responseDate = response.submitted_at ?? response.created_at ?? response.started_at;
  write(`Date: ${responseDate ? new Date(responseDate).toLocaleString() : '—'}   GPS: ${response.gps_lat ? `${response.gps_lat.toFixed(5)}, ${response.gps_lng!.toFixed(5)}` : '—'}`, 9);
  y += 4;

  // ── Answers ─────────────────────────────────────────────────
  const sortedAnswers = [...response.answers].sort((a, b) => a.question_id - b.question_id);
  write('Survey Answers', 11, true);
  y += 2;

  for (const ans of sortedAnswers) {
    ensureSpace(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(`Q${ans.question_id}:`, margin, y);
    pdf.setFont('helvetica', 'normal');
    const valText = displayValue(ans.answer_value);
    const lines = pdf.splitTextToSize(valText, pageW - margin * 2 - 14);
    pdf.text(lines, margin + 14, y);
    y += Math.max(4.5, lines.length * 4.5);
  }

  // ── Footer ───────────────────────────────────────────────────
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(120, 130, 145);
    pdf.text(`Punjab Industrial Survey · Page ${p} of ${total}`, margin, pageH - 8);
  }

  pdf.save(`survey-${response.response_id.slice(0, 8)}.pdf`);
}

// Keep legacy export name for any remaining imports
export { downloadSurveyPdf as downloadSurveyPdfLegacy };
export { SECTION_TITLES };
