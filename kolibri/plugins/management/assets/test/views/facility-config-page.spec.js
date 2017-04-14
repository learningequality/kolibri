/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const sinon = require('sinon');
const assert = require('assert');
const simulant = require('simulant');
const ConfigPage = require('../../src/views/facilities-config-page');

function makeWrapper(propsData) {
  const store = new Vuex.Store({
    state: {
      pageState: {
        settings: {
          learner_can_edit_username: false,
        }
      }
    },
    // TODO bring in real mutations, and test the state instead of just dispatch
    mutations: {
      CONFIG_PAGE_MODIFY_SETTING() {},
    }
  });
  const Ctor = Vue.extend(ConfigPage);
  return new Ctor({ propsData, store }).$mount();
}

function getElements(wrapper) {
  return {
    checkbox: wrapper.$el.querySelector('input[name="learner_can_edit_username"]'),
    resetButton: wrapper.$el.querySelector('button[name="reset-settings"]'),
    // this modal does not mount/unmount like in real browser; there is
    // weird behavior in general for child nodes in testing
    confirmResetModal: () => wrapper.$el.querySelector('#confirm-reset'),
    cancelResetButton: () => wrapper.$el.querySelector('button[name="cancel"]'),
    confirmResetButton: () => wrapper.$el.querySelector('button[name="reset"]'),
  };
}

function promisifyNextTick() {
  return new Promise((resolve) => {
    Vue.nextTick(() => { resolve(); });
  });
}

describe.only('facility config page view', () => {
  it('clicking checkboxes dispatches a modify action', () => {
    const wrapper = makeWrapper({});
    const dispatchSpy = sinon.spy(wrapper.$store, 'dispatch');
    const els = getElements(wrapper);
    simulant.fire(els.checkbox, 'change');
    sinon.assert.calledWith(dispatchSpy, 'CONFIG_PAGE_MODIFY_SETTING', {
      name: 'learner_can_edit_username',
      value: true,
    });
    dispatchSpy.restore();
  });

  it('clicking save dispatches a save action', () => {
    const wrapper = makeWrapper({});
    // wrapper.resetToDefaultSettings();
  });

  it('clicking reset brings up the confirmation modal', () => {
    const wrapper = makeWrapper({});
    const { resetButton } = getElements(wrapper);
    assert.equal(wrapper.showModal, false);
    simulant.fire(resetButton, 'click');
    assert.equal(wrapper.showModal, true);
  });

  it('canceling reset tears down the modal', () => {
    const wrapper = makeWrapper({});
    const { resetButton, cancelResetButton } = getElements(wrapper);
    assert.equal(wrapper.showModal, false);
    simulant.fire(resetButton, 'click');
    return promisifyNextTick()
    .then(() => {
      assert.equal(wrapper.showModal, true);
      const cancelButton = cancelResetButton();
      simulant.fire(cancelButton, 'click');
      assert.equal(wrapper.showModal, false);
    });
  });

  // TODO maybe DRY up the open-modal flow
  it('confirming reset calls the reset action', () => {
    const wrapper = makeWrapper({});
    const resetActionStub = sinon.stub(wrapper, 'resetFacilityConfig');
    const { resetButton, confirmResetButton } = getElements(wrapper);
    simulant.fire(resetButton, 'click');
    return promisifyNextTick()
    .then(() => {
      const confirmButton = confirmResetButton();
      simulant.fire(confirmButton, 'click');
      return promisifyNextTick();
    })
    .then(() => {
      assert.equal(wrapper.showModal, false);
      sinon.assert.called(resetActionStub);
    });
  });

  it('errors result in showing error notification', () => {

  });
});
