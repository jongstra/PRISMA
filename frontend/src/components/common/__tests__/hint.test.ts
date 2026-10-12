import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, withDirectives } from 'vue';
import { hintPlacement, vHint } from '../hint';

const text = ref('');
const Header = defineComponent({
  setup: () => () => withDirectives(h('button', 'Header'), [[vHint, text.value]]),
});
const hint = () => document.querySelector('.hint');

beforeEach(() => {
  vi.useFakeTimers();
  text.value = 'What the column means.';
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('v-hint', () => {
  it('shows the text shortly after the mouse comes on the element', async () => {
    const header = mount(Header, { attachTo: document.body });
    await header.trigger('mouseenter');
    vi.advanceTimersByTime(299);
    expect(hint()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(hint()?.textContent).toBe('What the column means.');
    header.unmount();
    expect(hint()).toBeNull();
  });

  it('hides the text when the mouse leaves or clicks, and never shows it after a quick pass', async () => {
    const header = mount(Header, { attachTo: document.body });
    await header.trigger('mouseenter');
    vi.advanceTimersByTime(300);
    await header.trigger('mouseleave');
    expect(hint()).toBeNull();
    await header.trigger('mouseenter');
    vi.advanceTimersByTime(300);
    await header.trigger('mousedown');
    expect(hint()).toBeNull();
    await header.trigger('mouseenter');
    vi.advanceTimersByTime(100);
    await header.trigger('mouseleave');
    vi.advanceTimersByTime(500);
    expect(hint()).toBeNull();
  });

  it('gives the text to screen readers as the description of the element', async () => {
    const header = mount(Header, { attachTo: document.body });
    expect(header.attributes('aria-description')).toBe('What the column means.');
    text.value = 'Changed.';
    await header.vm.$nextTick();
    expect(header.attributes('aria-description')).toBe('Changed.');
  });
});

describe('hintPlacement', () => {
  const window = { width: 1400, height: 900 };
  const header = { left: 600, top: 100, width: 200, height: 60 };
  const card = { width: 280, height: 50 };

  it('puts the card just below the element, with the arrow at the mouse', () => {
    const place = hintPlacement(header, 700, card, window);
    expect(place).toEqual({ left: 682, top: 165, arrowLeft: 12, above: false });
  });

  it('keeps the arrow on the element when the mouse is at its edge', () => {
    expect(hintPlacement(header, 590, card, window).arrowLeft + hintPlacement(header, 590, card, window).left + 6).toBe(
      608,
    );
  });

  it('keeps the card inside the window, with the arrow still at the mouse', () => {
    const place = hintPlacement({ left: 1250, top: 100, width: 140, height: 60 }, 1380, card, window);
    expect(place.left).toBe(1112);
    expect(place.left + place.arrowLeft + 6).toBe(1380);
  });

  it('puts the card above the element near the bottom of the window', () => {
    const place = hintPlacement({ left: 600, top: 820, width: 200, height: 60 }, 700, card, window);
    expect(place).toEqual({ left: 682, top: 765, arrowLeft: 12, above: true });
  });
});
