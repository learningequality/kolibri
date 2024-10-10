import Vue from 'vue';
import { RENDERER_SUFFIX } from 'kolibri.coreVue.vuex.constants';

export const canRenderContent = preset => Boolean(Vue.options.components[preset + RENDERER_SUFFIX]);

export const getRenderableFiles = files =>
  files.filter(
    file =>
      !file.thumbnail && !file.supplementary && file.available && canRenderContent(file.preset),
  );

export const getDefaultFile = files => (files && files.length ? files[0] : undefined);

export const getFilePreset = (file, preset) =>
  file ? file.preset : canRenderContent(preset) ? preset : null;
