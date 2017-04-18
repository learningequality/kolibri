/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const sinon = require('sinon');
const assert = require('assert');
const simulant = require('simulant');
const ConfigPage = require('../../src/views/facilities-config-page');

function makeWrapper(propsData = {}) {
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
    cancelResetButton: () => wrapper.$el.querySelector('button[name="cancel"]'),
    checkbox: () => wrapper.$el.querySelector('input[name="learnerCanEditUsername"]'),
    confirmResetButton: () => wrapper.$el.querySelector('button[name="reset"]'),
    resetButton: () => wrapper.$el.querySelector('button[name="reset-settings"]'),
    saveButton: () => wrapper.$el.querySelector('button[name="save-settings"]'),
  };
}

function promisifyNextTick() {
  return new Promise((resolve) => {
    Vue.nextTick(() => { resolve(); });
  });
}

describe('facility config page view', () => {
  it('clicking checkboxes dispatches a modify action', () => {
    const wrapper = makeWrapper();
    const dispatchSpy = sinon.spy(wrapper.$store, 'dispatch');
    const { checkbox } = getElements(wrapper);
    simulant.fire(checkbox(), 'change');
    sinon.assert.calledWith(dispatchSpy, 'CONFIG_PAGE_MODIFY_SETTING', {
      name: 'learnerCanEditUsername',
      value: true,
    });
    dispatchSpy.restore();
  });

  it('clicking save dispatches a save action', () => {
    const wrapper = makeWrapper();
    const saveActionStub = sinon.stub(wrapper, 'saveFacilityConfig');
    const { saveButton } = getElements(wrapper);
    simulant.fire(saveButton(), 'click');
    return promisifyNextTick()
    .then(() => {
      sinon.assert.calledOnce(saveActionStub);
      saveActionStub.restore();
    });
  });

  it('clicking reset brings up the confirmation modal', () => {
    const wrapper = makeWrapper();
    const { resetButton } = getElements(wrapper);
    assert.equal(wrapper.showModal, false);
    simulant.fire(resetButton(), 'click');
    assert.equal(wrapper.showModal, true);
  });

  it('canceling reset tears down the modal', () => {
    const wrapper = makeWrapper();
    const { resetButton, cancelResetButton } = getElements(wrapper);
    assert.equal(wrapper.showModal, false);
    simulant.fire(resetButton(), 'click');
    return promisifyNextTick()
    .then(() => {
      assert.equal(wrapper.showModal, true);
      simulant.fire(cancelResetButton(), 'click');
      assert.equal(wrapper.showModal, false);
    });
  });

  it('confirming reset calls the reset action', () => {
    const wrapper = makeWrapper();
    const resetActionStub = sinon.stub(wrapper, 'resetFacilityConfig');
    const { resetButton, confirmResetButton } = getElements(wrapper);
    simulant.fire(resetButton(), 'click');
    return promisifyNextTick()
    .then(() => {
      simulant.fire(confirmResetButton(), 'click');
      return promisifyNextTick();
    })
    .then(() => {
      assert.equal(wrapper.showModal, false);
      sinon.assert.called(resetActionStub);
      resetActionStub.restore();
    });
  });

  // not tested: notifications
});
