import { modernModuleResolution } from '@rushstack/eslint-patch/modern-module-resolution';
import kolibriConfig from 'kolibri-format/eslint.config.mjs'; 

modernModuleResolution();

export default [
  ...kolibriConfig,
];
