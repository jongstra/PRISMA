// A value pasted into a cell of a sheet, read for its column: the value to save, or why it does not fit (it is then
// left out of the paste). An empty cell clears the value, as in a spreadsheet.

import { PERCENTAGE_INPUTS, SINGLE_LINE_FIELDS } from './useCaseColumns';

export type PastedValue = { value: string | string[] | boolean } | { problem: string };

const YES = ['yes', 'true', '1', 'on', 'ja'];
const NO = ['no', 'false', '0', 'off', 'nee', ''];

const firstWord = (text: string) => text.trim().split(/\s+/)[0] ?? '';

/** The value of a pasted text for a column. techniqueIds are the ATT&CK techniques of the domain. */
export function readPastedValue(field: string, text: string, techniqueIds: Set<string>): PastedValue {
  const trimmed = text.trim();
  if (PERCENTAGE_INPUTS.includes(field)) {
    // As typed, or as a spreadsheet shows it: 65, 65%, 72,5
    const match = /^(\d+(?:[.,]\d+)?)\s*%?$/.exec(trimmed);
    const percentage = match?.[1]!.replace(',', '.');
    if (trimmed === '') {
      return { value: '' };
    }
    return percentage !== undefined && Number(percentage) <= 100
      ? { value: String(Number(percentage)) }
      : { problem: `"${trimmed}" is not a percentage from 0 to 100` };
  }
  if (field === 'attackTechniqueId') {
    // The ID, also when the name follows it (T1071 Application Layer Protocol).
    const id = firstWord(trimmed).toUpperCase();
    if (id === '') {
      return { value: 'none' };
    }
    return techniqueIds.has(id) ? { value: id } : { problem: `"${id}" is not an ATT&CK technique` };
  }
  if (field === 'parentIds') {
    // A parent that does not exist (yet) is kept: the sheet shows it in red, as when a file is loaded.
    return { value: [firstWord(trimmed) || 'none'] };
  }
  if (field === 'visibilityFromAttackTechniqueOverride') {
    const answer = trimmed.toLowerCase();
    if (YES.includes(answer) || NO.includes(answer)) {
      return { value: YES.includes(answer) };
    }
    return { problem: `"${trimmed}" is not yes or no` };
  }
  return { value: SINGLE_LINE_FIELDS.includes(field) ? trimmed.replace(/\s*(\r\n|\r|\n)\s*/g, ' ') : trimmed };
}
