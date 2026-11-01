import type { SurveyForm, SurveyQuestion } from '../types';

export function revision18FormError(form: SurveyForm): string | null {
  const questions = form.sections.flatMap((section) => section.questions);
  const byCode = (code: string) => questions.find((question) => question.question_code === code);
  const hasField = (question: SurveyQuestion | undefined, key: string, reference?: string) =>
    question?.fields?.some((field) => field.key === key && (!reference || field.reference === reference));

  const critical = byCode('G_CRITICAL_MACHINES');
  const boilers = byCode('G_BOILERS');
  const weights = byCode('G_WEIGHTS_MEASURES');
  const innovation = byCode('G_INNOVATION');
  const age = byCode('G_MACHINERY_AGE');
  const automation = byCode('G_AUTOMATION_LEVEL');
  const gate = byCode('G_INNOVATION_GATE');
  const inputs = byCode('E_MAJOR_INPUTS');
  const ready =
    hasField(critical, 'machine_name', 'industry_machines') &&
    hasField(critical, 'specification', 'machine_specifications') &&
    hasField(boilers, 'record_kind', 'g_vessel_kinds') &&
    hasField(boilers, 'working_pressure_raw') &&
    hasField(weights, 'equipment_type_id') &&
    hasField(weights, 'equipment_unit_id') &&
    hasField(inputs, 'unit_id', 'product_units') &&
    age?.answer_type === 'SHARE_PERCENT' && age.options.length > 0 &&
    automation?.answer_type === 'SHARE_PERCENT' && automation.options.length > 0 &&
    gate?.answer_type === 'YES_NO' &&
    innovation?.answer_type === 'MATRIX' && (innovation.matrix_items?.length ?? 0) > 0 &&
    innovation.matrix_items?.every((item) =>
      item.answer_type === 'CHOICE' && item.options.some((option) => option.code === 'NO_PLAN'),
    ) &&
    form.references?.industry_machines?.some((option) => option.id === 0 && option.requires_text) &&
    form.references?.machine_specifications?.some((option) => option.id === 0 && option.requires_text);

  return ready ? null
    : 'The server questionnaire is not ready for the Section G update. Apply migration 12 and deploy the updated API, then download the form again.';
}
