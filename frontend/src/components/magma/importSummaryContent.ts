// The content of the dialog after loading a MaGMa file with problems: the counts, then the use cases that were not
// loaded and the warnings, each as a list. Texts from the file are shown as text, never as HTML.
import type { importSummary } from '@/io/magmaFile';

export function importSummaryContent(summary: ReturnType<typeof importSummary>): HTMLElement {
  const content = document.createElement('div');
  content.className = 'import-summary';
  const counts = document.createElement('p');
  counts.textContent = summary.text;
  content.append(counts);
  for (const [title, items] of [
    ['Not loaded', summary.failed],
    ['Warnings', summary.warnings],
  ] as const) {
    if (items.length === 0) {
      continue;
    }
    const heading = document.createElement('h3');
    heading.textContent = `${title} (${items.length})`;
    const list = document.createElement('ul');
    for (const item of items) {
      const entry = document.createElement('li');
      entry.textContent = item;
      list.append(entry);
    }
    content.append(heading, list);
  }
  return content;
}
