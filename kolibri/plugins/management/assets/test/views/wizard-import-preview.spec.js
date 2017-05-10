/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const simulant = require('simulant');
const sinon = require('sinon');
const assert = require('assert');
const Wizard = require('../../src/views/manage-content-page/wizard-import-preview');

Vue.use(Vuex);

function makeStore() {
  return new Vuex.Store({
    mutations: {
      SET_CONTENT_PAGE_WIZARD_BUSY() {},
    },
    state: {
      pageState: {
        wizardState: {
          driveList: [],
          busy: false,
          meta: {
            channels: [],
          },
        },
      },
    },
  });
}

function makeVm(options = {}) {
  const store = options.store || makeStore();
  const Ctor = Vue.extend(Wizard);
  Ctor.prototype.$tr = (...x) => x; // to silence errors
  return new Ctor(Object.assign(options, { store })).$mount();
}

function getElements(vm) {
  return {
    backButton: () => vm.$el.querySelector('button[name="go-back"]'),
    errorMessage: () => vm.$el.querySelector('.ImportError'),
    localImportContent: () => vm.$el.querySelector('.LocalImport'),
    modalBackButton: () => vm.$el.querySelector('button.header-btn.btn-back'),
    modalCancelButton: () => vm.$el.querySelector('.header-btn.btn-close'),
    networkImportContent: () => vm.$el.querySelector('.NetworkImport'),
    submitButton: () => vm.$el.querySelector('button[name="submit"]'),
  };
}

const setSource = (store, sourceType, sourceId) => {
  store.state.pageState.wizardState.meta = {
    sourceId,
    sourceName: `${sourceId} name`,
    sourceType,
    channels: [{ name: 'channel 1' }],
    error: null,
  };
};

// TODO: these only test that the right action was called; can improve with
// integration test covering mutations and store.state
describe('import preview wizard component', () => {
  describe('cancelling', () => {
    it('clicking modal "cancel" button closes the modal', () => {
      const vm = makeVm();
      const { modalCancelButton } = getElements(vm);
      const cancelStub = sinon.stub(vm, 'cancelImportExportWizard');
      simulant.fire(modalCancelButton(), 'click');

      return Vue.nextTick()
      .then(() => {
        sinon.assert.called(cancelStub);
      });
    });
  });

  describe('when there are errors', () => {
    let store;
    let vm;

    beforeEach(() => {
      store = makeStore();
      store.state.pageState.wizardState.meta.error = 'Does not exist.';
      vm = makeVm({ store });
    });

    it('"next" button is disabled', () => {
      const { submitButton } = getElements(vm);
      assert.equal(submitButton().getAttribute('disabled'), 'disabled');
    });

    it('shows an Error message in place of normal contents', () => {
      // not testing for correctness of contents
      const { errorMessage } = getElements(vm);
      assert(errorMessage());
    });
  });

  describe('when source is a local drive', () => {
    let store;

    beforeEach(() => {
      store = makeStore();
      setSource(store, 'local', 'awesome_drive_id');
    });

    it('shows the correct body content', () => {
      const vm = makeVm({ store });
      const { localImportContent, networkImportContent } = getElements(vm);
      // weaker test for presence of div, not correctness of contents
      assert(localImportContent());
      assert.equal(networkImportContent(), null);
    });

    it('clicking next triggers a local import task', () => {
      const vm = makeVm({ store });
      const { submitButton } = getElements(vm);
      const triggerTaskStub = sinon.stub(vm, 'triggerLocalContentImportTask');
      simulant.fire(submitButton(), 'click');

      return Vue.nextTick()
      .then(() => {
        sinon.assert.calledOnce(triggerTaskStub);
        sinon.assert.calledWith(triggerTaskStub, 'awesome_drive_id');
      });
    });

    it('clicking modal "back" button goes to right screen', () => {
      const vm = makeVm({ store });
      const { modalBackButton } = getElements(vm);
      const goBackStub = sinon.stub(vm, 'startImportWizard');
      simulant.fire(modalBackButton(), 'click');

      return Vue.nextTick()
      .then(() => {
        sinon.assert.called(goBackStub);
      });
    });

    it('clicking other "back" button goes to right screen', () => {
      const vm = makeVm({ store });
      const { backButton } = getElements(vm);
      const goBackStub = sinon.stub(vm, 'startImportWizard');
      simulant.fire(backButton(), 'click');

      return Vue.nextTick()
      .then(() => {
        sinon.assert.called(goBackStub);
      });
    });
  });

  describe('when source is a channel from the network', () => {
    let store;

    beforeEach(() => {
      store = makeStore();
      setSource(store, 'network', 'awesome_channel_id');
    });

    it('shows the correct body content', () => {
      const vm = makeVm({ store });
      const { localImportContent, networkImportContent } = getElements(vm);
      // weaker test for presence of div, not correctness of contents
      assert(networkImportContent());
      assert.equal(localImportContent(), null);
    });

    it('clicking "next" triggers a remote import task', () => {
      const vm = makeVm({ store });
      const { submitButton } = getElements(vm);
      const triggerTaskStub = sinon.stub(vm, 'triggerRemoteContentImportTask');
      simulant.fire(submitButton(), 'click');

      return Vue.nextTick()
      .then(() => {
        sinon.assert.calledOnce(triggerTaskStub);
        sinon.assert.calledWith(triggerTaskStub, 'awesome_channel_id');
      });
    });

    it('clicking modal "back" button goes to right screen', () => {
      const vm = makeVm({ store });
      const { modalBackButton } = getElements(vm);
      const goBackStub = sinon.stub(vm, 'showImportNetworkWizard');
      simulant.fire(modalBackButton(), 'click');

      return Vue.nextTick()
      .then(() => {
        sinon.assert.called(goBackStub);
      });
    });

    it('clicking other "back" button goes to right screen', () => {
      const vm = makeVm({ store });
      const { backButton } = getElements(vm);
      const goBackStub = sinon.stub(vm, 'showImportNetworkWizard');
      simulant.fire(backButton(), 'click');

      return Vue.nextTick()
      .then(() => {
        sinon.assert.called(goBackStub);
      });
    });
  });
});
