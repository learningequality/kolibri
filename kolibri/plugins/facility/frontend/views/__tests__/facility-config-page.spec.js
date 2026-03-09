import { render, screen, fireEvent, within } from '@testing-library/vue';
import '@testing-library/jest-dom';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useSnackbar, { useSnackbarMock } from 'kolibri/composables/useSnackbar'; // eslint-disable-line
import ConfigPage from '../FacilityConfigPage';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('kolibri/composables/useUser');
jest.mock('../../../../device/frontend/views/DeviceSettingsPage/api.js', () => ({
  getDeviceSettings: jest.fn(),
}));
jest.mock('kolibri/composables/useSnackbar');

const renderComponent = (props = {}) => {
  const store = makeStore();
  store.commit('facilityConfig/SET_STATE', {
    settings: {
      learner_can_edit_username: false,
    },
  });
  return render(ConfigPage, {
    props,
    store,
    stubs: ['FacilityAppBarPage'],
  });
};

describe('facility config page view', () => {
  const createSnackbar = jest.fn();
  beforeAll(() => {
    useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));
  });
  beforeEach(() => {
    useUser.mockImplementation(() => useUserMock());
  });

  it('has all of the settings', () => {
    renderComponent();
    const labels = [
      'Allow learners to edit their username',
      'Allow learners to edit their full name',
      'Allow learners to create accounts',
      'Require password for learners',
      'Allow learners to edit their password when signed in',
      "Show 'download' button with resources",
    ];
    labels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('clicking checkboxes updates the setting', async () => {
    renderComponent();
    const checkbox = screen.getAllByRole('checkbox')[0];
    await fireEvent.click(checkbox);
    // After clicking the first checkbox (learner_can_edit_username),
    // the checkbox state should toggle
    expect(checkbox).toBeChecked();
  });

  it('clicking save button dispatches a save action', async () => {
    const store = makeStore();
    store.commit('facilityConfig/SET_STATE', {
      settings: {
        learner_can_edit_username: false,
      },
    });
    store.dispatch = jest.fn().mockResolvedValue();
    render(ConfigPage, {
      store,
      stubs: ['FacilityAppBarPage'],
    });
    const saveButton = screen.getByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);
    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith('facilityConfig/saveFacilityConfig');
  });

  describe('in the browser mode', () => {
    beforeEach(() => {
      useUser.mockImplementation(() => useUserMock({ isAppContext: false }));
    });

    it('save button is in the bottom bar', () => {
      renderComponent();
      const bottomBar = document.querySelector('[data-test="bottom-bar"]');
      expect(within(bottomBar).getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it("save button isn't in the page container", () => {
      renderComponent();
      const pageContainer = document.querySelector('[data-test="page-container"]');
      expect(within(pageContainer).queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  describe('in the Android app mode', () => {
    beforeEach(() => {
      useUser.mockImplementation(() => useUserMock({ isAppContext: true }));
    });

    it('save button is not in the bottom bar', () => {
      renderComponent();
      const bottomBar = document.querySelector('[data-test="bottom-bar"]');
      expect(within(bottomBar).queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });

    it('save button is in the page container', () => {
      renderComponent();
      const pageContainer = document.querySelector('[data-test="page-container"]');
      expect(within(pageContainer).getByRole('button', { name: /save/i })).toBeInTheDocument();
    });
  });
  // not tested: notifications
});
