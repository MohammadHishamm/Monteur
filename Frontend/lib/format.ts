/**
 * Number / string formatting utilities shared across the UI.
 */

/**
 * Returns plain string digits without Arabic-Indic conversion.
 */
export function toArabicDigits(value: number | string): string {
  return String(value);
}

/**
 * Formats numbers using standard western digits.
 */
export function arNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
