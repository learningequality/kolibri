import { render, screen, waitFor } from '@testing-library/vue';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import makeStore from '../../__tests__/utils/makeStore';
import UserCredentialsForm from '../onboarding-forms/UserCredentialsForm';

function renderComponent() {
  const store = makeStore();
  const send = jest.fn();

  render(UserCredentialsForm, {
    store,
    provide: {
      wizardService: {
        send,
        state: {
          context: {},
        },
      },
    },
  });

  return { send, store };
}

describe('UserCredentialsForm', () => {
  it('saves the entered super admin details when the user continues', async () => {
    const { send, store } = renderComponent();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Schoolhouse Rock');
    await userEvent.type(screen.getByLabelText(/^username$/i), 'schoolhouse_rock');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password');
    await userEvent.type(screen.getByLabelText(/re-enter password/i), 'password');

    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(store.state.onboardingData.user).toEqual({
      full_name: 'Schoolhouse Rock',
      username: 'schoolhouse_rock',
      password: 'password',
    });
    await waitFor(() => {
      expect(send).toHaveBeenCalledWith({
        type: 'CONTINUE',
        value: store.state.onboardingData.user,
      });
    });
  });
});
