<script setup lang="ts">
// The thin scroll bars of a scroll area that fills the window (useScrollArea.ts): one at its right edge and one at its
// bottom, in the look of the page's bar (PageScrollbar.vue). They float over the edges of the area; dragging one
// scrolls the area.
import type { ScrollArea } from './useScrollArea';

defineProps<{ area: ScrollArea }>();
</script>

<template>
  <template v-if="area.fills">
    <div
      v-if="area.vertical.visible"
      class="scroll-thumb vertical"
      :class="{ dragging: area.dragging === 'vertical' }"
      :style="{
        top: `${area.frame.top + area.vertical.top}px`,
        left: `${area.frame.left + area.frame.width - 12}px`,
        height: `${area.vertical.height}px`,
      }"
      aria-hidden="true"
      @pointerdown="area.startDrag('vertical', $event)"
      @pointermove="area.moveDrag"
      @pointerup="area.endDrag"
      @pointercancel="area.endDrag"
    ></div>
    <div
      v-if="area.horizontal.visible"
      class="scroll-thumb horizontal"
      :class="{ dragging: area.dragging === 'horizontal' }"
      :style="{
        top: `${area.frame.top + area.frame.height - 12}px`,
        left: `${area.frame.left + area.horizontal.top}px`,
        width: `${area.horizontal.height}px`,
      }"
      aria-hidden="true"
      @pointerdown="area.startDrag('horizontal', $event)"
      @pointermove="area.moveDrag"
      @pointerup="area.endDrag"
      @pointercancel="area.endDrag"
    ></div>
  </template>
</template>

<style scoped>
/* A 12px wide area to grab, with a 6px translucent bar on its outer side; the bar gets wider and darker under the
   mouse, as the page's bar does. */
.scroll-thumb {
  position: fixed;
  z-index: 1000; /* above the area, below tooltips and dialogs */
  cursor: default;
  touch-action: none;
}

.scroll-thumb.vertical {
  width: 12px;
}

.scroll-thumb.horizontal {
  height: 12px;
}

.scroll-thumb::before {
  position: absolute;
  content: '';
  border-radius: 3px;
  background-color: rgba(0, 0, 0, 0.3);
  transition:
    width 0.15s,
    height 0.15s,
    background-color 0.15s;
}

.scroll-thumb.vertical::before {
  top: 2px;
  right: 2px;
  bottom: 2px;
  width: 6px;
}

.scroll-thumb.horizontal::before {
  right: 2px;
  bottom: 2px;
  left: 2px;
  height: 6px;
}

.scroll-thumb:hover::before,
.scroll-thumb.dragging::before {
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
}

.scroll-thumb.vertical:hover::before,
.scroll-thumb.vertical.dragging::before {
  width: 8px;
}

.scroll-thumb.horizontal:hover::before,
.scroll-thumb.horizontal.dragging::before {
  height: 8px;
}
</style>
