/* eslint-env mocha */
// The following two rules are disabled so that we can use anonymous functions with mocha
// This allows the test instance to be properly referenced with `this`
/* eslint prefer-arrow-callback: "off", func-names: "off" */

'use strict';

const Vue = require('vue-test');
const contentRenderer = require('../src/vue/content-renderer');
const ContentRendererComponent = Vue.extend(contentRenderer);
const assert = require('assert');
const sinon = require('sinon');

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
          this.spy = sinon.spy(this.vm, 'renderContent');
          this.component = { test: 'testing' };
          this.vm.Kolibri = {
            retrieveContentRenderer: () => Promise.resolve(this.component),
          };
        });
        it('should set rendered to false', function () {
          this.vm.updateRendererComponent();
          assert.equal(this.vm.rendered, false);
        });
        it('should set currentViewClass to returned component', function () {
          return new Promise((resolve) => {
            this.vm.updateRendererComponent().then(() => {
              assert.equal(this.vm.currentViewClass, this.component);
              resolve();
            });
          });
        });
        it('should call renderContent if ready', function () {
          this.vm.ready = true;
          return new Promise((resolve) => {
            this.vm.updateRendererComponent().then(() => {
              assert.ok(this.spy.calledOnce);
              resolve();
            });
          });
        });
        it('should not call renderContent if not ready', function () {
          this.vm.ready = false;
          return new Promise((resolve) => {
            this.vm.updateRendererComponent().then(() => {
              assert.ok(!this.spy.called);
              resolve();
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
    describe('renderContent', function () {
      describe('if it has a component, is available, and is not rendered', function () {
        beforeEach(function () {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: this.id,
              kind: this.kind,
              files: this.files,
            },
          }).$mount();
          this.instanceSpy = sinon.createStubInstance(Vue);
          this.constructorSpy = sinon.stub();
          this.constructorSpy.returns(this.instanceSpy);
          this.vm.Kolibri = {
            lib: {
              vue: this.constructorSpy,
            },
          };
          this.component = { test: 'testing' };
          this.vm.currentViewClass = this.component;
          this.vm.available = true;
          this.vm.rendered = false;
          this.initSessionSpy = sinon.stub();
          this.initSessionSpy.returns(Promise.resolve());
          this.vm.initSession = this.initSessionSpy;
        });
        it('should set rendered to true', function () {
          this.vm.renderContent();
          assert.ok(this.vm.rendered);
        });
        describe('when initSession completes', function () {
          it('should create a new component', function (done) {
            this.vm.renderContent().then(() => {
              assert.ok(this.constructorSpy.calledWithNew());
              done();
            });
          });
          it('should create a new component with parent option', function (done) {
            this.vm.renderContent().then(() => {
              assert.equal(this.constructorSpy.args[0][0].parent, this.vm);
              done();
            });
          });
          it('should create a new component with el option', function (done) {
            this.testContainer = { test: 'test' };
            this.vm.$refs.container = this.testContainer;
            this.vm.renderContent().then(() => {
              assert.equal(this.constructorSpy.args[0][0].el, this.testContainer);
              done();
            });
          });
          it('should create a new component with propsData option', function (done) {
            this.vm.renderContent().then(() => {
              assert.deepEqual(this.constructorSpy.args[0][0].propsData, {
                id: this.id,
                kind: this.kind,
                files: this.files,
                defaultFile: this.files[0],
                contentId: '',
                channelId: '',
                available: true,
              });
              done();
            });
          });
          it('should call $on for startTracking', function (done) {
            this.vm.renderContent().then(() => {
              assert.ok(this.instanceSpy.$on.firstCall.calledWith('startTracking'));
              done();
            });
          });
          it('should call $on for stopTracking', function (done) {
            this.vm.renderContent().then(() => {
              assert.ok(this.instanceSpy.$on.secondCall.calledWith('stopTracking'));
              done();
            });
          });
          it('should call $on for progressUpdate', function (done) {
            this.vm.renderContent().then(() => {
              assert.ok(this.instanceSpy.$on.thirdCall.calledWith('progressUpdate'));
              done();
            });
          });
        });
      });
      describe('if it has no component', function () {
        it('should return null', function () {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: this.id,
              kind: this.kind,
              files: this.files,
            },
          }).$mount();
          this.vm.currentViewClass = null;
          this.vm.available = true;
          this.vm.rendered = false;
          assert.equal(this.vm.renderContent(), null);
        });
      });
      describe('if it is not available', function () {
        it('should return null', function () {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: this.id,
              kind: this.kind,
              files: this.files,
            },
          }).$mount();
          this.vm.currentViewClass = {};
          this.vm.available = false;
          this.vm.rendered = false;
          assert.equal(this.vm.renderContent(), null);
        });
      });
      describe('if it is rendered', function () {
        it('should return null', function () {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: this.id,
              kind: this.kind,
              files: this.files,
            },
          }).$mount();
          this.vm.currentViewClass = {};
          this.vm.available = true;
          this.vm.rendered = true;
          assert.equal(this.vm.renderContent(), null);
        });
      });
    });
    describe('wrappedStartTracking', function () {
      beforeEach(function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        this.unCacheSpy = sinon.spy();
        this.vm.Kolibri = {
          resources: {
            ContentNodeResource: {
              unCacheModel: this.unCacheSpy,
            },
          },
        };
        this.startTrackingSpy = sinon.spy();
        this.vm.startTracking = this.startTrackingSpy;
        this.vm.wrappedStartTracking();
      });
      it('should call contentNode resource uncache with the id', function () {
        assert.ok(this.unCacheSpy.calledWithExactly(this.id));
      });
      it('should call startTracking once', function () {
        assert.ok(this.startTrackingSpy.calledOnce);
      });
    });
  });
});
