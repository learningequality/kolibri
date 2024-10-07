import Vue from 'vue';
import { RENDERER_SUFFIX } from 'kolibri.coreVue.vuex.constants';
import { canRenderContent, getRenderableFiles, getDefaultFile, getFilePreset } from '../utils';

// Add a component to the Vue instance that can be used to test the utility functions
const addRegisterableComponents = (...presets) => {
  presets.forEach(preset => {
    Vue.component(preset + RENDERER_SUFFIX, { template: '<div></div>' });
  });
};

describe('Utility Functions', () => {
  beforeEach(() => {
    Vue.options.components = {};
  });

  describe('canRenderContent', () => {
    test('returns true if preset renderer component is registered', () => {
      addRegisterableComponents('preset1');
      expect(canRenderContent('preset1')).toBe(true);
    });

    test('returns false if preset renderer component is not registered', () => {
      expect(canRenderContent('preset2')).toBe(false);
    });
  });

  describe('getRenderableFiles', () => {
    test('returns renderable files (files which are available, can be rendered and do not have a thumbnail)', () => {
      const files = [
        { preset: 'preset1', available: true },
        { preset: 'preset2', available: true },
        { preset: 'preset3', available: false },
        { preset: 'preset4', available: true, thumbnail: true },
      ];
      addRegisterableComponents('preset1', 'preset3', 'preset4');

      const renderableFiles = getRenderableFiles(files);
      expect(renderableFiles).toHaveLength(1);
      expect(renderableFiles[0]).toEqual(files[0]);
    });

    test('returns empty array if no renderable file is available', () => {
      const files = [
        { preset: 'preset1', available: false },
        { preset: 'preset2', available: false, thumbnail: true },
        { preset: 'preset3', available: false, supplementary: true },
      ];

      expect(getRenderableFiles(files)).toEqual([]);
    });
  });

  describe('getDefaultFile', () => {
    test('returns first file if files array is not empty', () => {
      const files = [{ name: 'file1' }, { name: 'file2' }];
      expect(getDefaultFile(files)).toEqual({ name: 'file1' });
    });

    test('returns undefined if files array is empty', () => {
      expect(getDefaultFile([])).toBeUndefined();
    });
  });

  describe('getFilePreset', () => {
    test('returns file preset if file exists', () => {
      const file = { preset: 'preset1' };
      expect(getFilePreset(file, 'defaultPreset')).toBe('preset1');
    });

    test('returns default preset if file does not exist but can render content', () => {
      addRegisterableComponents('defaultPreset');
      expect(getFilePreset(null, 'defaultPreset')).toBe('defaultPreset');
    });

    test('returns null if file does not exist and cannot render content', () => {
      expect(getFilePreset(null, 'defaultPreset')).toBeNull();
    });
  });
});
