// Lettered IDs for several use cases at once, such as THR-1-E to THR-1-I for five new rules under THR-1: the base, a
// dash and letters. The letters continue after the last ones in use with that base, so an ID that was deleted is not
// given to another use case (older files or reports may still name it). After Y come ZA, ZB … ZY, then ZZA …: the
// alphabetical order of the IDs is always the order in which they were made (after Z, AA would sort between A and B).

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXY'; // Z starts the next, longer series

/** The letters after the given ones in the series A … Y, ZA … ZY, ZZA …, as many as asked. */
export function lettersAfter(last: string, count: number): string[] {
  const letters: string[] = [];
  for (let zs = 0; letters.length < count; zs++) {
    for (const letter of LETTERS) {
      const candidate = 'Z'.repeat(zs) + letter;
      if (candidate > last && letters.length < count) {
        letters.push(candidate);
      }
    }
  }
  return letters;
}

const literally = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** IDs for a number of use cases: the base with the letters after the last ones the existing IDs use with that base. */
export function letteredIds(base: string, count: number, existingIds: string[]): string[] {
  const lettered = new RegExp(`^${literally(base)}-([A-Z]+)$`);
  const used = existingIds.map((id) => lettered.exec(id)?.[1] ?? '');
  const last = used.reduce((max, letters) => (letters > max ? letters : max), '');
  return lettersAfter(last, count).map((letters) => `${base}-${letters}`);
}
