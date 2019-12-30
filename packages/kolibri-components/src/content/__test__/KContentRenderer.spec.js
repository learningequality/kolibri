import Vue from 'vue';
import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import KContentRenderer from '../KContentRenderer';

describe('KContentRenderer Component', () => {
  beforeEach(() => {
    Vue.prototype.canRenderContent = () => true;
  });
  afterEach(() => {
    delete Vue.prototype.canRenderContent;
  });

  const defaultFile = {
    available: true,
    preset: 'tst',
    storage_url: '',
    id: '',
    priority: 0,
    file_size: 100,
    checksum: '',
    extension: 'mp4',
    lang: {
      id: 'en',
      lang_name: 'English',
      lang_direction: 'ltr',
    },
    supplementary: false,
    thumbnail: false,
    download_url: '',
  };
  const defaultFiles = [
    {
      ...defaultFile,
    },
  ];

  function defaultPropsDataFromFiles(files = defaultFiles) {
    return {
      files,
    };
  }

  describe('computed property', () => {
    describe('availableFiles', () => {
      function testAvailableFiles(files, expected) {
        const wrapper = mount(KContentRenderer, {
          propsData: defaultPropsDataFromFiles(files),
          store,
        });
        expect(wrapper.vm.availableFiles.length).toEqual(expected);
      }

      it('should be 0 if the mediator concludes that there are no compatible renderers', () => {
        Vue.prototype.canRenderContent = () => false;
        testAvailableFiles(defaultFiles, 0);
        Vue.prototype.canRenderContent = () => true;
      });

      it('should be 1 when there is one available file', () => {
        testAvailableFiles(defaultFiles, 1);
      });

      it('should be 1 when there is one available file and a supplementary file', () => {
        const newFiles = defaultFiles.concat({
          ...defaultFile,
          available: true,
          supplementary: true,
          preset: 'subtitle',
        });
        testAvailableFiles(newFiles, 1);
      });

      it('should be 1 when there is one available file and a thumbnail file', () => {
        const newFiles = defaultFiles.concat({
          ...defaultFile,
          available: true,
          thumbnail: true,
          preset: 'subtitle',
        });
        testAvailableFiles(newFiles, 1);
      });

      it('should be 2 when there are two available files', () => {
        const newFiles = defaultFiles.concat({
          ...defaultFile,
          available: true,
          preset: 'subtitle',
        });
        testAvailableFiles(newFiles, 2);
      });
    });

    describe('defaultFile', () => {
      function testDefaultFile(files, expected) {
        const wrapper = mount(KContentRenderer, {
          propsData: defaultPropsDataFromFiles(files),
          store,
        });
        expect(wrapper.vm.defaultFile).toEqual(expected);
      }

      it('should be the file when there is one available file', () => {
        testDefaultFile(defaultFiles, defaultFiles[0]);
      });

      it('should be undefined when there are no available files', () => {
        testDefaultFile([], undefined);
      });
    });
  });
});
