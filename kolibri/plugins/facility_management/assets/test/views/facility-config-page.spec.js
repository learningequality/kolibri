import { mount } from '@vue/test-utils';
import ConfigPage from '../../src/views/FacilityConfigPage';
import makeStore from '../makeStore';

function makeWrapper(propsData = {}) {
  const store = makeStore();
  store.commit('facilityConfig/SET_STATE', {
    settings: {
      learner_can_edit_username: false,
    },
  });
  return mount(ConfigPage, { propsData, store });
}

function getElements(wrapper) {
  return {
    cancelResetButton: () => wrapper.find('button[name="cancel"]'),
    checkbox: () => wrapper.find('input[class="k-checkbox-input"]'),
    confirmResetButton: () => wrapper.find('button[name="submit"]'),
    resetButton: () => wrapper.find('button[name="reset-settings"]'),
    saveButton: () => wrapper.find('button[name="save-settings"]'),
    confirmResetModal: () => wrapper.find({ name: 'ConfirmResetModal' }),
    form: () => wrapper.find('form'),
  };
}

describe('facility config page view', () => {
  function assertModalIsUp(wrapper) {
    const { confirmResetModal } = getElements(wrapper);
    expect(confirmResetModal().exists()).toEqual(true);
  }

  function assertModalIsDown(wrapper) {
    const { confirmResetModal } = getElements(wrapper);
    expect(!confirmResetModal().exists()).toEqual(true);
  }

  it('clicking checkboxes dispatches a modify action', () => {
    const wrapper = makeWrapper();
    const { checkbox } = getElements(wrapper);
    checkbox().trigger('click');
    expect(wrapper.vm.$store.state.facilityConfig.settings.learner_can_edit_username).toEqual(true);
  });

  it('clicking save button dispatches a save action', async () => {
    const wrapper = makeWrapper();
    const mock = (wrapper.vm.$store.dispatch = jest.fn().mockResolvedValue());
    const { saveButton } = getElements(wrapper);
    saveButton().trigger('click');
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith('facilityConfig/saveFacilityConfig');
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
    const { resetButton, confirmResetModal } = getElements(wrapper);
    const mock = (wrapper.vm.$store.dispatch = jest.fn().mockResolvedValue());
    resetButton().trigger('click');
    assertModalIsUp(wrapper);
    confirmResetModal().vm.$emit('submit');
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith('facilityConfig/resetFacilityConfig');
    assertModalIsDown(wrapper);
  });
  // not tested: notifications
});
