import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ref } from 'vue';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import SignInPage from '../SignInPage';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('kolibri/urls');
jest.mock('kolibri-common/composables/useFacilities');

function renderComponent() {
  const store = makeStore();
  store.state.facilityId = '123';
  const selectedFacility = {
    id: 123,
    name: 'test facility',
    dataset: {
      learner_can_login_with_no_password: false,
    },
  };
  useFacilities.mockImplementation(() =>
    useFacilitiesMock({
      facilities: ref([{ id: '123', name: 'test facility', dataset: {} }]),
      getFacility: jest.fn().mockReturnValue(selectedFacility),
    }),
  );

  return render(
    SignInPage,
    {
      store,
      routes: [{ name: 'SIGN_IN', path: '/signin' }],
      stubs: {
        // inorder to bypass the loading wrapper
        AuthBase: { template: '<div><slot></slot></div>' },
      },
    },
    (_vue, _store, router) => {
      router.getRoute = () => {
        return { name: 'SIGN_IN', path: '/signin' };
      };
    },
  );
}

describe('signInPage component', () => {
  it('smoke test', async () => {
    renderComponent();
    expect(await screen.findByRole('textbox', { name: /username/i })).toBeInTheDocument();
  });

  it('will set the username as invalid if it contains punctuation', async () => {
    renderComponent();
    const user = userEvent.setup();

    const usernameInput = await screen.findByRole('textbox', { name: /username/i });

    await user.type(usernameInput, '?');

    await waitFor(() => {
      expect(screen.getByText(/Username can only contain/i)).toBeInTheDocument();
    });
  });

  it('will set the validation text to required if the username is empty', async () => {
    renderComponent();
    const user = userEvent.setup();

    const usernameInput = await screen.findByRole('textbox', { name: /username/i });

    await user.click(usernameInput);
    await user.type(usernameInput, 'a');
    await user.clear(usernameInput);

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('will not show validation text if username is empty and not blurred', async () => {
    renderComponent();
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/alpha/i)).not.toBeInTheDocument();
  });
});
