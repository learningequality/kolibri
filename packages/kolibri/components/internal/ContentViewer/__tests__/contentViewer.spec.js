import Vue from 'vue';
import { VIEWER_SUFFIX } from 'kolibri/constants';
import { canRenderContent, getRenderableFiles, getDefaultFile, getFilePreset } from '../utils';

// Add a component to the Vue instance that can be used to test the utility functions
const addRegisterableComponents = (...presets) => {
  presets.forEach(preset => {
    Vue.component(preset + VIEWER_SUFFIX, { template: '<div></div>' });
  });
};

describe('Utility Functions', () => {
  beforeEach(() => {
    Vue.options.components = {};
  });

  describe('canRenderContent', () => {
    it('returns true if preset viewer component is registered', () => {
      addRegisterableComponents('preset1');
      expect(canRenderContent('preset1')).toBe(true);
    });

    it('returns false if preset viewer component is not registered', () => {
      expect(canRenderContent('preset2')).toBe(false);
    });
  });

  describe('getRenderableFiles', () => {
    it('returns renderable files (files which are available, can be rendered and do not have a thumbnail)', () => {
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

    it('returns empty array if no renderable file is available', () => {
      const files = [
        { preset: 'preset1', available: false },
        { preset: 'preset2', available: false, thumbnail: true },
        { preset: 'preset3', available: false, supplementary: true },
      ];

      expect(getRenderableFiles(files)).toEqual([]);
    });
  });

  describe('getDefaultFile', () => {
    it('returns first file if files array is not empty', () => {
      const files = [{ name: 'file1' }, { name: 'file2' }];
      expect(getDefaultFile(files)).toEqual({ name: 'file1' });
    });

    it('returns undefined if files array is empty', () => {
      expect(getDefaultFile([])).toBeUndefined();
    });
  });

  describe('getFilePreset', () => {
    it('returns file preset if file exists', () => {
      const file = { preset: 'preset1' };
      expect(getFilePreset(file, 'defaultPreset')).toBe('preset1');
    });

    it('returns default preset if file does not exist but can render content', () => {
      addRegisterableComponents('defaultPreset');
      expect(getFilePreset(null, 'defaultPreset')).toBe('defaultPreset');
    });

    it('returns null if file does not exist and cannot render content', () => {
      expect(getFilePreset(null, 'defaultPreset')).toBeNull();
    });
  });
});
