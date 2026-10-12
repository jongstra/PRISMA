import { describe, it, expect } from 'vitest';
import { importSummary } from '@/io/magmaFile';
import { importSummaryContent } from '../importSummaryContent';

describe('importSummaryContent', () => {
  it('shows the counts, then the use cases that were not loaded and the warnings as lists', () => {
    const content = importSummaryContent(
      importSummary({ imported: 1, failed: ['A failed.'], warnings: ['C is odd.', 'D is odd.'] }),
    );
    expect(content.querySelector('p')?.textContent).toBe('Successful imports: 1. Failed imports: 1.');
    expect([...content.querySelectorAll('h3')].map((heading) => heading.textContent)).toEqual([
      'Not loaded (1)',
      'Warnings (2)',
    ]);
    expect([...content.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'A failed.',
      'C is odd.',
      'D is odd.',
    ]);
  });

  it('leaves out an empty list, and shows texts from the file as text, not as HTML', () => {
    const content = importSummaryContent(importSummary({ imported: 0, failed: ['<b>X</b> failed.'], warnings: [] }));
    expect([...content.querySelectorAll('h3')].map((heading) => heading.textContent)).toEqual(['Not loaded (1)']);
    expect(content.querySelector('li')?.textContent).toBe('<b>X</b> failed.');
    expect(content.querySelector('b')).toBeNull();
  });
});
