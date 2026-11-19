import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import fs from 'node:fs';
import { tacticsStore } from '@/stores/tactics';
import { magmaStore } from '@/stores/magma';
import SheetTabs from '../SheetTabs.vue';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn(() => Promise.resolve({})), isVisible: vi.fn(() => false) } }));

const catalog = JSON.parse(fs.readFileSync('public/tactics_and_techniques_by_domain.json', 'utf8'));
const domain = 'enterprise-attack';

// The tab bar, with one changed L2 use case to undo, while the Heatmap tab is open.
function showTabs() {
  const pinia = createPinia();
  setActivePinia(pinia);
  tacticsStore().enterprise = structuredClone(catalog.enterprise);
  const magma = magmaStore();
  magma.initializeDefaultUseCases();
  magma.addNewUseCase(2, domain);
  const tabs = mount(SheetTabs, { global: { plugins: [pinia] }, attachTo: document.body });
  const change = () => {
    magma.activeTab = 'L2';
    magma.recordStep('Description of L2-1');
    magma.updateUseCase(magma.L2UseCases(domain)[0]!.uid, { description: 'changed' }, domain);
    magma.activeTab = 'Heatmap';
  };
  const description = () => magma.L2UseCases(domain)[0]!.description;
  return {
    magma,
    tabs,
    change,
    description,
    undoButton: () => tabs.find('.undo-button'),
    redoButton: () => tabs.find('.redo-button'),
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SheetTabs: undo and redo', () => {
  it('has the buttons greyed out while there is nothing to undo or redo', () => {
    const { undoButton, redoButton } = showTabs();
    expect(undoButton().attributes('disabled')).toBeDefined();
    expect(redoButton().attributes('disabled')).toBeDefined();
  });

  it('undoes with the button, says what it undoes, and shows the sheet of the change', async () => {
    const { magma, change, description, undoButton, redoButton } = showTabs();
    change();
    await nextTick();
    expect(undoButton().attributes('aria-description')).toMatch(/^Undo: Description of L2-1 \((Ctrl\+Z|⌘Z)\)$/);
    await undoButton().trigger('click');
    expect(description()).toBe('');
    expect(magma.activeTab).toBe('L2');
    expect(redoButton().attributes('disabled')).toBeUndefined();
    await redoButton().trigger('click');
    expect(description()).toBe('changed');
  });

  it('undoes and redoes with Ctrl+Z and Ctrl+Shift+Z', async () => {
    const { change, description } = showTabs();
    change();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
    expect(description()).toBe('');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true }));
    expect(description()).toBe('changed');
  });

  it('leaves Ctrl+Z to a field outside the sheets', async () => {
    const { change, description } = showTabs();
    change();
    const field = document.createElement('input');
    document.body.append(field);
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(description()).toBe('changed');
  });
});
