import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import OptionPicker from '../OptionPicker.vue';
import { searchTechniques } from '../optionSearch';

const techniques = [
  { id: 'T1059', name: 'Command and Scripting Interpreter' },
  { id: 'T1566', name: 'Phishing' },
  { id: 'T1566.001', name: 'Phishing: Spearphishing Attachment' },
  { id: 'T1566.002', name: 'Phishing: Spearphishing Link' },
];

let picker: VueWrapper;
afterEach(() => picker?.unmount());

// The list is normally shown in the page body; here it stays next to the field.
const mountPicker = (modelValue?: string) => {
  picker = mount(OptionPicker, {
    props: { modelValue, options: techniques, search: searchTechniques, noun: 'technique' },
    global: { stubs: { teleport: true } },
    attachTo: document.body,
  });
  return picker;
};
const options = () => picker.findAll('[role="option"]').map((option) => option.text());
const chosen = () => picker.emitted('update:modelValue')?.map(([id]) => id);

describe('OptionPicker', () => {
  it('shows the current technique, or None', () => {
    expect(mountPicker('T1566.001').find('.current').text()).toBe('T1566.001 Phishing: Spearphishing Attachment');
    expect(mountPicker('none').find('.current').text()).toBe('None');
    expect(mountPicker(undefined).find('.current').text()).toBe('None');
  });

  it('opens a list of all techniques, and filters it while typing', async () => {
    await mountPicker('T1059').find('.current').trigger('click');
    expect(options()).toHaveLength(4);
    await picker.find('input').setValue('spear');
    expect(options()).toEqual([
      'T1566.001 Phishing: Spearphishing Attachment',
      'T1566.002 Phishing: Spearphishing Link',
    ]);
    await picker.find('input').setValue('voice');
    expect(options()).toEqual([]);
    expect(picker.find('.no-match').text()).toBe('No technique matches "voice"');
  });

  it('chooses the technique that is clicked', async () => {
    await mountPicker('T1059').find('.current').trigger('click');
    await picker.findAll('[role="option"]')[2].trigger('mousedown');
    expect(chosen()).toEqual(['T1566.001']);
    expect(picker.find('[role="listbox"]').exists()).toBe(false);
  });

  it('chooses with the arrow keys and Enter', async () => {
    await mountPicker().find('.current').trigger('click');
    const input = picker.find('input');
    await input.setValue('1566');
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'ArrowUp' });
    await input.trigger('keydown', { key: 'Enter' });
    expect(chosen()).toEqual(['T1566.001']);
  });

  it('changes nothing on Esc or when leaving the field', async () => {
    await mountPicker('T1059').find('.current').trigger('click');
    await picker.find('input').setValue('spear');
    await picker.find('input').trigger('keydown', { key: 'Escape' });
    expect(picker.find('[role="listbox"]').exists()).toBe(false);
    await picker.find('.current').trigger('click');
    await picker.find('input').trigger('blur');
    expect(picker.find('[role="listbox"]').exists()).toBe(false);
    expect(chosen()).toBeUndefined();
    expect(picker.find('.current').text()).toBe('T1059 Command and Scripting Interpreter');
  });

  it('starts searching when a letter is typed on the field', async () => {
    await mountPicker('T1059').find('.current').trigger('keydown', { key: 'h' });
    expect((picker.find('input').element as HTMLInputElement).value).toBe('h');
    expect(options()).toHaveLength(3);
  });

  it('searches any part of the ID or the name by default', async () => {
    picker = mount(OptionPicker, {
      props: {
        modelValue: 'none',
        options: [
          { id: 'DOS-1', name: 'DDoS detection' },
          { id: 'FIN-1', name: 'Fraud in payments' },
        ],
      },
      global: { stubs: { teleport: true } },
      attachTo: document.body,
    });
    await picker.find('.current').trigger('click');
    await picker.find('input').setValue('-1 fraud');
    expect(options()).toEqual(['FIN-1 Fraud in payments']);
  });

  it('clears the value with the × button, which only shows when a value is set', async () => {
    await mountPicker('T1566').find('.clear').trigger('click');
    expect(chosen()).toEqual(['none']);
    expect(mountPicker('none').find('.clear').exists()).toBe(false);
  });
});
