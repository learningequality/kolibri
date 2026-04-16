import { render, screen, waitFor } from '@testing-library/vue';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
import makeStore from '../../__tests__/utils/makeStore';
import UserCredentialsForm from '../onboarding-forms/UserCredentialsForm';

const { fullNameLabel$, usernameLabel$, passwordLabel$, continueAction$ } = coreStrings;
const { confirmPasswordLabel$ } = createTranslator(PasswordTextbox.name, PasswordTextbox.$trs);

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
  it('saves the entered admin details when the user continues', async () => {
    const { send, store } = renderComponent();

    await userEvent.type(screen.getByLabelText(fullNameLabel$()), 'Schoolhouse Rock');
    await userEvent.type(screen.getByLabelText(usernameLabel$()), 'schoolhouse_rock');
    await userEvent.type(screen.getByLabelText(passwordLabel$()), 'password');
    await userEvent.type(screen.getByLabelText(confirmPasswordLabel$()), 'password');

    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));

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
