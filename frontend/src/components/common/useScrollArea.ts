// A scroll area that fills the rest of the window, below the header and the controls: the ATT&CK matrix (AttackView.vue),
// the MaGMa heatmap (Heatmap.vue) and the MaGMa sheets (UseCaseTable.vue). In a window that is big enough (windowFill.ts) the page stops scrolling, the area
// gets the height that is left and scrolls itself both ways, and the wheel and the keys that scrolled the page scroll the
// area, wherever the mouse is. The area draws its own thin scroll bars (ScrollThumbs.vue), as the page does
// (PageScrollbar.vue), so they also show on a Mac, where the system shows them only while scrolling. In a smaller
// window the page scrolls as before, and the area only scrolls sideways.
import { onBeforeUnmount, onMounted, reactive, type Ref } from 'vue';
import { scrollTopForDrag, thumbGeometry, type ThumbGeometry } from './scrollbarGeometry';
import { fillHeight, fillsWindow, keyScroll, wheelScroll, type ScrollStep } from './windowFill';

type Axis = 'vertical' | 'horizontal';

const FILL_CLASS = 'fills-window'; // on <html> while an area fills the window: the page does not scroll (main.css)
const NO_BAR: ThumbGeometry = { visible: false, top: 0, height: 0 };

// Whether an element under the mouse, or one around it, scrolls itself in the direction of the wheel (a list, the
// selected groups, a tooltip): then the wheel is left to it.
function scrollsItself(target: Element, step: ScrollStep): boolean {
  for (let element: Element | null = target; element && element !== document.body; element = element.parentElement) {
    const style = getComputedStyle(element);
    const scrollable = (overflow: string) => overflow === 'auto' || overflow === 'scroll';
    if (step.top !== 0 && scrollable(style.overflowY) && element.scrollHeight > element.clientHeight) {
      return true;
    }
    if (step.left !== 0 && scrollable(style.overflowX) && element.scrollWidth > element.clientWidth) {
      return true;
    }
  }
  return false;
}

// `content` is what the area holds, whose size changes (filters, rows added); by default its first element.
export function useScrollArea(area: Ref<HTMLElement | null>, content?: Ref<HTMLElement | null>) {
  const state = reactive({
    fills: false, // the area fills the window and the page does not scroll
    scrolled: false, // the area is scrolled down: a line below its frozen top
    scrolledSideways: false, // the area is scrolled to the right: a shadow beside its frozen first columns (the sheets)
    frame: { top: 0, left: 0, width: 0, height: 0 }, // where the area is in the window, for the bars
    vertical: NO_BAR,
    horizontal: NO_BAR,
    dragging: null as Axis | null,
  });

  function updateBars() {
    const element = area.value;
    if (!element) {
      return;
    }
    state.scrolled = element.scrollTop > 0;
    state.scrolledSideways = element.scrollLeft > 0;
    const { top, left, width, height } = element.getBoundingClientRect();
    state.frame = { top, left, width, height };
    state.vertical = state.fills
      ? thumbGeometry(element.clientHeight, element.scrollHeight, element.scrollTop)
      : NO_BAR;
    state.horizontal = state.fills
      ? thumbGeometry(element.clientWidth, element.scrollWidth, element.scrollLeft)
      : NO_BAR;
  }

  // Fills the window with the area, or lets the page scroll again, after a change of the window or of what is above.
  function layout() {
    const element = area.value;
    if (!element) {
      return;
    }
    state.fills = fillsWindow(window.innerWidth, window.innerHeight);
    document.documentElement.classList.toggle(FILL_CLASS, state.fills);
    if (state.fills) {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      const height = `${fillHeight(window.innerHeight, element.getBoundingClientRect().top)}px`;
      if (element.style.height !== height) {
        element.style.height = height;
      }
    } else {
      element.style.height = '';
    }
    updateBars();
  }

  function scrollArea(step: ScrollStep) {
    const element = area.value!;
    const far = (distance: number, size: number) =>
      Math.abs(distance) === Infinity ? Math.sign(distance) * size : distance;
    element.scrollBy({ left: far(step.left, element.scrollWidth), top: far(step.top, element.scrollHeight) });
  }

  function onWheel(event: WheelEvent) {
    const element = area.value;
    const target = event.target as Element | null;
    if (!state.fills || !element || !target || event.ctrlKey || event.defaultPrevented || element.contains(target)) {
      return; // zooming, or the area itself scrolls
    }
    const step = wheelScroll(event, element.clientHeight);
    if (!scrollsItself(target, step)) {
      scrollArea(step);
    }
  }

  // The keys that scroll the page (arrows, Page Up and Down, the space bar, Home, End) scroll the area while nothing has
  // the focus; a field, a button or the area itself keeps its own keys.
  function onKeydown(event: KeyboardEvent) {
    const element = area.value;
    const nothingFocused = event.target === document.body || event.target === document.documentElement;
    if (!state.fills || !element || !nothingFocused || event.defaultPrevented) {
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const step = keyScroll(event.key, event.shiftKey, { width: element.clientWidth, height: element.clientHeight });
    if (step) {
      event.preventDefault();
      scrollArea(step);
    }
  }

  // Dragging a bar scrolls the area, as dragging the page's bar scrolls the page.
  let drag: { axis: Axis; start: number; startScroll: number } | null = null;
  function startDrag(axis: Axis, event: PointerEvent) {
    const element = area.value;
    if (!element) {
      return;
    }
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const vertical = axis === 'vertical';
    drag = {
      axis,
      start: vertical ? event.clientY : event.clientX,
      startScroll: vertical ? element.scrollTop : element.scrollLeft,
    };
    state.dragging = axis;
    event.preventDefault(); // no text selection while dragging
  }
  function moveDrag(event: PointerEvent) {
    const element = area.value;
    if (!drag || !element) {
      return;
    }
    if (drag.axis === 'vertical') {
      element.scrollTop = scrollTopForDrag(
        element.clientHeight,
        element.scrollHeight,
        drag.startScroll,
        event.clientY - drag.start,
      );
    } else {
      element.scrollLeft = scrollTopForDrag(
        element.clientWidth,
        element.scrollWidth,
        drag.startScroll,
        event.clientX - drag.start,
      );
    }
  }
  function endDrag() {
    drag = null;
    state.dragging = null;
  }

  // A change of size above the area (fonts that load, a control panel that wraps) or of what it holds (filters) is
  // handled in the next frame, so the height it sets does not trigger the observer again in the same frame.
  let frame = 0;
  const scheduleLayout = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(layout);
  };
  let observer: ResizeObserver | undefined;

  onMounted(() => {
    layout();
    area.value?.addEventListener('scroll', updateBars, { passive: true });
    window.addEventListener('resize', layout);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeydown);
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleLayout);
      observer.observe(document.body);
      const held = content?.value ?? area.value?.firstElementChild;
      if (held) {
        observer.observe(held);
      }
    }
    document.fonts?.ready.then(scheduleLayout);
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    area.value?.removeEventListener('scroll', updateBars);
    window.removeEventListener('resize', layout);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeydown);
    observer?.disconnect();
    document.documentElement.classList.remove(FILL_CLASS);
  });

  return Object.assign(state, { startDrag, moveDrag, endDrag });
}

export type ScrollArea = ReturnType<typeof useScrollArea>;
