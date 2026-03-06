import { render, screen, waitFor, configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import useUser from 'kolibri/composables/useUser';
import { coreStoreFactory } from 'kolibri/store';
import NewPasswordPage from '../NewPasswordPage.vue';

configure({ testIdAttribute: 'data-test' });
jest.mock('kolibri/composables/useUser');
const mockLogin = jest.fn();
const mockSetUnspecifiedPassword = jest.fn();
const mockRouterPush = jest.fn();

function renderComponent() {
  const store = coreStoreFactory({
    actions: {
      kolibriSetUnspecifiedPassword: mockSetUnspecifiedPassword,
    },
  });
  useUser.mockImplementation(() => ({
    login: mockLogin,
  }));

  return render(
    NewPasswordPage,
    {
      store,
      props: {
        username: 'testuser',
        facilityId: 'facility_1',
      },
      routes: [{ name: 'SignInPage', path: '/signin' }],
      stubs: {
        // inorder to bypass the loading wrapper
        AuthBase: { template: '<div><slot></slot></div>' },
      },
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
    mockSetUnspecifiedPassword.mockReset();
    mockRouterPush.mockReset();
  });

  it('calls setUnspecifiedPassword and login when form is submitted with valid password', async () => {
    renderComponent();
    const user = userEvent.setup();
    const password = 'validpassword';
    const passwordInputs = screen.getAllByLabelText(/password/i);
    const submitButton = screen.getByTestId('submit');
    await user.type(passwordInputs[0], password);
    await user.type(passwordInputs[1], password);
    await user.click(submitButton);
    await waitFor(() => {
      expect(mockSetUnspecifiedPassword).toHaveBeenCalledWith(
        expect.anything(),
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
    expect(mockSetUnspecifiedPassword).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls goBack when setUnspecifiedPassword fails', async () => {
    mockSetUnspecifiedPassword.mockRejectedValue(new Error('Failed'));
    renderComponent();
    const user = userEvent.setup();
    const password = 'password';
    const passwordInputs = screen.getAllByLabelText(/password/i);
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
    const passwordInputs = screen.getAllByLabelText(/password/i);
    const submitButton = screen.getByTestId('submit');
    await user.type(passwordInputs[0], password);
    await user.type(passwordInputs[1], password);
    await user.click(submitButton);
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'SignInPage' });
    });
  });
});
