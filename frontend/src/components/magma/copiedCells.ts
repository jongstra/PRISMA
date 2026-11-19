// Cells copied from or to a spreadsheet (Excel, Google Sheets, Numbers) go over the clipboard as text: a tab between the
// cells of a row and a line break after each row. A cell with a tab, a line break or a quote in it is put between quotes,
// with its own quotes doubled.

/** The rows of copied spreadsheet text, each as a list of cell texts. */
export function parseCopiedCells(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let index = 0;
  let cellStart = true; // nothing of the cell has been read yet

  const endsCell = (at: number) => at >= text.length || text[at] === '\t' || text[at] === '\n' || text[at] === '\r';

  while (index < text.length) {
    const char = text[index]!;
    if (cellStart && char === '"') {
      // A cell between quotes ends at a quote before a tab, a line break or the end; "" inside is one quote.
      let quoted = '';
      let at = index + 1;
      let closed = false;
      while (at < text.length) {
        if (text[at] === '"' && text[at + 1] === '"') {
          quoted += '"';
          at += 2;
        } else if (text[at] === '"') {
          closed = endsCell(at + 1);
          break;
        } else {
          quoted += text[at];
          at += 1;
        }
      }
      if (closed) {
        cell = quoted;
        index = at + 1;
        cellStart = false;
        continue;
      }
    }
    cellStart = false;
    if (char === '\t') {
      row.push(cell);
      cell = '';
      cellStart = true;
    } else if (char === '\n' || char === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      cellStart = true;
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
    } else {
      cell += char;
    }
    index += 1;
  }
  if (!cellStart || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Cells as copied text that a spreadsheet can paste (and parseCopiedCells reads back the same). */
export function formatCopiedCells(rows: string[][]): string {
  // Quotes are needed around a tab or line break, and around a quote at the start (it would read as an opening quote).
  const cell = (text: string) => (/[\t\r\n]|^"/.test(text) ? `"${text.replaceAll('"', '""')}"` : text);
  return rows.map((row) => `${row.map(cell).join('\t')}\r\n`).join('');
}
