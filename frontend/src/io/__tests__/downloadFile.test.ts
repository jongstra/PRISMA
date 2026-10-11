import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadFile } from '../downloadFile';
import './blobText';

afterEach(() => vi.restoreAllMocks());

describe('downloadFile', () => {
  it('offers the text as a file with the given name and type', async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = (object: Blob | MediaSource) => {
      blob = object as Blob;
      return 'blob:test';
    };
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadFile('a: 1', 'data.yaml', 'text/yaml');
    const link = click.mock.contexts[0] as HTMLAnchorElement | undefined; // the link that was clicked

    expect(link?.download).toBe('data.yaml');
    expect(link?.href).toBe('blob:test');
    expect(blob?.type).toBe('text/yaml');
    expect(await blob?.text()).toBe('a: 1');
    expect(document.body.contains(link!)).toBe(false); // the temporary link is removed again
  });
});
