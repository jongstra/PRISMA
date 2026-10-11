import pluginVue from 'eslint-plugin-vue';
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';

// Vue's standard rules: the essential rules for Vue and the recommended rules for TypeScript.
export default withVueTs(
  { ignores: ['dist/**', 'coverage/**'] },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    rules: {
      // Allow component names of one word, such as Heatmap.
      'vue/multi-word-component-names': 'off',
    },
  },
);
