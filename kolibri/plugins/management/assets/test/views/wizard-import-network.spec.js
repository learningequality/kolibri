/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const simulant = require('simulant');
const sinon = require('sinon');
const Wizard = require('../../src/views/manage-content-page/wizard-import-network');

Vue.use(Vuex);

function makeVm(options = {}) {
  const store = new Vuex.Store({
    mutations: {
      SET_CONTENT_PAGE_WIZARD_BUSY() {},
    },
    state: {
      pageState: {
        wizardState: {
          driveList: [],
          busy: false,
        },
      },
    },
  });
  const Ctor = Vue.extend(Wizard);
  return new Ctor(Object.assign(options, { store })).$mount();
}

function getElements(vm) {
  return {
    backButton: () => vm.$el.querySelector('button[name="back"]'),
    nextButton: () => vm.$el.querySelector('button[name="next"]'),
    modalBackButton: () => vm.$el.querySelector('button.header-btn.btn-back'),
  };
}

describe('network import wizard component', () => {
  it('clicking "next" calls the import preview wizard', () => {
    const vm = makeVm({ data: { contentId: 'awesome_channel' } });
    const showPreviewStub = sinon.stub(vm, 'showNetworkImportPreview');
    const { nextButton } = getElements(vm);
    simulant.fire(nextButton(), 'click');

    return Vue.nextTick()
    .then(() => {
      sinon.assert.calledOnce(showPreviewStub);
      sinon.assert.calledWith(showPreviewStub, 'awesome_channel');
    });
  });

  it('clicking "back" buttons goes to the correct screen', () => {
    const vm = makeVm({ data: { contentId: 'awesome_channel' } });
    const goBackStub = sinon.stub(vm, 'showImportLocalWizard');
    const { backButton, modalBackButton } = getElements(vm);
    // cheating and clicking both buttons in one test
    simulant.fire(modalBackButton(), 'click');
    simulant.fire(backButton(), 'click');

    return Vue.nextTick()
    .then(() => {
      sinon.assert.calledTwice(goBackStub);
    });
  });

  // not tested: validation, clicking cancel
});
