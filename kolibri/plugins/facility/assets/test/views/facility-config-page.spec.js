import { mount } from '@vue/test-utils';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line
import ConfigPage from '../../src/views/FacilityConfigPage';
import makeStore from '../makeStore';

jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri/composables/useUser');
jest.mock('../../../../device/assets/src/views/DeviceSettingsPage/api.js', () => ({
  getDeviceSettings: jest.fn(),
}));
jest.mock('kolibri/composables/useSnackbar');

function makeWrapper(propsData = {}) {
  const store = makeStore();
  store.commit('facilityConfig/SET_STATE', {
    settings: {
      learner_can_edit_username: false,
    },
  });
  return mount(ConfigPage, { propsData, store, stubs: ['FacilityAppBarPage'] });
}

function getElements(wrapper) {
  return {
    cancelResetButton: () => wrapper.find('button[name="cancel"]'),
    checkbox: () => wrapper.find('input[class="k-checkbox-input"]'),
    confirmResetButton: () => wrapper.find('button[name="submit"]'),
    resetButton: () => wrapper.find('button[name="reset-settings"]'),
    saveButton: () => wrapper.find('button[name="save-settings"]'),
    confirmResetModal: () => wrapper.findComponent({ name: 'ConfirmResetModal' }),
    form: () => wrapper.find('form'),
    bottomBar: () => wrapper.find('[data-test="bottom-bar"]'),
    pageContainer: () => wrapper.find('[data-test="page-container"]'),
  };
}

describe('facility config page view', () => {
  const createSnackbar = jest.fn();
  beforeAll(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
    useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));
  });

  function assertModalIsUp(wrapper) {
    const { confirmResetModal } = getElements(wrapper);
    expect(confirmResetModal().exists()).toEqual(true);
  }

  function assertModalIsDown(wrapper) {
    const { confirmResetModal } = getElements(wrapper);
    expect(!confirmResetModal().exists()).toEqual(true);
  }

  it('has all of the settings', () => {
    const wrapper = makeWrapper();
    const checkboxes = wrapper.findAllComponents({ name: 'KCheckbox' });
    expect(checkboxes.length).toEqual(6);
    const labels = [
      'Allow learners to edit their username',
      'Allow learners to edit their full name',
      'Allow learners to create accounts',
      'Require password for learners',
      'Allow learners to edit their password when signed in',
      "Show 'download' button with resources",
    ];
    labels.forEach((label, idx) => {
      expect(checkboxes.at(idx).props().label).toEqual(label);
    });
  });

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

  it('clicking reset button brings up the confirmation modal', async () => {
    const wrapper = makeWrapper();
    const { resetButton } = getElements(wrapper);
    assertModalIsDown(wrapper);
    resetButton().trigger('click');
    await wrapper.vm.$nextTick();
    assertModalIsUp(wrapper);
  });

  it('canceling reset tears down the modal', async () => {
    const wrapper = makeWrapper();
    const { resetButton, cancelResetButton } = getElements(wrapper);
    assertModalIsDown(wrapper);
    resetButton().trigger('click');
    await wrapper.vm.$nextTick();
    assertModalIsUp(wrapper);
    cancelResetButton().trigger('click');
    await wrapper.vm.$nextTick();
    assertModalIsDown(wrapper);
  });

  it('confirming reset calls the reset action and closes modal', async () => {
    const wrapper = makeWrapper();
    const { resetButton, confirmResetModal } = getElements(wrapper);
    const mock = (wrapper.vm.$store.dispatch = jest.fn().mockResolvedValue());
    resetButton().trigger('click');
    await wrapper.vm.$nextTick();
    assertModalIsUp(wrapper);
    confirmResetModal().vm.$emit('submit');
    await wrapper.vm.$nextTick();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith('facilityConfig/resetFacilityConfig');
    expect(createSnackbar).toHaveBeenCalledWith('Facility settings updated');
    assertModalIsDown(wrapper);
  });

  describe(`in the browser mode`, () => {
    let wrapper;
    beforeAll(() => {
      wrapper = makeWrapper();
      wrapper.vm.$store.state.core.session.app_context = false;
    });

    it(`reset and save buttons are in the bottom bar`, () => {
      const { bottomBar } = getElements(wrapper);
      const { resetButton, saveButton } = getElements(bottomBar());
      expect(resetButton().exists()).toBeTruthy();
      expect(saveButton().exists()).toBeTruthy();
    });

    it(`reset and save buttons aren't in the page container`, () => {
      const { pageContainer } = getElements(wrapper);
      const { resetButton, saveButton } = getElements(pageContainer());
      expect(resetButton().exists()).toBeFalsy();
      expect(saveButton().exists()).toBeFalsy();
    });
  });

  describe(`in the Android app mode`, () => {
    let wrapper;
    beforeAll(() => {
      useUser.mockImplementation(() => useUserMock({ isAppContext: true }));
      wrapper = makeWrapper();
    });

    it(`reset and save buttons are in the bottom bar`, () => {
      const { bottomBar } = getElements(wrapper);
      const { resetButton, saveButton } = getElements(bottomBar());
      expect(resetButton().exists()).toBeFalsy();
      expect(saveButton().exists()).toBeFalsy();
    });

    it(`reset and save buttons aren't in the page container`, () => {
      const { pageContainer } = getElements(wrapper);
      const { resetButton, saveButton } = getElements(pageContainer());
      expect(resetButton().exists()).toBeTruthy();
      expect(saveButton().exists()).toBeTruthy();
    });
  });
  // not tested: notifications
});
