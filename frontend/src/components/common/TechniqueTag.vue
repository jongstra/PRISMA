<script setup lang="ts">
// A group or data component in a technique tooltip: white, or light red (group) or light green (data component) with a
// check mark when it is selected, like the red and green highlights in the matrix. A data component in use (in the
// loaded DeTT&CT file) has a purple dot. The classes group-box and component-box let the matrix end a hover on it.
import { vHint } from './hint';

defineProps<{
  name: string;
  kind: 'group' | 'component';
  selected?: boolean;
  inUse?: boolean;
}>();
</script>

<template>
  <span
    class="tt-tag"
    :class="[kind === 'group' ? 'group-box' : 'component-box', { selected }]"
    v-hint="inUse ? 'In use: in the loaded DeTT&CT file' : undefined"
    >{{ selected ? '✓ ' : '' }}<span v-if="inUse" class="tt-dot"></span>{{ name }}</span
  >
</template>

<style scoped>
.tt-tag {
  padding: 0 6px;
  border: 1px solid var(--color-box-border);
  border-radius: 4px;
  background-color: white;
  font-size: 11px;
  line-height: 18px;
  cursor: pointer;
}

.tt-tag.selected {
  font-weight: 600;
}

.group-box.selected {
  background-color: #fdeeec;
  border-color: #e3a29c;
  color: #7a1f17;
}

.component-box.selected {
  background-color: #e8f4eb;
  border-color: #93cb9f;
  color: #174f22;
}

.tt-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 50%;
  background-color: #ab47bc;
  vertical-align: 1px;
}
</style>
