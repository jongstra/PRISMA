import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import TechniqueTooltip from '../TechniqueTooltip.vue';

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = '';
});

// A tooltip for a button, with a link inside, and another element on the page to click on.
function showTooltip(pinned: boolean) {
  document.body.innerHTML = '<button id="anchor">Technique</button><div id="elsewhere">Elsewhere</div>';
  const anchor = document.getElementById('anchor')!;
  wrapper = mount(TechniqueTooltip, {
    props: { anchor, pinned, name: 'Phishing', externalId: 'T1566' },
    slots: { default: '<a href="#" id="link">Link</a>' },
    attachTo: document.body,
  });
  const tooltip = () => document.body.querySelector('.tooltip') as HTMLElement;
  return { anchor, tooltip, unpins: () => wrapper!.emitted('unpin')?.length ?? 0 };
}

describe('TechniqueTooltip', () => {
  it('is shown in the page body, outside the matrix', () => {
    const { tooltip } = showTooltip(false);
    expect(tooltip().parentElement).toBe(document.body);
    expect(tooltip().querySelector('#link')).not.toBeNull();
  });

  it('starts with the technique name, linked to ATT&CK, and its ID', () => {
    const { tooltip } = showTooltip(false);
    const name = tooltip().querySelector('.tt-head a') as HTMLAnchorElement;
    expect(name.textContent).toBe('Phishing');
    expect(name.href).toBe('https://attack.mitre.org/techniques/T1566/');
    expect(tooltip().querySelector('.tt-head .tt-id')!.textContent).toBe('T1566');
  });

  it('links a sub-technique to its own ATT&CK page', () => {
    document.body.innerHTML = '<button id="anchor">Technique</button>';
    wrapper = mount(TechniqueTooltip, {
      props: {
        anchor: document.getElementById('anchor'),
        pinned: false,
        name: 'Spearphishing Link',
        externalId: 'T1566.002',
      },
      attachTo: document.body,
    });
    expect((document.body.querySelector('.tt-head a') as HTMLAnchorElement).href).toBe(
      'https://attack.mitre.org/techniques/T1566/002/',
    );
  });

  it('lets the mouse pass through, unless it is pinned', async () => {
    const { tooltip } = showTooltip(false);
    expect(tooltip().classList.contains('pinned')).toBe(false);
    await wrapper!.setProps({ pinned: true });
    expect(tooltip().classList.contains('pinned')).toBe(true);
  });

  it('asks to be unpinned with Esc or a click elsewhere, but not with a click on itself or its button', () => {
    const { anchor, unpins } = showTooltip(true);
    document.getElementById('link')!.click();
    anchor.click();
    expect(unpins()).toBe(0);
    document.getElementById('elsewhere')!.click();
    expect(unpins()).toBe(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(unpins()).toBe(2);
  });

  it('does not ask to be unpinned when it is not pinned', () => {
    const { unpins } = showTooltip(false);
    document.getElementById('elsewhere')!.click();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(unpins()).toBe(0);
  });
});
