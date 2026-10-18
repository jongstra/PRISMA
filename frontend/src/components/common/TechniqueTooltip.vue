<script setup lang="ts">
// The tooltip of a technique button in the DeTT&CT matrix or the MaGMa heatmap: a light card with the technique's name
// (linked to ATT&CK) and ID in an indigo title strip; the button gives the sections below it. It is shown in the page
// body, not inside the scrolling matrix, and placed next to its button (see tooltipPlacement.ts).
// The mouse passes through a hovered tooltip, so moving quickly over the matrix never gets stuck on it. A pinned
// tooltip can be used (links, groups, components), and asks to be unpinned with Esc or a click elsewhere.
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { tooltipPlacement } from './tooltipPlacement';

const props = defineProps<{
  anchor: HTMLElement | null; // the technique button
  pinned: boolean;
  name: string; // of the technique
  externalId: string; // such as T1566 or T1566.002
}>();

// The technique's page on the ATT&CK website; a sub-technique has its own page below its technique's.
const attackUrl = computed(() => `https://attack.mitre.org/techniques/${props.externalId.replace('.', '/')}/`);
const emit = defineEmits<{ unpin: [] }>();

const tooltip = ref<HTMLElement | null>(null);
const position = ref<{ left: number; top: number; maxHeight?: number }>({ left: 0, top: 0 });

// The button's box without its hover effect (the button is lifted and enlarged a little around its centre), so the
// tooltip does not move while that effect plays.
function buttonBox(button: HTMLElement) {
  const rect = button.getBoundingClientRect();
  const transform = getComputedStyle(button).transform;
  const shift = !transform || transform === 'none' ? { e: 0, f: 0 } : new DOMMatrixReadOnly(transform);
  return {
    left: rect.left + rect.width / 2 - shift.e - button.offsetWidth / 2,
    top: rect.top + rect.height / 2 - shift.f - button.offsetHeight / 2,
    width: button.offsetWidth,
    height: button.offsetHeight,
  };
}

function place() {
  if (!props.anchor || !tooltip.value) {
    return;
  }
  const style = getComputedStyle(tooltip.value);
  const height = tooltip.value.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  const window = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
  position.value = tooltipPlacement(buttonBox(props.anchor), { width: tooltip.value.offsetWidth, height }, window);
}

function onKeydown(event: KeyboardEvent) {
  if (props.pinned && (event.key === 'Escape' || event.key === 'Esc')) {
    emit('unpin');
  }
}

function onClick(event: MouseEvent) {
  const path = event.composedPath();
  if (props.pinned && !path.includes(tooltip.value!) && !(props.anchor && path.includes(props.anchor))) {
    emit('unpin');
  }
}

// The tooltip follows its button when the page or the matrix scrolls, or the window changes size.
onMounted(() => {
  place();
  window.addEventListener('scroll', place, { capture: true, passive: true });
  window.addEventListener('resize', place);
  window.addEventListener('keydown', onKeydown);
  document.addEventListener('click', onClick);
});

onUnmounted(() => {
  window.removeEventListener('scroll', place, { capture: true });
  window.removeEventListener('resize', place);
  window.removeEventListener('keydown', onKeydown);
  document.removeEventListener('click', onClick);
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="tooltip"
      class="tooltip"
      :class="{ pinned }"
      :style="{
        left: `${position.left}px`,
        top: `${position.top}px`,
        maxHeight: position.maxHeight === undefined ? undefined : `${position.maxHeight}px`,
      }"
    >
      <div class="tt-head">
        <a :href="attackUrl" target="_blank" rel="noopener">{{ name }}</a>
        <span class="tt-id">{{ externalId }}</span>
      </div>
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.tooltip {
  position: fixed;
  z-index: 1002;
  width: 320px;
  overflow-y: auto; /* a tooltip taller than the window scrolls inside (once it is pinned) */
  pointer-events: none; /* the mouse passes through a hovered tooltip, to the techniques below it */
  background-color: #f6f8fb; /* a very light cool grey, with white tags */
  color: #1f2328;
  border: var(--border-frame);
  border-radius: var(--radius-frame);
  box-shadow:
    0 6px 18px rgba(16, 24, 40, 0.18),
    0 1px 3px rgba(16, 24, 40, 0.12);
  font-family: Inter, sans-serif;
  font-size: 12px;
  line-height: 17px;
  text-align: left;
}

.tooltip.pinned {
  pointer-events: auto;
}

.tt-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background-color: var(--color-accent);
  border-bottom: 1px solid rgb(40, 38, 105);
  font-size: 13px;
  font-weight: 700;
}

.tt-head a {
  color: white;
  text-decoration: none;
}

.tt-head a:hover {
  text-decoration: underline;
}

.tt-id {
  color: #c9c8f0;
  font-weight: 600;
}
</style>

<!-- The parts of the sections, which the buttons put in the tooltip (TechniqueButton.vue, HeatmapButton.vue). -->
<style>
.tooltip .tt-section {
  padding: 6px 10px;
}

.tooltip .tt-section + .tt-section {
  border-top: 1px solid #e3e7ec;
}

.tooltip .tt-label {
  margin-bottom: 3px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.tooltip .tt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 1px 0;
}

.tooltip .tt-row a {
  color: inherit;
  text-decoration: none;
}

.tooltip .tt-row a:hover {
  text-decoration: underline;
}

/* The technique's own row in the list of its parts, apart from the names of its sub-techniques. */
.tooltip .tt-itself {
  font-style: italic;
}

.tooltip .tt-strong {
  font-weight: 700;
}

/* A visibility percentage, in the colour of the matrix. */
.tooltip .tt-chip {
  flex: none;
  min-width: 40px;
  padding: 0 5px;
  border: var(--border-control);
  border-radius: 4px;
  background-color: var(--color-technique);
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
}

.tooltip .tt-number {
  font-weight: 600;
}

.tooltip .tt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.tooltip .tt-none,
.tooltip .tt-note {
  color: var(--color-text-muted);
}

.tooltip .tt-note {
  margin-top: 3px;
  font-size: 11px;
}
</style>
