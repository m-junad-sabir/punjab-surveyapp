/** Removes grouping commas and any character that cannot be part of a plain decimal number. */
export function sanitizeNumericText(text: string, allowDecimal = true): string {
  let result = '';
  let hasDot = false;
  for (const char of text) {
    if (char >= '0' && char <= '9') result += char;
    else if (char === '-' && result === '') result += char;
    else if (char === '.' && allowDecimal && !hasDot) {
      result += char;
      hasDot = true;
    }
  }
  return result;
}

/** Inserts a comma after every third digit of the whole-number part, e.g. 1234567.5 -> 1,234,567.5. */
export function formatGroupedNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value);
  if (!/^-?\d*\.?\d*$/.test(text)) return text;
  const negative = text.startsWith('-');
  const [whole, fraction] = (negative ? text.slice(1) : text).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${fraction !== undefined ? `.${fraction}` : ''}`;
}

/** Position in `formatted` after `count` significant (non-comma) characters. */
export function caretAfterSignificantChars(formatted: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (formatted[index] !== ',') seen += 1;
    if (seen === count) return index + 1;
  }
  return formatted.length;
}
