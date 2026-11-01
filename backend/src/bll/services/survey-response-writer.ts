import { EntityManager } from 'typeorm';
import {
  SECTION_B_DEFAULT_WORKING_DAYS,
  SECTION_B_WORKING_RANGES,
  SECTION_D_MAX_COUNT,
} from './survey-questionnaire';

export interface SubmittedQuestion {
  id: number;
  question_code: string;
  answer_type: string;
  lookup_type_id: number | null;
}

export type SurveyAnswers = Map<string, unknown>;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function number(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function selectionId(value: unknown): number | null {
  return number(record(value).option_id ?? value);
}

function answerOptionId(answers: SurveyAnswers, code: string, key?: string): number | null {
  return selectionId(key ? field(answers, code, key) : answers.get(code));
}

function field(answers: SurveyAnswers, code: string, key: string): unknown {
  return record(answers.get(code))[key];
}

function rows(answers: SurveyAnswers, code: string): Array<Record<string, unknown>> {
  const value = answers.get(code);
  return Array.isArray(value) ? value.map(record) : [];
}

export async function clearHiddenSurveyAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
): Promise<boolean> {
  const parentCompany = field(answers, 'A_PARENT_COMPANY', 'has_parent_company') === true;
  if (!parentCompany) {
    answers.delete('A_PARENT_COMPANY_DETAILS');
    answers.delete('A_ASSOCIATED_ESTABLISHMENTS');
  }

  const statusValue = answers.get('B_OPERATION_STATUS');
  const operationStatusId = selectionId(statusValue);
  if (
    statusValue !== undefined && statusValue !== null && statusValue !== '' &&
    (operationStatusId === null || !Number.isInteger(operationStatusId) || operationStatusId < 1)
  ) {
    throw new Error('The selected operation status is not present in the active reference list.');
  }
  const operationStatusRows = operationStatusId === null
    ? []
    : await manager.query(
      `SELECT lv.code
         FROM lookup_values lv
         JOIN lookup_types lt ON lt.id = lv.type_id
        WHERE lv.id = $1 AND lv.is_active = true AND lt.code = 'OPERATION_STATUS'`,
      [operationStatusId],
    ) as Array<{ code: string }>;
  if (operationStatusId !== null && !operationStatusRows[0]) {
    throw new Error('The selected operation status is not present in the active reference list.');
  }

  const operationStatus = operationStatusRows[0]?.code ?? null;
  if (operationStatus !== 'PERM_CLOSED') {
    answers.delete('B_CLOSURE_REASON');
  }
  if (operationStatus === null || operationStatus === 'PERM_CLOSED') {
    answers.delete('B_OPERATION_MONTHS');
    answers.delete('B_OPERATIONAL_HOURS');
  }

  if (field(answers, 'E_SUPPLY_DISRUPTION', 'had_supply_disruption') !== true) {
    answers.delete('E_SUPPLY_DISRUPTION_REASON');
  }
  if (field(answers, 'F_DEMAND_GAP', 'had_demand_gap') !== true) {
    answers.delete('F_DEMAND_GAP_REASON');
  }
  if (answers.get('H_WATER_WASTE_GATE') === false) {
    answers.delete('H_WATER_WASTE_DISPOSAL');
  }
  if (answers.get('H_GREEN_PRACTICES_GATE') === false) {
    answers.delete('H_GREEN_PRACTICES');
  }
  if (answers.get('H_SOLID_WASTE_GATE') === false) {
    answers.delete('H_SOLID_WASTE');
  }
  if (field(answers, 'K_FUTURE_PLAN', 'has_future_plan') !== true) {
    for (const questionCode of answers.keys()) {
      if (questionCode.startsWith('K_') && questionCode !== 'K_FUTURE_PLAN') {
        answers.delete(questionCode);
      }
    }
  }
  return operationStatus === 'PERM_CLOSED';
}

function validatePhone(value: unknown, label: string): void {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string' || !/^\d{11}$/.test(value)) {
    throw new Error(`${label} must contain exactly 11 digits.`);
  }
}

function validateEmail(value: unknown, label: string): void {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new Error(`${label} must be a valid email address.`);
  }
}

export async function validateSectionAAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
): Promise<void> {
  const contact = record(answers.get('A_CONTACT'));
  validatePhone(contact.contact_phone, 'Establishment mobile number');
  validateEmail(contact.contact_email, 'Establishment email');

  if (field(answers, 'A_PARENT_COMPANY', 'has_parent_company') === true) {
    const parent = record(answers.get('A_PARENT_COMPANY_DETAILS'));
    validatePhone(parent.phone, 'Parent company phone');
    validatePhone(parent.cell, 'Parent company cell number');
    validateEmail(parent.email, 'Parent company email');
  }

  const investment = record(answers.get('A_TOTAL_CAPITAL_INVESTMENT'));
  const investmentAmount = investment.total_capital_investment;
  const investmentUnitId = selectionId(investment.capital_investment_unit_id);
  const amount = number(investmentAmount);
  const hasAmount = investmentAmount !== undefined && investmentAmount !== null && investmentAmount !== '';
  const hasUnit = investmentUnitId !== null;
  if (hasAmount !== hasUnit) {
    throw new Error('Enter both the total capital investment amount and its currency unit.');
  }
  if (hasAmount && (amount === null || amount < 0)) {
    throw new Error('Total capital investment must be a non-negative number.');
  }
  if (hasUnit) {
    const units = await manager.query(
      `SELECT lv.id
         FROM lookup_values lv
         JOIN lookup_types lt ON lt.id = lv.type_id
        WHERE lv.id = $1 AND lv.is_active = true AND lt.code = 'CAPITAL_INVESTMENT_UNIT'`,
      [investmentUnitId],
    ) as Array<{ id: number }>;
    if (!units[0]) throw new Error('Choose a valid capital investment currency unit.');
  }

  for (const interviewee of rows(answers, 'A_INTERVIEWEES')) {
    if (isBlank(interviewee)) continue;
    if (
      typeof interviewee.name !== 'string' || !interviewee.name.trim() ||
      typeof interviewee.designation !== 'string' || !interviewee.designation.trim()
    ) {
      throw new Error('Each interviewee entry must include a name and designation.');
    }
    validatePhone(interviewee.contact_number, 'Interviewee contact number');
    if (typeof interviewee.contact_number !== 'string' || !interviewee.contact_number) {
      throw new Error('Each interviewee entry must include a contact number.');
    }
  }

  for (const establishment of rows(answers, 'A_ASSOCIATED_ESTABLISHMENTS')) {
    if (isBlank(establishment)) continue;
    const classId = selectionId(establishment.major_activity_psic_class_id);
    if (classId === null) continue;
    const classes = await manager.query(
      'SELECT id FROM psic_classes WHERE id = $1',
      [classId],
    ) as Array<{ id: number }>;
    if (!classes[0]) throw new Error('Choose a valid PSIC class for the associated establishment.');
  }
}

