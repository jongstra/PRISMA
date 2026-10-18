// v-hint: a short explanation that appears shortly after the mouse comes on an element, such as a column header. The
// browser's own tooltip (the title attribute) waits a second or more and cannot be made faster. The text is shown in
// the page body, next to the element, with an arrow to the mouse; screen readers get it as the element's description.
import type { Directive } from 'vue';

const DELAY = 300; // milliseconds: fast, but no flickering texts while the mouse moves across elements
const GAP = 5; // between the element and the card; the arrow reaches just onto the element
const ARROW_INSET = 18; // from the left side of the card to the middle of its arrow
const MARGIN = 8; // room kept free at the edges of the window

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where the card goes, in window coordinates: just below the element, or above it when there is not enough room below.
 * The arrow points at the mouse (kept on the element), and the card stays inside the window.
 */
export function hintPlacement(
  element: Box,
  mouseX: number,
  card: { width: number; height: number },
  window: { width: number; height: number },
) {
  const roomBelow = window.height - MARGIN - (element.top + element.height + GAP);
  const roomAbove = element.top - GAP - MARGIN;
  const above = roomBelow < card.height && roomAbove > roomBelow;
  const pointer = Math.min(Math.max(mouseX, element.left + 8), element.left + element.width - 8);
  const left = Math.min(Math.max(pointer - ARROW_INSET, MARGIN), window.width - MARGIN - card.width);
  return {
    left,
    top: above ? element.top - GAP - card.height : element.top + element.height + GAP,
    arrowLeft: Math.min(Math.max(pointer - left - 6, 6), card.width - 18),
    above,
  };
}

interface Hint {
  text: string;
  mouseX: number;
  timer?: ReturnType<typeof setTimeout>;
  shown?: HTMLElement;
  schedule: () => void;
  hide: () => void;
}

const hints = new WeakMap<HTMLElement, Hint>();

function show(element: HTMLElement, hint: Hint) {
  const shown = document.createElement('div');
  shown.className = 'hint';
  shown.classList.toggle('long', hint.text.includes('\n')); // several lines, such as a calculation: a wider card
  shown.setAttribute('role', 'tooltip');
  shown.textContent = hint.text;
  document.body.appendChild(shown);
  const window = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
  const card = { width: shown.offsetWidth, height: shown.offsetHeight };
  const place = hintPlacement(element.getBoundingClientRect(), hint.mouseX, card, window);
  shown.style.left = `${place.left}px`;
  shown.style.top = `${place.top}px`;
  shown.style.setProperty('--arrow-left', `${place.arrowLeft}px`);
  shown.classList.toggle('above', place.above);
  hint.shown = shown;
}

export const vHint: Directive<HTMLElement, string | undefined> = {
  mounted(element, binding) {
    const hint: Hint = {
      text: binding.value ?? '',
      mouseX: 0,
      schedule: () => {
        hint.hide();
        if (hint.text) {
          hint.timer = setTimeout(() => show(element, hint), DELAY);
        }
      },
      hide: () => {
        clearTimeout(hint.timer);
        hint.shown?.remove();
        hint.shown = undefined;
        window.removeEventListener('scroll', hint.hide, { capture: true });
      },
    };
    hints.set(element, hint);
    element.setAttribute('aria-description', hint.text);
    const followMouse = (event: MouseEvent) => {
      hint.mouseX = event.clientX;
    };
    element.addEventListener('mousemove', followMouse);
    element.addEventListener('mouseenter', (event) => {
      followMouse(event);
      hint.schedule();
      window.addEventListener('scroll', hint.hide, { capture: true, passive: true });
    });
    element.addEventListener('mouseleave', hint.hide);
    element.addEventListener('mousedown', hint.hide);
  },
  updated(element, binding) {
    const hint = hints.get(element);
    if (hint && hint.text !== (binding.value ?? '')) {
      hint.text = binding.value ?? '';
      element.setAttribute('aria-description', hint.text);
      if (hint.shown) {
        hint.shown.textContent = hint.text;
      }
    }
  },
  beforeUnmount(element) {
    hints.get(element)?.hide();
    hints.delete(element);
  },
};
