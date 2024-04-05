import Vue from 'vue';
import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import DownloadButton from '../DownloadButton.vue';
import { RENDERER_SUFFIX } from '../constants';
import '@testing-library/jest-dom';

const getDownloadableFile = (isExercise = false) => {
  const PRESET = isExercise ? 'exercise' : 'thumbnail';

  // Register a component with the preset name so that the file is considered renderable
  Vue.component(PRESET + RENDERER_SUFFIX, { template: '<div></div>' });

  return {
    preset: PRESET,
    available: true,
    file_size: 100,
    storage_url: 'http://example.com/sample.png',
    extension: 'png',
    checksum: '1234567890',
  };
};

// A helper function to render the component with the given props and some default mocks
const renderComponent = props => {
  return render(DownloadButton, {
    routes: new VueRouter(),
    props: {
      files: [],
      nodeTitle: '',
      ...props,
    },
    store: {
      getters: {
        isAppContext: () => props.isAppContext || false,
      },
    },
  });
};

const SAVE_BUTTON_TEXT = 'Save to device';

describe('DownloadButton', () => {
  beforeEach(() => {
    Vue.options.components = {};
  });

  test('not render if isAppContext is true', () => {
    renderComponent({ isAppContext: true });
    expect(screen.queryByText(SAVE_BUTTON_TEXT)).not.toBeInTheDocument();
  });

  test('should not render if there are no downloadable files even if isAppContext is false', () => {
    renderComponent({
      isAppContext: false,
      files: [],
    });
    expect(screen.queryByText(SAVE_BUTTON_TEXT)).not.toBeInTheDocument();
  });

  test('should not render if isAppContext is false and there are only renderable exercise files', () => {
    renderComponent({
      isAppContext: false,
      files: [getDownloadableFile(true)],
    });
    expect(screen.queryByText(SAVE_BUTTON_TEXT)).not.toBeInTheDocument();
  });

  test('should render if isAppContext is false and there are renderable document files', async () => {
    renderComponent({
      isAppContext: false,
      files: [getDownloadableFile()],
    });
    expect(screen.getByText(SAVE_BUTTON_TEXT)).toBeInTheDocument();
  });
});
