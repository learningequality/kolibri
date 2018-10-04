/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import { mount } from '@vue/test-utils';
import sinon from 'sinon';
import contentRenderer from '../src/views/content-renderer';

describe('contentRenderer Component', () => {
  before(() => {
    Vue.prototype.Kolibri = {
      canRenderContent: () => true,
    };
  });
  after(() => {
    Vue.prototype.Kolibri = {};
  });
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
        expect(wrapper.vm.availableFiles.length).to.equal(expected);
      }

      it('should be 0 if the mediator concludes that there are no compatible renderers', () => {
        Vue.prototype.Kolibri.canRenderContent = () => false;
        testAvailableFiles(defaultFiles, 0);
        Vue.prototype.Kolibri.canRenderContent = () => true;
      });

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
        expect(wrapper.vm.defaultFile).to.equal(expected);
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
        expect(wrapper.vm.extension).to.equal(expected);
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
            Vue.prototype.Kolibri.retrieveContentRenderer = () => Promise.resolve(dummyComponent);
          });

          after(() => {
            delete Vue.prototype.Kolibri.retrieveContentRenderer;
          });

          it('should set currentViewClass to returned component', () => {
            const props = Object.assign(defaultPropsDataFromFiles(), {
              available: true,
            });
            const wrapper = mount(contentRenderer, {
              propsData: props,
            });
            return Vue.nextTick().then(() => {
              expect(wrapper.vm.currentViewClass).to.deep.equal(dummyComponent);
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
              sinon.assert.calledOnce(wrapper.vm.initSession);
            });
          });
        });

        describe('when no renderer is available', () => {
          before(() => {
            Vue.prototype.Kolibri.retrieveContentRenderer = () =>
              Promise.reject({ message: 'oh no' });
          });

          after(() => {
            delete Vue.prototype.Kolibri.retrieveContentRenderer;
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
              expect(wrapper.vm.noRendererAvailable).to.be.true;
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
            expect(component).to.equal(null);
          });
        });
      });
    });
  });
});
