<script setup lang="ts">
// The switch 'with use case' at the top right of the Techniques box of the MaGMa heatmap (Heatmap.vue), so the label
// line reads 'Techniques with use case'. When it is on, the heatmap only shows the techniques with L3 use cases, also
// those at 0% (which the minimum score would hide). Off at the start. In a narrow box the text is cut off with an
// ellipsis, and the switch stays.
import { magmaStore } from '@/stores/magma';
import { vHint } from '@/components/common/hint';

const magma = magmaStore();
</script>

<template>
  <label class="use-case-switch" v-hint="'Only show the techniques with L3 use cases'">
    <span class="switch-text">with use case</span>
    <input v-model="magma.heatmapOnlyWithUseCases" type="checkbox" />
    <span class="switch" aria-hidden="true"></span>
  </label>
</template>

<style scoped>
/* As big as the switch of the Groups box (SelectionTool.vue), in the middle of the label line. */
.use-case-switch {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  cursor: pointer;
}

.switch-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: var(--color-text-muted);
}

.use-case-switch input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.switch {
  position: relative;
  flex: none;
  width: 28px;
  height: 16px;
  border-radius: 16px;
  background-color: var(--color-switch-off);
  transition: 0.4s;
}

.switch::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: white;
  transition: 0.4s;
}

.use-case-switch input:checked + .switch {
  background-color: var(--color-switch-on);
}

.use-case-switch input:checked + .switch::before {
  transform: translateX(12px);
}

.use-case-switch input:focus-visible + .switch {
  outline: 2px solid var(--color-switch-on);
  outline-offset: 1px;
}
</style>
