import Vue from 'vue';
import { render, screen } from '@testing-library/vue';
import kolibri from 'kolibri';
import DownloadButton from '../DownloadButton';

jest.mock('kolibri');

const getDownloadableFile = (isExercise = false) => {
  const PRESET = isExercise ? 'exercise' : 'thumbnail';

  // Mock the preset viewer component so that the file is considered renderable
  kolibri.presetViewerComponent = jest
    .fn()
    .mockImplementation(preset => (preset === PRESET ? { template: '<div></div>' } : null));

  return {
    preset: PRESET,
    available: true,
    file_size: 100,
    storage_url: 'http://example.com/sample.png',
    extension: 'png',
    checksum: '1234567890',
  };
};

const renderComponent = props =>
  render(DownloadButton, {
    props: {
      files: [],
      nodeTitle: '',
      ...props,
    },
  });

const SAVE_BUTTON_TEXT = 'Save to device';

describe('DownloadButton', () => {
  beforeEach(() => {
    Vue.options.components = {};
  });

  it('should not render if there are no downloadable files', () => {
    renderComponent({
      files: [],
    });

    expect(screen.queryByText(SAVE_BUTTON_TEXT)).not.toBeInTheDocument();
  });

  it('should not render if there are only renderable exercise files', () => {
    renderComponent({
      files: [getDownloadableFile(true)],
    });

    expect(screen.queryByText(SAVE_BUTTON_TEXT)).not.toBeInTheDocument();
  });

  it('should render if there are renderable document files', () => {
    renderComponent({
      files: [getDownloadableFile()],
    });

    expect(screen.getByText(SAVE_BUTTON_TEXT)).toBeInTheDocument();
  });
});
