/* eslint-env mocha */
import Vue from 'vue-test';
import contentRenderer from '../src/views/content-renderer';
import { mount } from 'avoriaz';
import assert from 'assert';
import sinon from 'sinon';

describe('contentRenderer Component', () => {
  const defaultFiles = [
    {
      available: true,
      extension: 'tst',
    },
  ];

  function defaultPropsDataFromFiles(files = defaultFiles) {
    return {
      id: 'testing',
      kind: 'test',
      files,
    };
  }

  describe('computed property', () => {
    describe('availableFiles', () => {
      function testAvailableFiles(files, expected) {
        const wrapper = mount(contentRenderer, {
          propsData: defaultPropsDataFromFiles(files),
        });
        assert.equal(wrapper.vm.availableFiles.length, expected);
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
        const wrapper = mount(contentRenderer, {
          propsData: defaultPropsDataFromFiles(files),
        });
        assert.equal(wrapper.vm.defaultFile, expected);
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
        const wrapper = mount(contentRenderer, {
          propsData: defaultPropsDataFromFiles(files),
        });
        assert.equal(wrapper.vm.extension, expected);
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
          before(() => {
            Vue.prototype.Kolibri = {
              retrieveContentRenderer: () => Promise.resolve(dummyComponent),
            };
          });

          after(() => {
            Vue.prototype.Kolibri = {};
          });

          it('should set currentViewClass to returned component', () => {
            const props = Object.assign(defaultPropsDataFromFiles(), {
              available: true,
            });
            const wrapper = mount(contentRenderer, {
              propsData: props,
            });
            return Vue.nextTick().then(() => {
              assert.deepEqual(wrapper.vm.currentViewClass, dummyComponent);
            });
          });

          it('should call initSession', () => {
            const props = Object.assign(defaultPropsDataFromFiles(), {
              available: true,
              initSession: sinon.stub().returns(Promise.resolve()),
            });
            const wrapper = mount(contentRenderer, {
              propsData: props,
            });
            return Vue.nextTick().then(() => {
              assert.ok(wrapper.vm.initSession.calledOnce);
            });
          });
        });

        describe('when no renderer is available', () => {
          before(() => {
            Vue.prototype.Kolibri = {
              retrieveContentRenderer: () => Promise.reject({ message: 'oh no' }),
            };
          });

          after(() => {
            Vue.prototype.Kolibri = {};
          });

          it('calling updateRendererComponent should set noRendererAvailable to true', () => {
            const props = Object.assign(defaultPropsDataFromFiles(), {
              available: true,
            });
            const wrapper = mount(contentRenderer, {
              propsData: props,
            });
            // 'created' hook runs it once. Running it here again for testing.
            // TODO Look into how to do this without calling the method directly
            return wrapper.vm.updateRendererComponent().then(() => {
              assert.equal(wrapper.vm.noRendererAvailable, true);
            });
          });
        });
      });

      describe('when content is not available', () => {
        it('should return null', () => {
          const props = Object.assign(defaultPropsDataFromFiles(), {
            available: false,
          });
          const wrapper = mount(contentRenderer, {
            propsData: props,
          });
          // 'created' hook runs it once. Running it here again for testing.
          return wrapper.vm.updateRendererComponent().then(component => {
            assert.equal(component, null);
          });
        });
      });
    });
  });
});