export async function validateSectionBAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
): Promise<void> {
  const hoursAnswer = answers.get('B_OPERATIONAL_HOURS');
  if (
    hoursAnswer !== undefined && hoursAnswer !== null && hoursAnswer !== '' &&
    (typeof hoursAnswer !== 'object' || Array.isArray(hoursAnswer))
  ) {
    throw new Error('Provide a valid working schedule.');
  }
  const monthsAnswer = answers.get('B_OPERATION_MONTHS');
  if (
    monthsAnswer !== undefined && monthsAnswer !== null && monthsAnswer !== '' &&
    (typeof monthsAnswer !== 'object' || Array.isArray(monthsAnswer))
  ) {
    throw new Error('Choose valid months of operation.');
  }
  const hours = record(hoursAnswer);
  const fields = [
    { key: 'working_days_per_week', label: 'Total working days per week' },
    { key: 'working_months_per_year', label: 'Total working months per year' },
  ] as const;
  for (const { key, label } of fields) {
    const value = hours[key];
    if (value === undefined || value === null || value === '') continue;
    const parsed = number(value);
    const { min, max } = SECTION_B_WORKING_RANGES[key];
    if (parsed === null || !Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
    }
  }

  if (
    hours.daily_hours !== undefined && hours.daily_hours !== null && hours.daily_hours !== '' &&
    number(hours.daily_hours) === null
  ) {
    throw new Error('Daily hours must be a number.');
  }

  const months = field(answers, 'B_OPERATION_MONTHS', 'operating_months');
  if (months !== undefined && months !== null && months !== '') {
    const list = Array.isArray(months) ? months : record(months).option_ids;
    if (!Array.isArray(list)) throw new Error('Choose valid months of operation.');
    const selected = list.map(number);
    if (
      selected.some((month) => month === null || !Number.isInteger(month) || month < 1 || month > 12) ||
      new Set(selected).size !== selected.length
    ) {
      throw new Error('Choose valid months of operation without duplicates.');
    }
  }

  const shift = hours.daily_shift_id;
  if (shift !== undefined && shift !== null && shift !== '') {
    const shiftId = selectionId(shift);
    if (shiftId === null || !Number.isInteger(shiftId) || shiftId < 1) {
      throw new Error('Choose a valid daily operating hours / shift option.');
    }
    const options = await manager.query(
      `SELECT lv.id
         FROM lookup_values lv
         JOIN lookup_types lt ON lt.id = lv.type_id
        WHERE lv.id = $1 AND lv.is_active = true AND lt.code = 'DAILY_HOURS'`,
      [shiftId],
    ) as Array<{ id: number }>;
    if (!options[0]) throw new Error('Choose a valid daily operating hours / shift option.');
  }
}

function selectionIds(value: unknown): number[] {
  const list = Array.isArray(value) ? value : record(value).option_ids;
  return Array.isArray(list)
    ? list.map(number).filter((id): id is number => id !== null)
    : [];
}

function isBlank(row: Record<string, unknown>): boolean {
  return Object.values(row).every((value) =>
    value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0),
  );
}

function staticCode(value: unknown, codes: readonly string[]): string | null {
  const id = selectionId(value);
  return id === null ? (typeof value === 'string' ? value : null) : codes[id - 1] ?? null;
}

const WORKFORCE_GENDERS = ['MALE', 'FEMALE', 'Other'] as const;
type WorkforceGender = typeof WORKFORCE_GENDERS[number];
const EMPLOYMENT_COUNT_FIELDS = ['regular_count', 'contract_count', 'daily_wage_count'] as const;
type EmploymentCountField = typeof EMPLOYMENT_COUNT_FIELDS[number];
type EmploymentCounts = Record<EmploymentCountField, number>;

