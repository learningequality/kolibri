/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

import Vue from 'vue-test';
import contentRenderer from '../src/views/content-renderer';
import { mount } from 'avoriaz';

const ContentRendererComponent = Vue.extend(contentRenderer);
import assert from 'assert';
import sinon from 'sinon';

describe('contentRenderer Component', function() {
  const defaultFiles = [
    {
      available: true,
      extension: 'tst',
    },
  ];

  describe('computed property', function() {
    function defaultPropsDataFromFiles(files) {
      return {
        id: 'testing',
        kind: 'test',
        files,
      };
    }

    describe('availableFiles', function() {
      function testAvailableFiles(files, expected) {
        const wrapper = mount(contentRenderer, {
          propsData: defaultPropsDataFromFiles(files),
        });
        assert.equal(wrapper.vm.availableFiles.length, expected);
      }

      it('should be 1 when there is one available file', function() {
        testAvailableFiles(defaultFiles, 1);
      });

      it('should be 1 when there is one available file and a supplementary file', function() {
        const newFiles = defaultFiles.concat({
          available: true,
          supplementary: true,
          extension: 'vtt',
        });
        testAvailableFiles(newFiles, 1);
      });

      it('should be 1 when there is one available file and a thumbnail file', function() {
        const newFiles = defaultFiles.concat({
          available: true,
          thumbnail: true,
          extension: 'vtt',
        });
        testAvailableFiles(newFiles, 1);
      });

      it('should be 2 when there are two available files', function() {
        const newFiles = defaultFiles.concat({
          available: true,
          extension: 'vtt',
        });
        testAvailableFiles(newFiles, 2);
      });
    });

    describe('defaultFile', function() {
      function testDefaultFile(files, expected) {
        const wrapper = mount(contentRenderer, {
          propsData: defaultPropsDataFromFiles(files),
        });
        assert.equal(wrapper.vm.defaultFile, expected);
      }

      it('should be the file when there is one available file', function() {
        testDefaultFile(defaultFiles, defaultFiles[0]);
      });

      it('should be undefined when there are no available files', function() {
        testDefaultFile([], undefined);
      });
    });

    describe('extension', function() {
      function testExtension(files, expected) {
        const wrapper = mount(contentRenderer, {
          propsData: defaultPropsDataFromFiles(files),
        });
        assert.equal(wrapper.vm.extension, expected);
      }

      it("should be the file's extension when there is one available file", function() {
        testExtension(defaultFiles, defaultFiles[0].extension);
      });

      it('should be undefined when there are no available files', function() {
        testExtension([], undefined);
      });
    });
  });

  describe('method', function() {
    describe('updateRendererComponent', function() {
      describe('when content is available', function() {
        beforeEach(function() {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: 'test',
              kind: 'test',
              files: defaultFiles,
            },
          }).$mount();
          this.vm.available = true;
          this.component = { test: 'testing' };
          this.initSessionSpy = sinon.stub();
          this.initSessionSpy.returns(Promise.resolve({}));
          this.vm.initSession = this.initSessionSpy;
          this.vm.Kolibri = {
            retrieveContentRenderer: () => Promise.resolve(this.component),
          };
        });
        it('should set currentViewClass to returned component', function() {
          return new Promise(resolve => {
            this.vm.updateRendererComponent().then(() => {
              assert.equal(this.vm.currentViewClass, this.component);
              resolve();
            });
          });
        });
        it('should call initSession', function() {
          return new Promise(resolve => {
            this.vm.updateRendererComponent().then(() => {
              assert.ok(this.initSessionSpy.calledOnce);
              resolve();
            });
          });
        });
        describe('when no renderer is available', function() {
          it('should set noRendererAvailable to true', function() {
            this.vm.Kolibri = {
              retrieveContentRenderer: () => Promise.reject(),
            };
            return new Promise(resolve => {
              this.vm.updateRendererComponent().then(() => {
                assert.equal(this.vm.noRendererAvailable, true);
                resolve();
              });
            });
          });
        });
      });
      describe('when content is not available', function() {
        beforeEach(function() {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: 'testing',
              kind: 'test',
              files: defaultFiles,
            },
          }).$mount();
        });
        it('should return null', function() {
          this.vm.available = false;
          return new Promise(resolve => {
            this.vm.updateRendererComponent().then(component => {
              assert.equal(component, null);
              resolve();
            });
          });
        });
      });
    });
  });
});
