<script setup lang="ts">
import { ref } from 'vue';
import { tacticsStore } from '@/stores/tactics';
import Swal from 'sweetalert2';
import { isYamlFile, readYamlFile } from '@/io/readYamlFile';
import { notifySuccess } from '@/components/common/notify';
import { domainNames } from '@/domain/domains';

const input = ref<HTMLInputElement>();
const isLoading = ref(false);
const store = tacticsStore();

// Load a DeTT&CT data source administration file. A short message confirms it; when the file has a problem, a dialog
// explains it and nothing changes (the previously loaded visibility stays). Data sources that ATT&CK does not know are
// ignored, with a warning.
const uploadFile = async () => {
  const file = input.value?.files?.[0];
  if (input.value) {
    input.value.value = ''; // Reset the input, so selecting the same file again is registered as a change.
  }
  if (!file) {
    return;
  }

  if (!isYamlFile(file)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid file type',
      text: 'Please select a valid DeTT&CT YAML file.',
    });
    return;
  }

  isLoading.value = true;
  try {
    const { unknownDataSources, dataSources } = store.processDettectYaml(await readYamlFile(file), file.name);
    if (unknownDataSources.length === 0) {
      const count = dataSources === 1 ? '1 data source' : `${dataSources} data sources`;
      notifySuccess(`DeTT&CT file loaded: ${count} for ${domainNames([store.domain])}`);
    } else {
      Swal.fire({
        icon: 'warning',
        titleText: 'DeTT&CT file loaded, with unknown data sources',
        text: `These data sources are not data components in MITRE ATT&CK v${store.attackVersion}, so they were ignored: ${unknownDataSources.join(', ')}.`,
      });
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      titleText: 'The DeTT&CT file was not loaded',
      text: `${(error as Error).message} Nothing was changed.`,
    });
  } finally {
    isLoading.value = false;
  }
};

// Add event listener to call uploadFile when file is selected
const onFileChange = () => {
  if (input.value?.files?.length) {
    uploadFile();
  }
};
</script>

<template>
  <div>
    <input ref="input" id="fileInput" type="file" @change="onFileChange" style="display: none" />
    <label for="fileInput" class="file-button" :class="{ loading: isLoading }">
      {{ isLoading ? 'Loading file...' : 'Load DeTT&CT YAML' }}
    </label>
  </div>
</template>

<style scoped>
.file-button {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 8px;
  cursor: pointer;
  background-color: var(--color-action);
  color: rgb(255, 255, 255);
  border: var(--border-control);
  border-radius: 4px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: 0.1s;
  height: 30px;
}

.file-button:hover {
  background-color: var(--color-action-hover);
  color: rgb(255, 255, 255);
}
</style>
