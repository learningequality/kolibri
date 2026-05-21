import { render, screen, waitFor } from '@testing-library/vue';
import { ref } from 'vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import useUser from 'kolibri/composables/useUser';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coreStoreFactory } from 'kolibri/store';
import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
import { setUnspecifiedPassword } from '../../../api';
import useAuthFlow, { useAuthFlowMock } from '../../../composables/useAuthFlow'; // eslint-disable-line import-x/named
import useAuthRouter, { useAuthRouterMock } from '../../../composables/useAuthRouter'; // eslint-disable-line import-x/named
import NewPasswordPage from '../NewPasswordPage.vue';

const { passwordLabel$ } = coreStrings;

const { confirmPasswordLabel$ } = createTranslator(PasswordTextbox.name, PasswordTextbox.$trs);

jest.mock('kolibri-plugin-data', () => ({ allowRemoteAccess: true }));

jest.mock('kolibri/composables/useUser');
jest.mock('../../../api');
jest.mock('../../../composables/useAuthFlow');
jest.mock('../../../composables/useAuthRouter');
const mockLogin = jest.fn();
const mockRouterPush = jest.fn();

function renderComponent() {
  const store = coreStoreFactory();
  useUser.mockImplementation(() => ({
    login: mockLogin,
    userFacilityId: ref(null),
  }));
  useAuthFlow.mockReturnValue(
    useAuthFlowMock({
      selectedFacility: ref({ id: 'facility_1', name: 'Facility 1' }),
    }),
  );
  useAuthRouter.mockReturnValue(
    useAuthRouterMock({
      nextParam: ref(''),
      signInRoute: ref({ name: 'SignInPage' }),
    }),
  );

  return render(
    NewPasswordPage,
    {
      store,
      props: {
        username: 'testuser',
        facilityId: 'facility_1',
      },
      routes: [{ name: 'SignInPage', path: '/signin' }],
    },
    (_vue, _store, router) => {
      router.push = mockRouterPush;
    },
  );
}

describe('NewPasswordPage', () => {
  beforeEach(() => {
    // Reset mocks
    mockLogin.mockReset();
    setUnspecifiedPassword.mockReset();
    mockRouterPush.mockReset();
  });

  it('calls setUnspecifiedPassword and login when form is submitted with valid password', async () => {
    renderComponent();
    const user = userEvent.setup();
    const password = 'validpassword';
    const passwordInputs = [
      screen.getByLabelText(passwordLabel$()),
      screen.getByLabelText(confirmPasswordLabel$()),
    ];
    const submitButton = screen.getByTestId('submit');
    await user.type(passwordInputs[0], password);
    await user.type(passwordInputs[1], password);
    await user.click(submitButton);
    await waitFor(() => {
      expect(setUnspecifiedPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          facility: 'facility_1',
          password: 'validpassword',
        }),
      );
    });
    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      facility: 'facility_1',
      password: 'validpassword',
    });
  });

  it('does not call setUnspecifiedPassword when password is invalid', async () => {
    renderComponent();
    const user = userEvent.setup();
    const submitButton = screen.getByTestId('submit');
    await user.click(submitButton);
    expect(setUnspecifiedPassword).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls goBack when setUnspecifiedPassword fails', async () => {
    setUnspecifiedPassword.mockRejectedValue(new Error('Failed'));
    renderComponent();
    const user = userEvent.setup();
    const password = 'password';
    const passwordInputs = [
      screen.getByLabelText(passwordLabel$()),
      screen.getByLabelText(confirmPasswordLabel$()),
    ];
    const submitButton = screen.getByTestId('submit');
    await user.type(passwordInputs[0], password);
    await user.type(passwordInputs[1], password);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'SignInPage' });
    });
  });

  it('calls goBack when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Failed'));
    renderComponent();
    const user = userEvent.setup();
    const password = 'validpassword';
    const passwordInputs = [
      screen.getByLabelText(passwordLabel$()),
      screen.getByLabelText(confirmPasswordLabel$()),
    ];
    const submitButton = screen.getByTestId('submit');
    await user.type(passwordInputs[0], password);
    await user.type(passwordInputs[1], password);
    await user.click(submitButton);
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'SignInPage' });
    });
  });
});
