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
jest.mock('../FacilityAppBarPage', () => ({
  name: 'FacilityAppBarPage',
  render(h) {
    return h('div', this.$slots.default);
  },
}));

function renderPage({ props = {}, isAppContext = false } = {}) {
  useUser.mockImplementation(() => useUserMock({ isAppContext }));
  const store = makeStore();
  store.commit('facilityConfig/SET_STATE', {
    settings: {
      learner_can_edit_username: false,
      learner_can_edit_password: false,
      learner_can_edit_name: false,
      learner_can_sign_up: false,
      learner_can_login_with_no_password: false,
      show_download_button_in_learn: false,
    },
  });
  const dispatch = jest.spyOn(store, 'dispatch');
  const utils = render(ConfigPage, { props, store });
  return { ...utils, store, dispatch };
}

describe('facility config page view', () => {
  const createSnackbar = jest.fn();
  beforeEach(() => {
    useSnackbar.mockImplementation(() => useSnackbarMock({ createSnackbar }));
    useUser.mockImplementation(() => useUserMock({ isAppContext: false }));
    createSnackbar.mockReset();
  });

  it('shows all facility setting checkboxes to the admin', () => {
    renderPage();
    const labels = [
      'Allow learners to edit their username',
      'Allow learners to edit their full name',
      'Allow learners to create accounts',
      'Require password for learners',
      'Allow learners to edit their password when signed in',
      "Show 'download' button with resources",
    ];
    labels.forEach(label => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
  });

  it('updates a facility setting when the admin toggles a checkbox', async () => {
    const { store } = renderPage();
    await fireEvent.click(screen.getByLabelText('Allow learners to edit their username'));
    expect(store.state.facilityConfig.settings.learner_can_edit_username).toBe(true);
  });

  it('saves changes when the admin clicks Save changes', async () => {
    const { dispatch } = renderPage();
    dispatch.mockResolvedValue();
    await fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(dispatch).toHaveBeenCalledWith('facilityConfig/saveFacilityConfig');
  });

  describe(`in the browser mode`, () => {
    it(`shows Save changes in the bottom app bar`, () => {
      renderPage({ isAppContext: false });
      const bottomBar = screen.getByTestId('bottom-bar');
      const pageContainer = screen.getByTestId('page-container');
      expect(within(bottomBar).getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
      expect(within(pageContainer).queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    });
  });

  describe(`in the Android app mode`, () => {
    it(`shows Save changes in the page content instead of the bottom app bar`, () => {
      renderPage({ isAppContext: true });
      const bottomBar = screen.getByTestId('bottom-bar');
      const pageContainer = screen.getByTestId('page-container');
      expect(within(bottomBar).queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
      expect(within(pageContainer).getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });
  });
});