function workforceRows(value: unknown, label: string): Array<Record<string, unknown>> {
  if (value === undefined || value === null || value === '') return [];
  if (!Array.isArray(value)) throw new Error(`Provide valid ${label} rows.`);
  return value.map((row) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Provide valid ${label} rows.`);
    }
    return row as Record<string, unknown>;
  });
}

function workforceGender(value: unknown): WorkforceGender {
  const gender = staticCode(record(value).option_id ?? value, WORKFORCE_GENDERS);
  if (gender !== 'MALE' && gender !== 'FEMALE' && gender !== 'Other') {
    throw new Error('Choose a valid gender for each workforce row.');
  }
  return gender;
}

function workforceCount(value: unknown, label: string): number {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return 0;
  const count = number(value);
  if (count === null || !Number.isInteger(count) || count < 0 || count > SECTION_D_MAX_COUNT) {
    throw new Error(`${label} must be a whole number between 0 and ${SECTION_D_MAX_COUNT}.`);
  }
  return count;
}

function addWorkforceCounts(first: number, second: number, label: string): number {
  const total = first + second;
  if (total > SECTION_D_MAX_COUNT) {
    throw new Error(`${label} cannot exceed ${SECTION_D_MAX_COUNT}.`);
  }
  return total;
}

export async function normalizeSectionDAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
): Promise<void> {
  let employment: Array<{ gender: WorkforceGender } & EmploymentCounts> | undefined;
  if (answers.has('D_EMPLOYMENT')) {
    const counts = new Map<WorkforceGender, EmploymentCounts>(
      WORKFORCE_GENDERS.map((gender) => [gender, {
        regular_count: 0, contract_count: 0, daily_wage_count: 0,
      }]),
    );
    for (const row of workforceRows(answers.get('D_EMPLOYMENT'), 'employment')) {
      if (isBlank(row)) continue;
      const gender = workforceGender(row.gender);
      const genderCounts = counts.get(gender)!;
      for (const key of EMPLOYMENT_COUNT_FIELDS) {
        genderCounts[key] = addWorkforceCounts(
          genderCounts[key],
          workforceCount(row[key], `Employment ${key.replace(/_/g, ' ')}`),
          `Employment ${key.replace(/_/g, ' ')} for ${gender}`,
        );
      }
    }
    employment = WORKFORCE_GENDERS.map((gender) => {
      const genderCounts = counts.get(gender)!;
      if (EMPLOYMENT_COUNT_FIELDS.reduce((total, key) => total + genderCounts[key], 0) > SECTION_D_MAX_COUNT) {
        throw new Error(`The employment total for ${gender} cannot exceed ${SECTION_D_MAX_COUNT}.`);
      }
      return { gender, ...genderCounts };
    });
  }

  let skills: Array<{ gender: WorkforceGender; skill_level_id: number; headcount: number }> | undefined;
  if (answers.has('D_SKILLS')) {
    const rawRows = workforceRows(answers.get('D_SKILLS'), 'skill');
    const levels = await manager.query(
      `SELECT lv.id, lv.is_active
         FROM lookup_values lv
         JOIN lookup_types lt ON lt.id = lv.type_id
        WHERE lt.code = 'SKILL_LEVEL'
        ORDER BY lv.sort_order, lv.id`,
    ) as Array<{ id: number; is_active: boolean }>;
    if (!levels.some((level) => level.is_active)) {
      throw new Error('Workforce skill levels are unavailable. Refresh the survey form and try again.');
    }
    const knownIds = new Set(levels.map((level) => level.id));
    const selectedIds = new Set<number>();
    const counts = new Map<string, number>();
    for (const row of rawRows) {
      if (isBlank(row)) continue;
      const gender = workforceGender(row.gender);
      const skillId = selectionId(row.skill_level_id);
      if (skillId === null || !Number.isInteger(skillId) || !knownIds.has(skillId)) {
        throw new Error('Choose a valid skill level for each workforce row.');
      }
      selectedIds.add(skillId);
      const key = `${skillId}:${gender}`;
      counts.set(key, addWorkforceCounts(
        counts.get(key) ?? 0,
        workforceCount(row.headcount, 'Skill headcount'),
        `Skill headcount for ${gender}`,
      ));
    }
    skills = levels
      .filter((level) => level.is_active || selectedIds.has(level.id))
      .flatMap((level) => WORKFORCE_GENDERS.map((gender) => ({
        gender,
        skill_level_id: level.id,
        headcount: counts.get(`${level.id}:${gender}`) ?? 0,
      })));
  }

  if (employment) answers.set('D_EMPLOYMENT', employment);
  if (skills) answers.set('D_SKILLS', skills);
}

export async function normalizeSectionCAnswers(
  manager: EntityManager,
  answers: SurveyAnswers,
): Promise<void> {
  const value = answers.get('C_PRODUCTS');
  if (value === undefined || value === null || value === '') return;
  if (!Array.isArray(value)) throw new Error('Provide valid product rows.');

  const normalized: Array<Record<string, unknown>> = [];
  const unitIds = new Set<number>();
  const industryId = selectionId(answers.get('A_UNIT_TYPE'));
  let industryValidated = false;

  for (const rawRow of value) {
    if (rawRow === null || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
      throw new Error('Provide valid product rows.');
    }
    const product = { ...rawRow } as Record<string, unknown>;
    if (isBlank(product)) {
      normalized.push(product);
      continue;
    }

    const kind = staticCode(product.product_kind, ['MAIN', 'SECONDARY']);
    if (kind !== 'MAIN' && kind !== 'SECONDARY') {
      throw new Error('Choose Main or Secondary product for each product row.');
    }

    let name: string;
    if (typeof product.product_name === 'string') {
      name = product.product_name.trim();
      if (!name) throw new Error('Enter a product name for each product row.');
    } else {
      const optionId = selectionId(product.product_name);
      if (optionId === null || !Number.isSafeInteger(optionId) || optionId < 0) {
        throw new Error('Choose a valid product name for each product row.');
      }
      if (!industryValidated) {
        if (industryId === null || !Number.isSafeInteger(industryId) || industryId < 1) {
          throw new Error('Select a Type of Unit before choosing a product.');
        }
        const industries = await manager.query(
          `SELECT v.id FROM lookup_values v
             JOIN lookup_types t ON t.id = v.type_id
            WHERE v.id = $1 AND t.code = 'UNIT_TYPE' AND v.is_active = true`,
          [industryId],
        ) as Array<{ id: number }>;
        if (!industries[0]) throw new Error('Select a valid Type of Unit before choosing a product.');
        industryValidated = true;
      }
      if (optionId === 0) {
        const otherText = record(product.product_name).other_text;
        if (typeof otherText !== 'string' || !otherText.trim()) {
          throw new Error('Specify the other product name.');
        }
        name = otherText.trim();
      } else {
        const options = await manager.query(
          `SELECT product_name FROM industry_product_options
            WHERE id = $1 AND unit_type_id = $2 AND product_kind = $3 AND is_active = true`,
          [optionId, industryId, kind],
        ) as Array<{ product_name: string }>;
        if (!options[0]) {
          throw new Error('Choose a product belonging to the selected Type of Unit and product kind.');
        }
        name = options[0].product_name;
      }
    }

    for (const key of ['daily_output_unit_id', 'annual_production_unit_id', 'unit_of_measurement_id']) {
      const unit = product[key];
      if (unit === undefined || unit === null || unit === '') continue;
      const unitId = selectionId(unit);
      if (unitId === null || !Number.isSafeInteger(unitId) || unitId < 1) {
        throw new Error('Choose a valid product measurement unit.');
      }
      unitIds.add(unitId);
    }

    if (kind === 'SECONDARY') {
      delete product.transformation_stage_ids;
      delete product.revenue_share_pct;
      delete product.hs_code_id;
      delete product.hs_code_text;
    }
    normalized.push({ ...product, product_kind: kind, product_name: name });
  }

  if (unitIds.size) {
    await validateMeasurementUnitIds(manager, unitIds, 'Choose a valid product measurement unit.');
  }

  answers.set('C_PRODUCTS', normalized);
}

async function validateMeasurementUnitIds(manager: EntityManager, ids: Set<number>, error: string): Promise<void> {
  const units = await manager.query(
    'SELECT id FROM measurement_units WHERE id = ANY($1::int[])',
    [[...ids]],
  ) as Array<{ id: number }>;
  if (units.length !== ids.size) throw new Error(error);
}

export async function validateMajorInputUnits(manager: EntityManager, answers: SurveyAnswers): Promise<void> {
  const value = answers.get('E_MAJOR_INPUTS');
  if (value === undefined || value === null || value === '') return;
  if (!Array.isArray(value)) throw new Error('Provide valid major input rows.');
  const ids = new Set<number>();
  const error = 'Choose a valid measurement unit for each major input.';
  for (const row of value) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('Provide valid major input rows.');
    }
    const unit = (row as Record<string, unknown>).unit_id;
    if (unit === undefined || unit === null || unit === '') continue;
    const id = selectionId(unit);
    if (id === null || !Number.isSafeInteger(id) || id < 1) throw new Error(error);
    ids.add(id);
  }
  if (ids.size) await validateMeasurementUnitIds(manager, ids, error);
}

interface ClassificationValue {
  id: number | null;
  text: string | null;
}

async function resolvePsicSelection(
  manager: EntityManager,
  value: Record<string, unknown>,
): Promise<{ division: ClassificationValue; group: ClassificationValue; class: ClassificationValue }> {
  const divisionId = selectionId(value.psic_division_id);
  const groupId = selectionId(value.psic_group_id);
  const classId = selectionId(value.psic_class_id);
  const empty = { id: null, text: null };
  const textFor = (key: string): string | null => {
    const explicitText = value[`${key.replace(/_id$/, '')}_text`];
    if (typeof explicitText === 'string' && explicitText.trim()) return explicitText.trim();
    const rawValue = value[key];
    return selectionId(rawValue) === null && typeof rawValue === 'string' && rawValue.trim()
      ? rawValue.trim()
      : null;
  };
  if (divisionId === null && groupId === null && classId === null) {
    return {
      division: { ...empty, text: textFor('psic_division_id') },
      group: { ...empty, text: textFor('psic_group_id') },
      class: { ...empty, text: textFor('psic_class_id') },
    };
  }

  const [selected] = await manager.query(
    `SELECT d.id AS division_id, d.code AS division_code, d.name AS division_name,
            g.id AS group_id, g.code AS group_code, g.name AS group_name,
            c.id AS class_id, c.code AS class_code, c.name AS class_name
       FROM (SELECT $1::integer AS division_id, $2::integer AS group_id, $3::integer AS class_id) requested
       LEFT JOIN psic_divisions d ON d.id = requested.division_id
       LEFT JOIN psic_groups g ON g.id = requested.group_id AND g.division_id = d.id
       LEFT JOIN psic_classes c ON c.id = requested.class_id AND c.group_id = g.id`,
    [divisionId, groupId, classId],
  ) as Array<{
    division_id: number | null;
    division_code: string | null;
    division_name: string | null;
    group_id: number | null;
    group_code: string | null;
    group_name: string | null;
    class_id: number | null;
    class_code: string | null;
    class_name: string | null;
  }>;

  if (
    (divisionId !== null && selected.division_id !== divisionId) ||
    (groupId !== null && selected.group_id !== groupId) ||
    (classId !== null && selected.class_id !== classId)
  ) {
    throw new Error('The selected PSIC division, group, and class do not form a valid hierarchy.');
  }

  const valueFor = (
    id: number | null,
    code: string | null,
    name: string | null,
    manualText: string | null,
  ): ClassificationValue => ({
    id,
    text: id !== null && code && name ? `${code} - ${name}` : manualText,
  });
  return {
    division: valueFor(selected.division_id, selected.division_code, selected.division_name, textFor('psic_division_id')),
    group: valueFor(selected.group_id, selected.group_code, selected.group_name, textFor('psic_group_id')),
    class: valueFor(selected.class_id, selected.class_code, selected.class_name, textFor('psic_class_id')),
  };
}

async function resolveHsCode(
  manager: EntityManager,
  value: unknown,
): Promise<ClassificationValue> {
  const id = selectionId(value);
  if (id === null) {
    return {
      id: null,
      text: typeof value === 'string' && value.trim() ? value.trim() : null,
    };
  }

  const [selected] = await manager.query(
    `SELECT id, code, description FROM hs_codes WHERE id = $1`,
    [id],
  ) as Array<{ id: number; code: string; description: string }>;
  if (!selected) throw new Error('The selected HS code is not present in the reference list.');
  return { id: selected.id, text: `${selected.code} - ${selected.description}` };
}

export async function updateExistingUnitCapitalInvestment(
  manager: EntityManager,
  unitId: string,
  answers: SurveyAnswers,
): Promise<void> {
  const investment = record(answers.get('A_TOTAL_CAPITAL_INVESTMENT'));
  const amount = investment.total_capital_investment;
  const unitIdValue = selectionId(investment.capital_investment_unit_id);
  if (amount === undefined || amount === null || amount === '' || unitIdValue === null) return;

  const updated = await manager.query(
    `UPDATE industrial_units
        SET total_capital_investment = $2,
            capital_investment_unit_id = $3
      WHERE id = $1
      RETURNING id`,
    [unitId, number(amount), unitIdValue],
  ) as Array<{ id: string }>;
  if (!updated[0]) throw new Error('The existing establishment could not be updated with its capital investment.');
}

export async function createIndustrialUnit(
  manager: EntityManager,
  userId: string,
  answers: SurveyAnswers,
  unitName: string,
  gps: { lat: number | null; lng: number | null; accuracy: number | null },
  legacyLocationFallback: boolean,
): Promise<string> {
  const location = record(answers.get('A_LOCATION'));
  const legacyLocation = 'Not provided by the previous form version';
  const districtId = number(location.district_id);
  const tehsilId = number(location.tehsil_id);
  let geography = {
    province_id: null as number | null,
    province_name: '',
    division_id: null as number | null,
    division_name: '',
    district_id: null as number | null,
    district_name: '',
    tehsil_id: null as number | null,
    tehsil_name: '',
  };

  if (districtId !== null || tehsilId !== null) {
    if (districtId === null || tehsilId === null) {
      throw new Error('Select both a district and a tehsil before syncing this survey.');
    }
    const selectedLocations = await manager.query(
      `SELECT p.id AS province_id, p.name AS province_name,
              dv.id AS division_id, dv.name AS division_name,
              d.id AS district_id, d.name AS district_name,
              t.id AS tehsil_id, t.name AS tehsil_name
         FROM districts d
         JOIN divisions dv ON dv.id = d.division_id
         JOIN provinces p ON p.id = dv.province_id
         JOIN tehsils t ON t.id = $2 AND t.district_id = d.id
        WHERE d.id = $1 AND lower(p.name) = 'punjab'`,
      [districtId, tehsilId],
    ) as Array<typeof geography>;
    const selectedLocation = selectedLocations[0];
    if (!selectedLocation) {
      throw new Error('The selected tehsil does not belong to the selected Punjab district.');
    }
    geography = selectedLocation;
  } else {
    const legacyNames = ['province_name', 'division_name', 'district_name', 'tehsil_name']
      .map((key) => typeof location[key] === 'string' ? (location[key] as string).trim() : '');
    if (legacyLocationFallback && legacyNames.every((name) => !name)) {
      legacyNames.fill(legacyLocation);
    }
    if (legacyNames.some((name) => !name)) {
      throw new Error('Select a district and tehsil before syncing this survey.');
    }
    geography = {
      ...geography,
      province_name: legacyNames[0],
      division_name: legacyNames[1],
      district_name: legacyNames[2],
      tehsil_name: legacyNames[3],
    };
  }

  if (!unitName.trim()) {
    throw new Error('The establishment name is required before syncing this survey.');
  }

  const contact = record(answers.get('A_CONTACT'));
  const psic = { ...record(answers.get('A_PSIC')) };
  const unitType = answers.get('A_UNIT_TYPE');
  const unitTypeId = selectionId(unitType);
  if (unitType !== undefined) {
    const [industry] = await manager.query(
      `SELECT v.requires_text FROM lookup_values v JOIN lookup_types t ON t.id = v.type_id
        WHERE v.id = $1 AND t.code = 'UNIT_TYPE' AND v.is_active = true`,
      [unitTypeId],
    );
    if (!industry) throw new Error('Select a valid Type of Unit.');
    if (industry.requires_text && !(typeof record(unitType).other_text === 'string' && String(record(unitType).other_text).trim())) {
      throw new Error('Specify the other Type of Unit.');
    }
    const [classification] = await manager.query(
      `SELECT c.id, c.group_id, g.division_id
         FROM unit_type_psic_classes m
         JOIN psic_classes c ON c.id = m.psic_class_id
         JOIN psic_groups g ON g.id = c.group_id
        WHERE m.unit_type_id = $1 AND c.id = $2`,
      [unitTypeId, selectionId(psic.psic_class_id)],
    );
    if (!classification) throw new Error('Select a PSIC class belonging to the chosen Type of Unit.');
    psic.psic_group_id = classification.group_id;
    psic.psic_division_id = classification.division_id;
  }
  const selectedPsic = await resolvePsicSelection(manager, psic);
  const area = record(answers.get('A_ESTABLISHMENT_AREA'));
  const investment = record(answers.get('A_TOTAL_CAPITAL_INVESTMENT'));
  const ownership = field(answers, 'A_OWNERSHIP', 'ownership_type_id');
  const legalStructure = field(answers, 'A_LEGAL_STRUCTURE', 'legal_structure_id');
  const zoneType = field(answers, 'A_ZONE_TYPE', 'zone_type_id');
  const gpsLat = gps.lat;
  const gpsLng = gps.lng;

  const inserted = await manager.query(
    `INSERT INTO industrial_units (
       name, establishment_year, location, gps_accuracy_m, address,
       province_id, province_name, division_id, division_name,
       district_id, district_name, tehsil_id, tehsil_name,
       contact_name, contact_phone, contact_email, website,
       psic_division_id, psic_division_text, psic_group_id, psic_group_text,
       psic_class_id, psic_class_text,
       zone_type_id, zone_type_other_text,
       ownership_type_id, ownership_other_text,
       legal_structure_id, legal_structure_other_text,
       has_parent_company, total_area_value, total_area_unit_id,
       industrial_estate_id, industrial_estate_text,
       industrial_cluster_id, industrial_cluster_text, approval_status, created_by,
       total_capital_investment, capital_investment_unit_id
     ) VALUES (
       $1, $2,
       CASE WHEN $3::numeric IS NULL OR $4::numeric IS NULL THEN NULL
            ELSE ST_SetSRID(ST_MakePoint($4, $3), 4326) END,
       $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
       $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
       $31, $32, $33, $34, $35, $36, $37, 'PENDING', $38, $39, $40
     ) RETURNING id`,
    [
      unitName.trim(),
      number(field(answers, 'A_ESTABLISHMENT_YEAR', 'establishment_year')),
      gpsLat,
      gpsLng,
      gps.accuracy,
      field(answers, 'A_ADDRESS', 'address') ?? null,
      geography.province_id,
      geography.province_name,
      geography.division_id,
      geography.division_name,
      geography.district_id,
      geography.district_name,
      geography.tehsil_id,
      geography.tehsil_name,
      contact.contact_name ?? null,
      contact.contact_phone ?? null,
      contact.contact_email ?? null,
      contact.website ?? null,
      selectedPsic.division.id,
      selectedPsic.division.text,
      selectedPsic.group.id,
      selectedPsic.group.text,
      selectedPsic.class.id,
      selectedPsic.class.text,
      selectionId(zoneType),
      record(zoneType).other_text ?? null,
      selectionId(ownership),
      record(ownership).other_text ?? null,
      selectionId(legalStructure),
      record(legalStructure).other_text ?? null,
      record(answers.get('A_PARENT_COMPANY')).has_parent_company ?? null,
      number(area.total_area_value),
      selectionId(area.total_area_unit_id),
      null,
      area.industrial_estate_text ?? null,
      null,
      area.industrial_cluster_text ?? null,
      userId,
      number(investment.total_capital_investment),
      selectionId(investment.capital_investment_unit_id),
    ],
  ) as Array<{ id: string }>;
  const unitId = inserted[0]?.id;
  if (!unitId) throw new Error('The industrial unit could not be saved.');

  if (unitType !== undefined) {
    await manager.query(
      'UPDATE industrial_units SET unit_type_id = $2, unit_type_other_text = $3 WHERE id = $1',
      [unitId, unitTypeId, typeof record(unitType).other_text === 'string' ? String(record(unitType).other_text).trim() || null : null],
    );
  }

  const hasParent = record(answers.get('A_PARENT_COMPANY')).has_parent_company === true;
  if (hasParent) {
    const parent = record(answers.get('A_PARENT_COMPANY_DETAILS'));
    if (typeof parent.company_name !== 'string' || !parent.company_name.trim()) {
      throw new Error('Enter the parent company name or change the parent-company answer to No.');
    }
    await manager.query(
      `INSERT INTO unit_parent_companies (unit_id, company_name, company_address, phone, cell, email)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        unitId,
        parent.company_name.trim(),
        parent.company_address ?? null,
        parent.phone ?? null,
        parent.cell ?? null,
        parent.email ?? null,
      ],
    );
  }

  for (const establishment of rows(answers, 'A_ASSOCIATED_ESTABLISHMENTS')) {
    if (isBlank(establishment)) continue;
    if (typeof establishment.name !== 'string' || !establishment.name.trim()) {
      throw new Error('Enter a name for each associated establishment row.');
    }
    const majorActivityClassId = selectionId(establishment.major_activity_psic_class_id);
    await manager.query(
      `INSERT INTO unit_associated_establishments
         (unit_id, name, address, major_activity_psic_class_id, major_activity_text)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        unitId,
        establishment.name.trim(),
        establishment.address ?? null,
        majorActivityClassId,
        establishment.major_activity_text ?? null,
      ],
    );
  }
  return unitId;
}

export async function saveNormalizedSurveyAnswers(
  manager: EntityManager,
  responseId: string,
  answers: SurveyAnswers,
  questions: SubmittedQuestion[],
  isPermanentlyClosed = false,
): Promise<void> {
  for (const interviewee of rows(answers, 'A_INTERVIEWEES')) {
    if (isBlank(interviewee)) continue;
    if (
      typeof interviewee.name !== 'string' || !interviewee.name.trim() ||
      typeof interviewee.designation !== 'string' || !interviewee.designation.trim() ||
      typeof interviewee.contact_number !== 'string' || !interviewee.contact_number
    ) {
      throw new Error('Each interviewee entry must include a name, designation, and contact number.');
    }
    await manager.query(
      `INSERT INTO response_interviewees (response_id, name, designation, contact_number)
       VALUES ($1, $2, $3, $4)`,
      [
        responseId,
        interviewee.name.trim(),
        interviewee.designation.trim(),
        interviewee.contact_number,
      ],
    );
  }

  const operationStatus = selectionId(answers.get('B_OPERATION_STATUS'));
  const hasOperatingStatus = operationStatus !== null && !isPermanentlyClosed;
  const operatingMonths = hasOperatingStatus
    ? selectionIds(field(answers, 'B_OPERATION_MONTHS', 'operating_months'))
    : [];
  const dailyHours = hasOperatingStatus
    ? number(field(answers, 'B_OPERATIONAL_HOURS', 'daily_hours'))
    : null;
  const daysPerWeek = hasOperatingStatus
    ? number(field(answers, 'B_OPERATIONAL_HOURS', 'working_days_per_week'))
    : null;
  const monthsPerYear = hasOperatingStatus
    ? number(field(answers, 'B_OPERATIONAL_HOURS', 'working_months_per_year'))
    : null;
  await manager.query(
    `INSERT INTO sec_b_operations
       (response_id, operating_months, operation_status_id, closure_reason, daily_shift_id, daily_hours,
        working_days_per_week, working_months_per_year)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      responseId,
      operatingMonths.length ? operatingMonths : null,
      operationStatus,
      isPermanentlyClosed ? field(answers, 'B_CLOSURE_REASON', 'closure_reason') ?? null : null,
      hasOperatingStatus ? selectionId(field(answers, 'B_OPERATIONAL_HOURS', 'daily_shift_id')) : null,
      dailyHours,
      hasOperatingStatus ? daysPerWeek ?? SECTION_B_DEFAULT_WORKING_DAYS : null,
      monthsPerYear,
    ],
  );

  for (const product of rows(answers, 'C_PRODUCTS')) {
    if (isBlank(product)) continue;
    if (typeof product.product_name !== 'string' || !product.product_name.trim()) {
      throw new Error('Enter a product name for each product row.');
    }
    const kind = staticCode(product.product_kind, ['MAIN', 'SECONDARY']);
    if (!kind) throw new Error('Choose Main or Secondary product for each product row.');
    const selectedHsCode = kind === 'MAIN'
      ? await resolveHsCode(manager, product.hs_code_id)
      : { id: null, text: null };
    const result = await manager.query(
      `INSERT INTO products
         (response_id, product_kind, product_name, daily_avg_output, daily_output_unit_id,
          annual_production, annual_production_unit_id, installed_capacity,
          installed_capacity_period, unit_of_measurement_id, revenue_share_pct, hs_code_id,
          hs_code_text, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        responseId,
        kind,
        product.product_name.trim(),
        number(product.daily_avg_output),
        selectionId(product.daily_output_unit_id),
        number(product.annual_production),
        selectionId(product.annual_production_unit_id),
        number(product.installed_capacity),
        staticCode(product.installed_capacity_period, ['PER_DAY', 'PER_MONTH']),
        selectionId(product.unit_of_measurement_id),
        kind === 'MAIN' ? number(product.revenue_share_pct) : null,
        selectedHsCode.id,
        selectedHsCode.text,
        number(product.sort_order) ?? 0,
      ],
    ) as Array<{ id: number }>;
    const productId = result[0]?.id;
    if (kind === 'MAIN' && productId) {
      for (const stageId of selectionIds(product.transformation_stage_ids)) {
        await manager.query(
          `INSERT INTO product_transformation_stages (product_id, stage_id) VALUES ($1, $2)`,
          [productId, stageId],
        );
      }
    }
  }

  for (const employee of rows(answers, 'D_EMPLOYMENT')) {
    if (isBlank(employee)) continue;
    const gender = workforceGender(employee.gender);
    await manager.query(
      `INSERT INTO workforce_employment
         (response_id, gender, regular_count, contract_count, daily_wage_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        responseId,
        gender,
        workforceCount(employee.regular_count, 'Regular employees'),
        workforceCount(employee.contract_count, 'Contract employees'),
        workforceCount(employee.daily_wage_count, 'Daily-wage employees'),
      ],
    );
  }

  for (const skill of rows(answers, 'D_SKILLS')) {
    if (isBlank(skill)) continue;
    const gender = workforceGender(skill.gender);
    const skillLevelId = selectionId(skill.skill_level_id);
    if (skillLevelId === null || !Number.isInteger(skillLevelId) || skillLevelId < 1) {
      throw new Error('Choose a valid skill level for each workforce row.');
    }
    await manager.query(
      `INSERT INTO workforce_skills (response_id, gender, skill_level_id, headcount)
       VALUES ($1, $2, $3, $4)`,
      [responseId, gender, skillLevelId, workforceCount(skill.headcount, 'Skill headcount')],
    );
  }

  await manager.query(
    `INSERT INTO sec_e_supply_chain
       (response_id, active_suppliers_id, supplier_dependency_id, procurement_mode_id,
        had_supply_disruption, ontime_delivery_id, product_acceptance_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      responseId,
      answerOptionId(answers, 'E_ACTIVE_SUPPLIERS'),
      answerOptionId(answers, 'E_SUPPLIER_DEPENDENCY', 'supplier_dependency_id'),
      answerOptionId(answers, 'E_PROCUREMENT_MODE', 'procurement_mode_id'),
      field(answers, 'E_SUPPLY_DISRUPTION', 'had_supply_disruption') ?? null,
      answerOptionId(answers, 'E_ON_TIME_DELIVERY', 'ontime_delivery_id'),
      answerOptionId(answers, 'E_PRODUCT_ACCEPTANCE', 'product_acceptance_id'),
    ],
  );

  for (const input of rows(answers, 'E_MAJOR_INPUTS')) {
    if (isBlank(input)) continue;
    if (typeof input.input_name !== 'string' || !input.input_name.trim()) {
      throw new Error('Enter a name for each major input row.');
    }
    const selectedHsCode = await resolveHsCode(manager, input.hs_code_id);
    await manager.query(
      `INSERT INTO major_inputs
         (response_id, input_name, unit_id, cost_share_pct, hs_code_id, hs_code_text, transformation_stage_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        responseId,
        input.input_name.trim(),
        selectionId(input.unit_id),
        number(input.cost_share_pct),
        selectedHsCode.id,
        selectedHsCode.text,
        selectionId(input.transformation_stage_id),
      ],
    );
  }

  await manager.query(
    `INSERT INTO sec_f_market
       (response_id, global_supply_chain_id, active_buyers_id, buyer_availability_id,
        sales_mode_id, payment_terms_id, had_demand_gap, subcontract_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      responseId,
      answerOptionId(answers, 'F_GLOBAL_SUPPLY_CHAIN', 'global_supply_chain_id'),
      answerOptionId(answers, 'F_ACTIVE_BUYERS'),
      answerOptionId(answers, 'F_BUYER_AVAILABILITY', 'buyer_availability_id'),
      answerOptionId(answers, 'F_SALES_MODE', 'sales_mode_id'),
      answerOptionId(answers, 'F_PAYMENT_TERMS', 'payment_terms_id'),
      field(answers, 'F_DEMAND_GAP', 'had_demand_gap') ?? null,
      answerOptionId(answers, 'F_SUBCONTRACT', 'subcontract_id'),
    ],
  );

  await manager.query(
    `INSERT INTO sec_g_technology
       (response_id, plant_processing_capacity, utilization_rate_id, integration_level_id,
        machine_source_id, spare_parts_source_id, breakdown_frequency_id, maintenance_approach_id,
        production_planning_id, inventory_system_id, rnd_expenditure_id, has_innovation_plan,
        machinery_age_legacy_counts)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)`,
    [
      responseId,
      field(answers, 'G_PLANT_CAPACITY', 'plant_processing_capacity') ?? null,
      answerOptionId(answers, 'G_UTILIZATION_RATE', 'utilization_rate_id'),
      answerOptionId(answers, 'G_INTEGRATION_LEVEL', 'integration_level_id'),
      answerOptionId(answers, 'G_MACHINE_SOURCE', 'machine_source_id'),
      answerOptionId(answers, 'G_SPARE_PARTS_SOURCE', 'spare_parts_source_id'),
      answerOptionId(answers, 'G_BREAKDOWN_FREQUENCY', 'breakdown_frequency_id'),
      answerOptionId(answers, 'G_MAINTENANCE_APPROACH', 'maintenance_approach_id'),
      answerOptionId(answers, 'G_PRODUCTION_PLANNING', 'production_planning_id'),
      answerOptionId(answers, 'G_INVENTORY_SYSTEM', 'inventory_system_id'),
      answerOptionId(answers, 'G_RND_EXPENDITURE', 'rnd_expenditure_id'),
      typeof answers.get('G_INNOVATION_GATE') === 'boolean' ? answers.get('G_INNOVATION_GATE') : null,
      answers.has('G_MACHINERY_AGE_LEGACY_COUNTS')
        ? JSON.stringify(answers.get('G_MACHINERY_AGE_LEGACY_COUNTS'))
        : null,
    ],
  );

  for (const machine of rows(answers, 'G_CRITICAL_MACHINES')) {
    if (isBlank(machine)) continue;
    if (typeof machine.machine_name !== 'string' || !machine.machine_name.trim()) {
      throw new Error('Enter a machine name for each critical-machine row.');
    }
    await manager.query(
      `INSERT INTO critical_machines (response_id, machine_name, quantity, specification, machine_option_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [responseId, machine.machine_name.trim(), number(machine.quantity), machine.specification ?? null,
        number(machine.machine_option_id)],
    );
  }

  for (const [option, entry] of Object.entries(record(answers.get('G_MACHINERY_AGE')))) {
    const ageBracketId = number(option);
    const share = number(record(entry).percent ?? entry);
    if (ageBracketId === null || share === null) throw new Error('Machinery-age shares were not validated.');
    await manager.query(
      `INSERT INTO machinery_age_profile (response_id, age_bracket_id, machine_count, share_pct)
       VALUES ($1, $2, NULL, $3)`,
      [responseId, ageBracketId, share],
    );
  }

  for (const vessel of rows(answers, 'G_BOILERS')) {
    if (typeof vessel.vessel_type !== 'string' || !vessel.vessel_type.trim() ||
        (vessel.record_kind !== 'BOILER' && vessel.record_kind !== 'VESSEL')) {
      throw new Error('Boiler and pressure-vessel rows were not validated.');
    }
    await manager.query(
      `INSERT INTO boilers_pressure_vessels
         (response_id, vessel_type, record_kind, equipment_number, type_id, type_other_text,
          working_pressure_raw, pressure_unit_id, pressure_unit_other_text, capacity_litres,
          heating_surface_raw, heating_surface_unit_id, heating_surface_unit_other_text,
          pressure_conversion_factor, working_pressure_bar, heating_conversion_factor,
          heating_surface_m2, legacy_data, conversion_requires_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
               $14, $7::numeric * $14::numeric, $15, $11::numeric * $15::numeric, $16::jsonb, $17)`,
      [
        responseId, vessel.vessel_type.trim(), vessel.record_kind, vessel.equipment_number,
        vessel.type_id, vessel.type_other_text, vessel.working_pressure_raw,
        vessel.pressure_unit_id, vessel.pressure_unit_other_text, vessel.capacity_litres,
        vessel.heating_surface_raw, vessel.heating_surface_unit_id, vessel.heating_surface_unit_other_text,
        vessel.pressure_factor, vessel.heating_factor,
        vessel.legacy_data ? JSON.stringify(vessel.legacy_data) : null,
        vessel.pressure_factor === null || (vessel.record_kind === 'BOILER' && vessel.heating_factor === null),
      ],
    );
  }

  for (const equipment of rows(answers, 'G_WEIGHTS_MEASURES')) {
    if (typeof equipment.equipment_type !== 'string' || !equipment.equipment_type.trim() ||
        equipment.equipment_type_id === undefined) {
      throw new Error('Weights-and-measures rows were not validated.');
    }
    await manager.query(
      `INSERT INTO weights_measures_equipment
         (response_id, equipment_type, quantity, equipment_type_id, equipment_other_text,
          capacity_value_raw, capacity_unit_id, capacity_unit_other_text, capacity_value_converted,
          capacity_unit_converted, conversion_factor_used, legacy_data, conversion_requires_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $6::numeric * $9::numeric, $10, $9, $11::jsonb, $12)`,
      [
        responseId, equipment.equipment_type.trim(), equipment.number_of_instruments,
        equipment.equipment_type_id, equipment.equipment_other_text, equipment.capacity_value_raw,
        equipment.equipment_unit_id, equipment.equipment_unit_other_text, equipment.conversion_factor,
        equipment.converted_unit, equipment.legacy_data ? JSON.stringify(equipment.legacy_data) : null,
        equipment.conversion_factor === null,
      ],
    );
  }

  const energyCapacity = record(answers.get('H_CAPTIVE_EXPORT_CAPACITY'));
  const generationRows = rows(answers, 'H_ENERGY_GENERATION');
  const captiveCapacityKw = generationRows.reduce(
    (total, generation) => total + (number(generation.capacity_kw) ?? 0),
    0,
  );
  await manager.query(
    `INSERT INTO sec_h_environment
       (response_id, captive_capacity_kw, export_capacity_kw,
        has_water_waste_management, has_solid_waste_generation, has_green_practices)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      responseId,
      Math.round(captiveCapacityKw * 100) / 100,
      number(energyCapacity.export_capacity_kw),
      answers.get('H_WATER_WASTE_GATE') ?? null,
      answers.get('H_SOLID_WASTE_GATE') ?? null,
      answers.get('H_GREEN_PRACTICES_GATE') ?? null,
    ],
  );

  for (const consumption of rows(answers, 'H_ENERGY_CONSUMPTION')) {
    if (isBlank(consumption)) continue;
    const sourceId = selectionId(consumption.energy_source_id);
    if (sourceId === null) throw new Error('Choose an energy source for each consumption row.');
    await manager.query(
      `INSERT INTO energy_consumption
         (response_id, energy_source_id, other_text, quantity_per_month, unit_id, share_pct)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        responseId,
        sourceId,
        consumption.other_text ?? null,
        number(consumption.quantity_per_month),
        selectionId(consumption.unit_id),
        number(consumption.share_pct),
      ],
    );
  }

  for (const generation of rows(answers, 'H_ENERGY_GENERATION')) {
    if (isBlank(generation)) continue;
    const sourceId = selectionId(generation.power_source_id);
    if (sourceId === null) throw new Error('Choose a power source for each generation row.');
    await manager.query(
      `INSERT INTO energy_generation (response_id, power_source_id, other_text, capacity_kw, export_kw)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        responseId,
        sourceId,
        generation.other_text ?? null,
        number(generation.capacity_kw),
        number(generation.export_kw),
      ],
    );
  }

  for (const waste of rows(answers, 'H_SOLID_WASTE')) {
    if (isBlank(waste)) continue;
    const wasteTypeId = selectionId(waste.waste_type_id);
    if (wasteTypeId === null) throw new Error('Choose a waste type for each waste row.');
    const stream = await manager.query(
      `INSERT INTO solid_waste_streams (response_id, waste_type_id, is_generated)
       VALUES ($1, $2, $3) RETURNING id`,
      [responseId, wasteTypeId, waste.is_generated === true],
    ) as Array<{ id: number }>;
    const streamId = stream[0]?.id;
    for (const disposalId of selectionIds(waste.disposal_method_ids)) {
        const disposalText = record(record(waste.disposal_method_ids).other_text)[String(disposalId)];
        await manager.query(
          `INSERT INTO solid_waste_disposals (stream_id, disposal_method_id, other_text)
           VALUES ($1, $2, $3)`,
          [
            streamId,
            disposalId,
            typeof disposalText === 'string' && disposalText.trim() ? disposalText.trim() : null,
          ],
        );
    }
  }

  await manager.query(
    `INSERT INTO sec_i_compliance (response_id, safety_trained_workers) VALUES ($1, $2)`,
    [responseId, number(field(answers, 'I_SAFETY_TRAINING', 'safety_trained_workers'))],
  );

  const reinvestmentArea = record(answers.get('J_REINVESTMENT_AREA'));
  await manager.query(
    `INSERT INTO sec_j_strategy
       (response_id, reinvestment_level_id, reinvestment_area_id, reinvestment_area_other, upscaling_time_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      responseId,
      answerOptionId(answers, 'J_REINVESTMENT_LEVEL', 'reinvestment_level_id'),
      selectionId(reinvestmentArea.reinvestment_area_id),
      reinvestmentArea.reinvestment_area_other ?? null,
      answerOptionId(answers, 'J_UPSCALING_TIME', 'upscaling_time_id'),
    ],
  );

  const futurePlan = field(answers, 'K_FUTURE_PLAN', 'has_future_plan');
  await manager.query(
    `INSERT INTO sec_k_future (response_id, has_future_plan, most_critical_barrier)
     VALUES ($1, $2, $3)`,
    [
      responseId,
      typeof futurePlan === 'boolean' ? futurePlan : null,
      field(answers, 'K_MOST_CRITICAL_BARRIER', 'most_critical_barrier') ?? null,
    ],
  );

  for (const collaboration of rows(answers, 'K_COLLABORATIONS')) {
    if (isBlank(collaboration)) continue;
    const collaboratorId = selectionId(collaboration.collaborator_type_id);
    if (collaboratorId === null) throw new Error('Choose a collaborator for each collaboration row.');
    const inserted = await manager.query(
      `INSERT INTO collaborations (response_id, collaborator_type_id)
       VALUES ($1, $2) RETURNING id`,
      [responseId, collaboratorId],
    ) as Array<{ id: number }>;
    for (const purposeId of selectionIds(collaboration.purpose_ids)) {
      await manager.query(
        `INSERT INTO collaboration_purposes (collaboration_id, purpose_id) VALUES ($1, $2)`,
        [inserted[0].id, purposeId],
      );
    }
  }

  for (const question of questions) {
    const value = answers.get(question.question_code);
    if (value === undefined || value === null) continue;
    if (question.answer_type === 'MULTI_CHOICE') {
      const choices = selectionIds(value);
      const selected = Array.isArray(value) ? { ids: choices, other_text: {} } : {
        ids: choices,
        other_text: record(record(value).other_text),
      };
      for (const choiceId of selected.ids) {
        await manager.query(
          `INSERT INTO response_choices (response_id, question_id, option_id, other_text)
           VALUES ($1, $2, $3, $4)`,
          [
            responseId,
            question.id,
            choiceId,
            typeof selected.other_text[String(choiceId)] === 'string'
              ? selected.other_text[String(choiceId)]
              : null,
          ],
        );
      }
    } else if (question.answer_type === 'SHARE_PERCENT') {
      for (const [option, percent] of Object.entries(record(value))) {
        const optionId = number(option);
        const share = record(percent);
        const percentValue = number(share.percent ?? percent);
        if (optionId === null || percentValue === null) continue;
        await manager.query(
          `INSERT INTO response_shares (response_id, question_id, option_id, percent_value, other_text)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            responseId,
            question.id,
            optionId,
            percentValue,
            typeof share.other_text === 'string' && share.other_text.trim()
              ? share.other_text.trim()
              : null,
          ],
        );
      }
    } else if (question.answer_type === 'MATRIX') {
      for (const [item, answer] of Object.entries(record(value))) {
        const itemId = number(item);
        if (itemId === null) continue;
        const matrixAnswer = record(answer);
        const choiceValueId = selectionId(matrixAnswer.choice_value_id);
        const rating = number(matrixAnswer.rating);
        const otherText = typeof matrixAnswer.other_text === 'string' && matrixAnswer.other_text.trim()
          ? matrixAnswer.other_text.trim()
          : null;
        if (choiceValueId === null && rating === null && otherText === null) continue;
        await manager.query(
          `INSERT INTO response_matrix_answers
             (response_id, item_id, choice_value_id, rating, other_text)
           VALUES ($1, $2, $3, $4, $5)`,
          [responseId, itemId, choiceValueId, rating, otherText],
        );
      }
    }
  }

}
