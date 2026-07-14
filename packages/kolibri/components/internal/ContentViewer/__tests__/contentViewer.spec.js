// Mock kolibri before importing utils that depend on it
import kolibri from 'kolibri';
import { getRenderableFiles, getDefaultFile, getFilePreset } from '../utils';

jest.mock('kolibri', () => ({
  default: { presetViewerComponent: jest.fn() },
  __esModule: true,
}));

// Mock the preset viewer components so they can be used to test the utility functions
const addRegisterableComponents = (...presets) => {
  kolibri.presetViewerComponent.mockImplementation(preset =>
    presets.includes(preset) ? { template: '<div></div>' } : null,
  );
};

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to return null by default (no viewer registered)
    kolibri.presetViewerComponent.mockReturnValue(null);
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
