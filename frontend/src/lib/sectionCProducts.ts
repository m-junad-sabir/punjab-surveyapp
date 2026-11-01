import type { QuestionOption } from '../types';

type ProductKind = 'MAIN' | 'SECONDARY';

const MAIN_ONLY_FIELDS = [
  'transformation_stage_ids',
  'revenue_share_pct',
  'hs_code_id',
  'hs_code_text',
] as const;
const PRODUCT_UNIT_FIELDS = [
  'daily_output_unit_id',
  'annual_production_unit_id',
  'unit_of_measurement_id',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionId(value: unknown): number | null {
  const raw = isRecord(value) ? value.option_id : value;
  const id = typeof raw === 'number'
    ? raw
    : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
  return Number.isSafeInteger(id) ? id : null;
}

export function productKind(value: unknown): ProductKind | null {
  if (value === 'MAIN' || optionId(value) === 1) return 'MAIN';
  if (value === 'SECONDARY' || optionId(value) === 2) return 'SECONDARY';
  return null;
}

export function isProductFieldVisible(questionCode: string, row: unknown, key: string): boolean {
  return questionCode !== 'C_PRODUCTS' || !isRecord(row) ||
    productKind(row.product_kind) !== 'SECONDARY' ||
    !MAIN_ONLY_FIELDS.some((field) => field === key);
}

export function clearSecondaryProductFields(row: Record<string, unknown>): Record<string, unknown> {
  if (productKind(row.product_kind) !== 'SECONDARY' ||
      !MAIN_ONLY_FIELDS.some((key) => Object.prototype.hasOwnProperty.call(row, key))) {
    return row;
  }
  const cleaned = { ...row };
  for (const key of MAIN_ONLY_FIELDS) delete cleaned[key];
  return cleaned;
}

export function changeProductKind(
  row: Record<string, unknown>,
  next: unknown,
): Record<string, unknown> {
  const previousKind = productKind(row.product_kind);
  const nextKind = productKind(next);
  const updated: Record<string, unknown> = { ...row, product_kind: next };
  if (previousKind !== nextKind &&
      (previousKind !== null || typeof row.product_name !== 'string')) {
    delete updated.product_name;
  }
  if (nextKind !== 'MAIN') {
    for (const key of MAIN_ONLY_FIELDS) delete updated[key];
  }
  return updated;
}

export function clearProductNames(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((row) => {
    if (!isRecord(row) || !Object.prototype.hasOwnProperty.call(row, 'product_name')) return row;
    const updated = { ...row };
    delete updated.product_name;
    return updated;
  });
}

export function productOptionsForRow(
  options: QuestionOption[],
  industryId: number | null,
  kindValue: unknown,
  value: unknown,
): QuestionOption[] {
  const kind = productKind(kindValue);
  const available = options.filter((option) =>
    option.id === 0 || (
      industryId !== null && kind !== null && option.parent_id === industryId &&
      option.product_kind === kind && option.is_selectable === true
    ),
  );
  const selectedId = typeof value === 'string' ? null : optionId(value);
  const previous = options.find((option) => option.id === selectedId);
  if (previous && !available.some((option) => option.id === previous.id)) {
    available.push({
      ...previous,
      label: `${previous.label} (previously selected; choose another)`,
      is_selectable: false,
    });
  }
  return available;
}

export function productValueForDisplay(value: unknown, options: QuestionOption[]): unknown {
  if (typeof value !== 'string') {
    const id = optionId(value);
    return isRecord(value) && id !== null ? { ...value, option_id: id } : value;
  }
  if (!value.trim()) return null;
  const match = options.find((option) =>
    option.id > 0 && option.is_selectable === true &&
    option.label.trim().toLowerCase() === value.trim().toLowerCase(),
  );
  return match?.id ?? { option_id: 0, other_text: value };
}

export function productUnitValueForDisplay(value: unknown): unknown {
  return optionId(value) ?? value;
}

export function productUnitsForDisplay(options: QuestionOption[], value: unknown): QuestionOption[] {
  const selectedId = optionId(value);
  return options
    .filter((option) => option.is_selectable === true || option.id === selectedId)
    .map((option) => option.is_selectable === true ? option : {
      ...option,
      label: `${option.label} (previously selected)`,
      is_selectable: false,
    });
}

export function isProductNameComplete(value: unknown): boolean {
  if (typeof value === 'string') return Boolean(value.trim());
  const id = optionId(value);
  if (id === null || id < 0) return false;
  if (id > 0) return true;
  return isRecord(value) && typeof value.other_text === 'string' && Boolean(value.other_text.trim());
}

export function productRowsError(
  value: unknown,
  industryId: number | null,
  options: QuestionOption[],
  units: QuestionOption[],
): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (!Array.isArray(value)) return 'Provide valid product rows.';

  for (const row of value) {
    if (!isRecord(row)) return 'Provide valid product rows.';
    const kind = productKind(row.product_kind);
    if (!kind) return 'Choose Main or Secondary product for each product row.';
    const name = row.product_name;
    if (!isProductNameComplete(name)) {
      return optionId(name) === 0 ? 'Specify the other product name.' : 'Choose a product name for each product row.';
    }
    if (typeof name !== 'string') {
      if (industryId === null) return 'Select a Type of Unit before choosing a product.';
      const id = optionId(name);
      if (id === 0) {
        if (!options.some((option) => option.id === 0 && option.requires_text)) {
          return 'Product options are unavailable. Download the survey form again.';
        }
      } else if (!options.some((option) =>
        option.id === id && option.parent_id === industryId &&
        option.product_kind === kind && option.is_selectable === true,
      )) {
        return 'Choose a product belonging to the selected Type of Unit and product kind.';
      }
    }
    for (const key of PRODUCT_UNIT_FIELDS) {
      const unit = row[key];
      if (unit === undefined || unit === null || unit === '') continue;
      const id = optionId(unit);
      if (id === null || id < 1 || !units.some((option) => option.id === id)) {
        return 'Choose a valid product measurement unit.';
      }
    }
  }
  return null;
}
