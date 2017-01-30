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
    describe('contentType', function () {
      it('should be kind/extension when both are defined', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        assert.equal(this.vm.contentType, `${this.kind}/${this.files[0].extension}`);
      });
      it('should be undefined when kind is undefined', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: undefined,
            files: this.files,
          },
        }).$mount();
        assert.equal(typeof this.vm.contentType, 'undefined');
      });
      it('should be undefined when extension is undefined', function () {
        delete this.extension;
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: [],
          },
        }).$mount();
        assert.equal(typeof this.vm.contentType, 'undefined');
      });
    });
  });
  describe('method', function () {
    describe('clearListeners', function () {
      describe('when there are two listeners active', function () {
        beforeEach(function () {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: this.id,
              kind: this.kind,
              files: this.files,
            },
          }).$mount();
          this.eventListeners = [
            {
              event: 'test1',
              callback: 'testing1',
            },
            {
              event: 'test2',
              callback: 'testing2',
            },
          ];
          this.vm._eventListeners = this.eventListeners;
          this.spy = sinon.spy();
          this.vm.Kolibri = {
            off: this.spy,
          };
        });
        it('should invoke this.Kolibri.off twice', function () {
          this.vm.clearListeners();
          assert.ok(this.spy.calledTwice);
        });
        it('should invoke this.Kolibri.off with the first event first', function () {
          this.vm.clearListeners();
          assert.ok(this.spy.firstCall.calledWithExactly(
            this.eventListeners[0].event, this.eventListeners[0].callback));
        });
        it('should invoke this.Kolibri.off with the second event second', function () {
          this.vm.clearListeners();
          assert.ok(this.spy.secondCall.calledWithExactly(
            this.eventListeners[1].event, this.eventListeners[1].callback));
        });
        it('should _eventListeners to an empty array', function () {
          this.vm.clearListeners();
          assert.deepEqual(this.vm._eventListeners, []);
        });
      });
    });
    describe('findRendererComponent', function () {
      it('should invoke clearListeners', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        const spy = sinon.stub(this.vm, 'clearListeners');
        this.vm.findRendererComponent();
        assert.ok(spy.calledOnce);
      });
      describe('when content is available', function () {
        beforeEach(function () {
          this.vm = new ContentRendererComponent({
            propsData: {
              id: this.id,
              kind: this.kind,
              files: this.files,
            },
          }).$mount();
          this.vm.Kolibri = {
            once: () => {},
            emit: () => {},
          };
          this.setRenderComponent = () => {};
          this.vm.setRenderComponent = this.setRenderComponent;
        });
        it('should set rendered to false', function () {
          this.vm.available = true;
          this.vm.findRendererComponent();
          assert.equal(this.vm.rendered, false);
        });
        it('should invoke this.Kolibri.once with event argument', function () {
          this.vm.available = true;
          const spy = sinon.spy(this.vm.Kolibri, 'once');
          this.vm.findRendererComponent();
          assert.ok(spy.calledWith(`component_render:${this.kind}/${this.files[0].extension}`));
        });
        it('should add an object to _eventListeners', function () {
          this.vm.available = true;
          this.vm._eventListeners = [];
          this.vm.findRendererComponent();
          assert.equal(this.vm._eventListeners[0].event,
            `component_render:${this.kind}/${this.files[0].extension}`);
        });
        it('should invoke this.Kolibri.emit with event argument', function () {
          this.vm.available = true;
          const spy = sinon.spy(this.vm.Kolibri, 'emit');
          this.vm.findRendererComponent();
          assert.ok(spy.calledWithExactly(
            `content_render:${this.kind}/${this.files[0].extension}`));
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
          this.vm.Kolibri = {
            once: () => {},
            emit: () => {},
          };
          this.setRenderComponent = () => {};
          this.vm.setRenderComponent = this.setRenderComponent;
        });
        it('should not invoke this.Kolibri.once', function () {
          const spy = sinon.spy(this.vm.Kolibri, 'once');
          this.vm.findRendererComponent();
          assert.ok(!spy.called);
        });
        it('should not add an object to _eventListeners', function () {
          this.vm._eventListeners = [];
          this.vm.findRendererComponent();
          assert.deepEqual(this.vm._eventListeners, []);
        });
        it('should not invoke this.Kolibri.emit', function () {
          const spy = sinon.spy(this.vm.Kolibri, 'emit');
          this.vm.findRendererComponent();
          assert.ok(!spy.called);
        });
      });
    });
    describe('setRendererComponent', function () {
      it('should set currentViewClass to passed in component', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        const component = { test: 'testing' };
        this.vm.setRendererComponent(component);
        assert.equal(this.vm.currentViewClass, component);
      });
      it('should call renderContent if ready and not rendered', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        this.vm.ready = true;
        this.vm.rendered = false;
        const component = { test: 'testing' };
        const spy = sinon.spy(this.vm, 'renderContent');
        this.vm.setRendererComponent(component);
        assert.ok(spy.calledOnce);
      });
      it('should call not call renderContent if not ready', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        this.vm.ready = false;
        const component = { test: 'testing' };
        const spy = sinon.spy(this.vm, 'renderContent');
        this.vm.setRendererComponent(component);
        assert.ok(!spy.called);
      });
      it('should call not call renderContent if rendered', function () {
        this.vm = new ContentRendererComponent({
          propsData: {
            id: this.id,
            kind: this.kind,
            files: this.files,
          },
        }).$mount();
        this.vm.rendered = true;
        const component = { test: 'testing' };
        const spy = sinon.spy(this.vm, 'renderContent');
        this.vm.setRendererComponent(component);
        assert.ok(!spy.called);
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
          this.constructorSpy = sinon.spy(() => {
            this.instanceSpy = sinon.createStubInstance(Vue);
          });
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
          it('should create a new component', function () {
            this.vm.renderContent().then(() => {
              assert.ok(this.constructorSpy.calledWithNew());
            });
          });
          it('should create a new component with parent option', function () {
            this.vm.renderContent().then(() => {
              assert.equal(this.constructorSpy.args[0][0].parent, this.vm);
            });
          });
          it('should create a new component with el option', function () {
            this.vm.renderContent().then(() => {
              assert.equal(this.constructorSpy.args[0][0].el, this.vm.$refs.container);
            });
          });
          it('should create a new component with propsData option', function () {
            this.vm.renderContent().then(() => {
              assert.deepEqual(this.constructorSpy.args[0][0].propsData, {
                id: this.id,
                kind: this.kind,
                files: this.files,
                defaultFile: this.files[0],
              });
            });
          });
          it('should call $on for startTracking', function () {
            this.vm.renderContent().then(() => {
              assert.ok(this.instanceSpy.firstCall.calledWithExactly(
                'startTracking', this.vm.wrappedStartTracking));
            });
          });
          it('should call $on for stopTracking', function () {
            this.vm.renderContent().then(() => {
              assert.ok(this.instanceSpy.firstCall.calledWithExactly(
                'stopTracking', this.vm.stopTracking));
            });
          });
          it('should call $on for progressUpdate', function () {
            this.vm.renderContent().then(() => {
              assert.ok(this.instanceSpy.firstCall.calledWithExactly(
                'progressUpdate', this.vm.progressUpdate));
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
