<script setup lang="ts">
// The page's scroll bar: a thin translucent bar that floats over the right edge of the page. The browser's own scroll
// bar is hidden (main.css), because when it is always shown it takes 15px, so a page that scrolls would be narrower
// than one that does not. Scrolling stays the browser's own (wheel, trackpad, keyboard); the bar shows where you are
// and can be dragged. See scrollbarGeometry.ts for its size and position.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { scrollTopForDrag, thumbGeometry } from './scrollbarGeometry';

const geometry = ref(thumbGeometry(0, 0, 0));
const dragging = ref(false);
let drag: { startY: number; startScrollTop: number } | null = null;
let observer: ResizeObserver | undefined;

const page = () => document.documentElement;

function update() {
  geometry.value = thumbGeometry(page().clientHeight, page().scrollHeight, window.scrollY);
}

function startDrag(event: PointerEvent) {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  drag = { startY: event.clientY, startScrollTop: window.scrollY };
  dragging.value = true;
  event.preventDefault(); // no text selection while dragging
}

function moveDrag(event: PointerEvent) {
  if (drag) {
    const top = scrollTopForDrag(
      page().clientHeight,
      page().scrollHeight,
      drag.startScrollTop,
      event.clientY - drag.startY,
    );
    window.scrollTo({ top });
  }
}

function endDrag() {
  drag = null;
  dragging.value = false;
}

onMounted(() => {
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // The page gets taller or shorter when its content changes, e.g. on another tab or after loading a file.
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(update);
    observer.observe(document.body);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', update);
  window.removeEventListener('resize', update);
  observer?.disconnect();
});
</script>

<template>
  <div
    v-if="geometry.visible"
    class="page-scrollbar"
    :class="{ dragging }"
    :style="{ top: `${geometry.top}px`, height: `${geometry.height}px` }"
    aria-hidden="true"
    @pointerdown="startDrag"
    @pointermove="moveDrag"
    @pointerup="endDrag"
    @pointercancel="endDrag"
  ></div>
</template>

<style scoped>
/* A 12px wide area to grab, with a 6px translucent bar on its right; the bar gets wider and darker under the mouse. */
.page-scrollbar {
  position: fixed;
  right: 0;
  z-index: 1000; /* above the page, below tooltips and dialogs */
  width: 12px;
  cursor: default;
  touch-action: none;
}

.page-scrollbar::before {
  position: absolute;
  top: 2px;
  right: 2px;
  bottom: 2px;
  width: 6px;
  content: '';
  border-radius: 3px;
  background-color: rgba(0, 0, 0, 0.3);
  transition:
    width 0.15s,
    background-color 0.15s;
}

.page-scrollbar:hover::before,
.page-scrollbar.dragging::before {
  width: 8px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
