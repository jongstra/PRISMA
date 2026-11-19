import { describe, it, expect } from 'vitest';
import { h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import fs from 'node:fs';
import { tacticsStore, type Technique } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
import HeatmapButton from '../HeatmapButton.vue';

const catalog = JSON.parse(fs.readFileSync('public/tactics_and_techniques_by_domain.json', 'utf8'));

// Two heatmap buttons of techniques that one group both uses; the tooltip of the first is pinned.
async function showTwoTechniquesOfAGroup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const tactics = tacticsStore();
  tactics.enterprise = structuredClone(catalog.enterprise);
  magmaStore().initializeDefaultUseCases();
  const techniques: Technique[] = tactics.currentDomain!.tactics.flatMap((tactic) => tactic.techniques);
  const first = techniques.find((technique) => technique.groups.length > 0)!;
  const group = first.groups[0]!;
  const second = techniques.find((technique) => technique.name !== first.name && technique.groups.includes(group))!;
  const heatmap = mount(() => [h(HeatmapButton, { technique: first }), h(HeatmapButton, { technique: second })], {
    global: { plugins: [pinia], stubs: { teleport: true } },
    attachTo: document.body,
  });
  const [firstButton, secondButton] = heatmap.findAll('button:not(.tt-tag)');
  await firstButton!.trigger('click'); // pins its tooltip
  const tag = heatmap.findAll('.group-box').find((found) => found.text().endsWith(group))!;
  return { tactics, heatmap, group, tag, secondButton: secondButton! };
}

describe('HeatmapButton', () => {
  it('rings the other techniques of a group that is hovered in the tooltip, as the DeTT&CT matrix does', async () => {
    const { heatmap, tag, secondButton } = await showTwoTechniquesOfAGroup();
    expect(secondButton.classes()).not.toContain('occurs-in-hovered-groups');
    await tag.trigger('mouseover');
    expect(secondButton.classes()).toContain('occurs-in-hovered-groups');
    heatmap.unmount();
  });

  it("selects a group with a click in the tooltip, in the heatmap's own selection", async () => {
    const { tactics, heatmap, group, tag, secondButton } = await showTwoTechniquesOfAGroup();
    await tag.trigger('click');
    await nextTick();
    const marked = tactics.currentDomain!.groups.find((candidate) => candidate.name === group)!;
    expect([marked.selectedInMagmaHeatmap, marked.selected]).toEqual([true, undefined]);
    expect(secondButton.classes()).toContain('occurs-in-selected-groups');
    expect(heatmap.findAll('.group-box').some((found) => found.text() === `✓ ${group}`)).toBe(true); // redrawn
    heatmap.unmount();
  });
});
