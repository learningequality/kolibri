import { mount } from '@vue/test-utils';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line
import ConfigPage from '../FacilityConfigPage';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('kolibri/composables/useUser');
jest.mock('../../../../device/frontend/views/DeviceSettingsPage/api.js', () => ({
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
    checkbox: () => wrapper.find('input[class="k-checkbox-input"]'),
    saveButton: () => wrapper.find('button[name="save-settings"]'),
    form: () => wrapper.find('form'),
    bottomBar: () => wrapper.find('[data-test="bottom-bar"]'),
    pageContainer: () => wrapper.find('[data-test="page-container"]'),
  };
}

describe('facility config page view', () => {
  const createSnackbar = jest.fn();
  beforeAll(() => {
    useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));
  });

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

  describe(`in the browser mode`, () => {
    let wrapper;
    beforeAll(() => {
      useUser.mockImplementation(() => useUserMock({ isAppContext: false }));
      wrapper = makeWrapper();
    });

    it(`save button is in the bottom bar`, () => {
      const { bottomBar } = getElements(wrapper);
      const { saveButton } = getElements(bottomBar());
      expect(saveButton().exists()).toBeTruthy();
    });

    it(`save button isn't in the page container`, () => {
      const { pageContainer } = getElements(wrapper);
      const { saveButton } = getElements(pageContainer());
      expect(saveButton().exists()).toBeFalsy();
    });
  });

  describe(`in the Android app mode`, () => {
    let wrapper;
    beforeAll(() => {
      useUser.mockImplementation(() => useUserMock({ isAppContext: true }));
      wrapper = makeWrapper();
    });

    it(`save button is not in the bottom bar`, () => {
      const { bottomBar } = getElements(wrapper);
      const { saveButton } = getElements(bottomBar());
      expect(saveButton().exists()).toBeFalsy();
    });

    it(`save button is in the page container`, () => {
      const { pageContainer } = getElements(wrapper);
      const { saveButton } = getElements(pageContainer());
      expect(saveButton().exists()).toBeTruthy();
    });
  });
  // not tested: notifications
});
