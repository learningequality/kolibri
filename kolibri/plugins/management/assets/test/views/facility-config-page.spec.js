/* eslint-env mocha */
import Vue from 'vue-test';
import Vuex from 'vuex';
import sinon from 'sinon';
import assert from 'assert';
import ConfigPage from '../../src/views/facilities-config-page';
import confirmResetModal from '../../src/views/facilities-config-page/confirm-reset-modal.vue';
import { mount } from 'avoriaz';

function makeWrapper(propsData = {}) {
  const store = new Vuex.Store({
    state: {
      pageState: {
        settings: {
          learner_can_edit_username: false,
        },
      },
      // A fake part of the state to confirm efficacy of mutation
      TEST_DROPBOX: null,
    },
    // TODO bring in real mutations instead of faking them
    mutations: {
      CONFIG_PAGE_MODIFY_SETTING(state, payload) {
        state.TEST_DROPBOX = payload;
      },
    },
  });
  return mount(ConfigPage, { propsData, store });
}

function getElements(wrapper) {
  return {
    cancelResetButton: () => wrapper.first('button[name="cancel"]'),
    checkbox: () => wrapper.first('input[class="k-checkbox-input"]'),
    confirmResetButton: () => wrapper.first('button[name="reset"]'),
    resetButton: () => wrapper.first('button[name="reset-settings"]'),
    saveButton: () => wrapper.first('button[name="save-settings"]'),
    confirmResetModal: () => wrapper.find(confirmResetModal)[0],
  };
}

describe('facility config page view', () => {
  function assertModalIsUp(wrapper) {
    const { confirmResetModal } = getElements(wrapper);
    assert(confirmResetModal().isVueComponent);
  }

  function assertModalIsDown(wrapper) {
    const { confirmResetModal } = getElements(wrapper);
    assert(confirmResetModal() === undefined);
  }

  it('clicking checkboxes dispatches a modify action', () => {
    const wrapper = makeWrapper();
    const { checkbox } = getElements(wrapper);
    checkbox().trigger('click');
    return Vue.nextTick().then(() => {
      assert.deepEqual(wrapper.vm.$store.state.TEST_DROPBOX, {
        name: 'learnerCanEditUsername',
        value: true,
      });
    });
  });

  it('clicking save button dispatches a save action', () => {
    const wrapper = makeWrapper();
    wrapper.vm.saveFacilityConfig = sinon.stub().returns(Promise.resolve());
    const { saveButton } = getElements(wrapper);
    saveButton().trigger('click');
    return Vue.nextTick().then(() => {
      sinon.assert.calledOnce(wrapper.vm.saveFacilityConfig);
    });
  });

  it('clicking reset button brings up the confirmation modal', () => {
    const wrapper = makeWrapper();
    const { resetButton } = getElements(wrapper);
    assertModalIsDown(wrapper);
    resetButton().trigger('click');
    assertModalIsUp(wrapper);
  });

  it('canceling reset tears down the modal', () => {
    const wrapper = makeWrapper();
    const { resetButton, cancelResetButton } = getElements(wrapper);
    assertModalIsDown(wrapper);
    resetButton().trigger('click');
    return Vue.nextTick().then(() => {
      assertModalIsUp(wrapper);
      cancelResetButton().trigger('click');
      assertModalIsDown(wrapper);
    });
  });

  it('confirming reset calls the reset action and closes modal', () => {
    const wrapper = makeWrapper();
    wrapper.vm.resetFacilityConfig = sinon.spy();
    const { resetButton, confirmResetButton } = getElements(wrapper);
    resetButton().trigger('click');
    return Vue.nextTick()
      .then(() => {
        assertModalIsUp(wrapper);
        confirmResetButton().trigger('click');
        return Vue.nextTick();
      })
      .then(() => {
        sinon.assert.called(wrapper.vm.resetFacilityConfig);
        assertModalIsDown(wrapper);
      });
  });

  // not tested: notifications
});
