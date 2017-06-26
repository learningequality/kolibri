/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

import Vue from 'vue-test';
import contentRenderer from '../src/views/content-renderer';

const ContentRendererComponent = Vue.extend(contentRenderer);
import assert from 'assert';
import sinon from 'sinon';

describe('contentRenderer Component', function () {
  beforeEach(function () {
    this.kind = 'test';
    this.files = [
      {
        available: true,
        extension: 'tst',
      },
    ];
    this.id = 'testing';
  });
  describe('computed property', function () {
    describe('availableFiles', function () {
      it('should be 1 when there is one available file', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        assert.equal(this.vm.availableFiles.length, 1);
      });
      it('should be 1 when there is one available file and a supplementary file', function () {
        this.files.push({
          available: true,
          supplementary: true,
          extension: 'vtt',
        });
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        assert.equal(this.vm.availableFiles.length, 1);
      });
      it('should be 1 when there is one available file and a thumbnail file', function () {
        this.files.push({
          available: true,
          thumbnail: true,
          extension: 'vtt',
        });
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        assert.equal(this.vm.availableFiles.length, 1);
      });
      it('should be 2 when there are two available files', function () {
        this.files.push({
          available: true,
          extension: 'vtt',
        });
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        assert.equal(this.vm.availableFiles.length, 2);
      });
    });
    describe('defaultFile', function () {
      it('should be the file when there is one available file', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        assert.equal(this.vm.defaultFile, this.files[0]);
      });
      it('should be undefined when there are no available files', function () {
        this.files = [];
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        assert.equal(typeof this.vm.defaultFile, 'undefined');
      });
    });
    describe('extension', function () {
      it('should be the file\'s extension when there is one available file', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        assert.equal(this.vm.extension, this.files[0].extension);
      });
      it('should be undefined when there are no available files', function () {
        this.files = [];
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        assert.equal(typeof this.vm.extension, 'undefined');
      });
    });
  });
  describe('method', function () {
    describe('updateRendererComponent', function () {
      describe('when content is available', function () {
        beforeEach(function () {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: this.id,
              kind: this.kind,
              files: this.files,
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
        it('should set currentViewClass to returned component', function () {
          return new Promise((resolve) => {
            this.vm.updateRendererComponent().then(() => {
              assert.equal(this.vm.currentViewClass, this.component);
              resolve();
            });
          });
        });
        it('should call initSession', function () {
          return new Promise((resolve) => {
            this.vm.updateRendererComponent().then(() => {
              assert.ok(this.initSessionSpy.calledOnce);
              resolve();
            });
          });
        });
        describe('when no renderer is available', function () {
          it('should set noRendererAvailable to true', function () {
            this.vm.Kolibri = {
              retrieveContentRenderer: () => Promise.reject(),
            };
            return new Promise((resolve) => {
              this.vm.updateRendererComponent().then(() => {
                assert.equal(this.vm.noRendererAvailable, true);
                resolve();
              });
            });
          });
        });
      });
      describe('when content is not available', function () {
        beforeEach(function () {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: this.id,
              kind: this.kind,
              files: this.files,
            },
          }).$mount();
        });
        it('should return null', function () {
          this.vm.available = false;
          return new Promise((resolve) => {
            this.vm.updateRendererComponent().then((component) => {
              assert.equal(component, null);
              resolve();
            });
          });
        });
      });
    });
  });
});
