/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import sinon from 'sinon';
import { expect } from 'chai';
import { mount } from '@vue/test-utils';
import ConfigPage from '../../src/views/facilities-config-page';
import confirmResetModal from '../../src/views/facilities-config-page/confirm-reset-modal';

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
    cancelResetButton: () => wrapper.find('button[name="cancel"]'),
    checkbox: () => wrapper.find('input[class="k-checkbox-input"]'),
    confirmResetButton: () => wrapper.find('button[name="reset"]'),
    resetButton: () => wrapper.find('button[name="reset-settings"]'),
    saveButton: () => wrapper.find('button[name="save-settings"]'),
    confirmResetModal: () => wrapper.find(confirmResetModal),
  };
}

describe('facility config page view', () => {
  function assertModalIsUp(wrapper) {
    const { confirmResetModal } = getElements(wrapper);
    expect(confirmResetModal().exists()).to.be.true;
  }

  function assertModalIsDown(wrapper) {
    const { confirmResetModal } = getElements(wrapper);
    expect(!confirmResetModal().exists()).to.be.true;
  }

  it('clicking checkboxes dispatches a modify action', () => {
    const wrapper = makeWrapper();
    const { checkbox } = getElements(wrapper);
    checkbox().trigger('click');
    expect(wrapper.vm.$store.state.TEST_DROPBOX).to.deep.equal({
      name: 'learnerCanEditUsername',
      value: true,
    });
  });

  it('clicking save button dispatches a save action', () => {
    const wrapper = makeWrapper();
    wrapper.vm.saveFacilityConfig = sinon.stub().returns(Promise.resolve());
    const { saveButton } = getElements(wrapper);
    saveButton().trigger('click');
    sinon.assert.calledOnce(wrapper.vm.saveFacilityConfig);
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
    assertModalIsUp(wrapper);
    cancelResetButton().trigger('click');
    assertModalIsDown(wrapper);
  });

  it('confirming reset calls the reset action and closes modal', () => {
    const wrapper = makeWrapper();
    wrapper.vm.resetFacilityConfig = sinon.spy();
    const { resetButton, confirmResetButton } = getElements(wrapper);
    resetButton().trigger('click');
    assertModalIsUp(wrapper);
    confirmResetButton().trigger('click');
    sinon.assert.called(wrapper.vm.resetFacilityConfig);
    assertModalIsDown(wrapper);
  });

  // not tested: notifications
});
