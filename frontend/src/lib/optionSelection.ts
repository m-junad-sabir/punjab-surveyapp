interface OptionWithId {
  id: number;
}

export function areAllOptionsSelected(
  options: readonly OptionWithId[],
  selectedIds: readonly number[],
): boolean {
  return options.length > 0 && options.every((option) => selectedIds.includes(option.id));
}

export function toggleAllOptions(
  options: readonly OptionWithId[],
  selectedIds: readonly number[],
): number[] {
  return areAllOptionsSelected(options, selectedIds) ? [] : options.map((option) => option.id);
}
