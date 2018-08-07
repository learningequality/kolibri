import Vue from 'vue';
import { mount } from '@vue/test-utils';
import EpubRendererIndex from '../src/views/EpubRendererIndex';


describe('EPUB renderer', () => {

  describe('computed property', () => {
    const wrapper = mount(EpubRendererIndex);

    describe('availableFiles', () => {
      function testAvailableFiles(files, expected) {
        const wrapper = mount(EpubRendererIndex, {
          propsData: defaultPropsDataFromFiles(files),
        });
        expect(wrapper.vm.availableFiles.length).toEqual(expected);
      }

      it('should be 1 when there is one available file', () => {
        testAvailableFiles(defaultFiles, 1);
      });

      it('should be 1 when there is one available file and a supplementary file', () => {
        const newFiles = defaultFiles.concat({
          available: true,
          supplementary: true,
          extension: 'vtt',
        });
        testAvailableFiles(newFiles, 1);
      });

      it('should be 1 when there is one available file and a thumbnail file', () => {
        const newFiles = defaultFiles.concat({
          available: true,
          thumbnail: true,
          extension: 'vtt',
        });
        testAvailableFiles(newFiles, 1);
      });

      it('should be 2 when there are two available files', () => {
        const newFiles = defaultFiles.concat({
          available: true,
          extension: 'vtt',
        });
        testAvailableFiles(newFiles, 2);
      });
    });

    describe('defaultFile', () => {
      function testDefaultFile(files, expected) {
        const wrapper = mount(EpubRendererIndex, {
          propsData: defaultPropsDataFromFiles(files),
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

    describe('extension', () => {
      function testExtension(files, expected) {
        const wrapper = mount(EpubRendererIndex, {
          propsData: defaultPropsDataFromFiles(files),
        });
        expect(wrapper.vm.extension).toEqual(expected);
      }

      it("should be the file's extension when there is one available file", () => {
        testExtension(defaultFiles, defaultFiles[0].extension);
      });

      it('should be undefined when there are no available files', () => {
        testExtension([], undefined);
      });
    });
  });

  describe('method', () => {
    describe('updateRendererComponent', () => {
      describe('when content is available', () => {
        describe('when renderer is available', () => {
          const dummyComponent = { test: 'testing' };
          beforeEach(() => {
            Vue.prototype.Kolibri = {
              retrieveEpubRendererIndex: () => Promise.resolve(dummyComponent),
            };
          });

          afterEach(() => {
            Vue.prototype.Kolibri = {};
          });

          it('should set currentViewClass to returned component', () => {
            const props = Object.assign(defaultPropsDataFromFiles(), {
              available: true,
            });
            const wrapper = mount(EpubRendererIndex, {
              propsData: props,
            });
            return Vue.nextTick().then(() => {
              expect(wrapper.vm.currentViewClass).toEqual(dummyComponent);
            });
          });

          it('should call initSession', () => {
            const props = Object.assign(defaultPropsDataFromFiles(), {
              available: true,
              initSession: jest.fn().mockResolvedValue(),
            });
            const wrapper = mount(EpubRendererIndex, {
              propsData: props,
            });
            return Vue.nextTick().then(() => {
              expect(wrapper.vm.initSession).toHaveBeenCalledTimes(1);
            });
          });
        });

        describe('when no renderer is available', () => {
          beforeEach(() => {
            Vue.prototype.Kolibri = {
              retrieveEpubRendererIndex: () => Promise.reject({ message: 'oh no' }),
            };
          });

          afterEach(() => {
            Vue.prototype.Kolibri = {};
          });

          it('calling updateRendererComponent should set noRendererAvailable to true', () => {
            const props = Object.assign(defaultPropsDataFromFiles(), {
              available: true,
            });
            const wrapper = mount(EpubRendererIndex, {
              propsData: props,
            });
            // 'created' hook runs it once. Running it here again for testing.
            // TODO Look into how to do this without calling the method directly
            return wrapper.vm.updateRendererComponent().then(() => {
              expect(wrapper.vm.noRendererAvailable).toEqual(true);
            });
          });
        });
      });

      describe('when content is not available', () => {
        it('should return null', () => {
          const props = Object.assign(defaultPropsDataFromFiles(), {
            available: false,
          });
          const wrapper = mount(EpubRendererIndex, {
            propsData: props,
          });
          // 'created' hook runs it once. Running it here again for testing.
          return wrapper.vm.updateRendererComponent().then(component => {
            expect(component).toEqual(null);
          });
        });
      });
    });
  });
});
