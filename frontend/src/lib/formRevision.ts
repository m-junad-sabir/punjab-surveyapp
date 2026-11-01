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

export function revision19FormError(form: SurveyForm): string | null {
  const questions = form.sections.flatMap((section) => section.questions);
  const byCode = (code: string) => questions.find((question) => question.question_code === code);
  const energy = byCode('H_ENERGY_CONSUMPTION');
  const generation = byCode('H_ENERGY_GENERATION');
  const capacity = byCode('H_CAPTIVE_EXPORT_CAPACITY');
  const solidWaste = byCode('H_SOLID_WASTE');
  const water = byCode('H_WATER_WASTE_DISPOSAL');
  const green = byCode('H_GREEN_PRACTICES');
  const gates = [
    byCode('H_WATER_WASTE_GATE'),
    byCode('H_SOLID_WASTE_GATE'),
    byCode('H_GREEN_PRACTICES_GATE'),
  ];
  const energySourceField = energy?.fields?.find((field) => field.key === 'energy_source_id');
  const energyUnitField = energy?.fields?.find((field) => field.key === 'unit_id');
  const sourceUnitOptions = form.references?.energy_source_units ?? [];
  const unitCode = (id: number) => sourceUnitOptions.find((option) => option.id === id)?.code;
  const sourceHas = (sourceCode: string, codes: string[]) => {
    const source = energySourceField?.options.find((option) => option.code === sourceCode);
    return Boolean(source && codes.every((code) =>
      sourceUnitOptions.some((option) => option.parent_id === source.id && unitCode(option.id) === code),
    ));
  };
  const hasMatrixNo = (question: SurveyQuestion | undefined) =>
    question?.answer_type === 'MATRIX' && (question.matrix_items?.length ?? 0) > 0 &&
    question.matrix_items?.every((item) =>
      item.answer_type === 'CHOICE' && item.options.some((option) => option.code === 'NO'),
    );
  const ready =
    energy?.repeatable === true &&
    energyUnitField?.reference === 'energy_source_units' &&
    sourceHas('GRID', ['KWH']) &&
    sourceHas('DIESEL', ['L']) &&
    sourceHas('GAS', ['KG']) &&
    sourceHas('NATURAL_GAS_PROCESS', ['KG']) &&
    sourceHas('COAL', ['TON']) &&
    sourceHas('FURNACE_OIL', ['L']) &&
    sourceHas('SOLAR', ['KWH']) &&
    sourceHas('BIOMASS', ['TON']) &&
    sourceHas('OTHER', ['KWH', 'L', 'KG', 'TON']) &&
    generation?.repeatable === true &&
    capacity?.fields?.some((field) => field.key === 'export_capacity_kw') &&
    solidWaste?.repeatable === true &&
    !solidWaste.fields?.some((field) => field.key === 'is_generated' || field.key === 'other_text') &&
    gates.every((gate) => gate?.answer_type === 'YES_NO' && gate.is_required) &&
    hasMatrixNo(water) && hasMatrixNo(green);

  return ready ? null
    : 'The server questionnaire is not ready for the Section H update. Apply migration 13 and deploy the updated API, then download the form again.';
}
