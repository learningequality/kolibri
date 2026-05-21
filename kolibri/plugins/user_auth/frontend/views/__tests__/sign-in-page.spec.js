import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import useAuthFlow, { useAuthFlowMock } from '../../composables/useAuthFlow'; // eslint-disable-line import-x/named
import useAuthRouter, { useAuthRouterMock } from '../../composables/useAuthRouter'; // eslint-disable-line import-x/named
import SignInPage from '../SignInPage';
import { ComponentMap } from '../../constants';

const { usernameLabel$, usernameNotAlphaNumError$, requiredFieldError$ } = coreStrings;

jest.mock('kolibri/urls');
jest.mock('kolibri-plugin-data', () => ({ allowRemoteAccess: true }));
jest.mock('../../composables/useAuthFlow');
jest.mock('../../composables/useAuthRouter');

function renderComponent() {
  const selectedFacility = {
    id: 123,
    name: 'test facility',
    dataset: {
      learner_can_login_with_no_password: false,
    },
    num_users: 20,
  };
  useAuthFlow.mockImplementation(() =>
    useAuthFlowMock({
      selectedFacility: ref(selectedFacility),
      facilityConfig: ref({ learner_can_login_with_no_password: false, preset: 'formal' }),
      hasMultipleFacilities: ref(false),
    }),
  );
  useAuthRouter.mockImplementation(() =>
    useAuthRouterMock({
      defaultRoute: ref({ name: ComponentMap.USERNAME_SIGN_IN, params: {}, query: {} }),
      nextParam: ref(''),
      getFacilitySelectionRoute: jest.fn(() => ({
        name: ComponentMap.FACILITY_SELECT,
        params: { signUpNext: false },
        query: {},
      })),
    }),
  );

  return render(
    SignInPage,
    {
      routes: [{ name: ComponentMap.USERNAME_SIGN_IN, path: '/signin' }],
    },
    (_vue, _store, router) => {
      router.getRoute = () => {
        return { name: ComponentMap.USERNAME_SIGN_IN, path: '/signin' };
      };
    },
  );
}

describe('signInPage component', () => {
  it('smoke test', async () => {
    renderComponent();
    expect(await screen.findByRole('textbox', { name: usernameLabel$() })).toBeInTheDocument();
  });

  it('will set the username as invalid if it contains punctuation', async () => {
    renderComponent();
    const user = userEvent.setup();

    const usernameInput = await screen.findByRole('textbox', { name: usernameLabel$() });

    await user.type(usernameInput, '?');

    await waitFor(() => {
      expect(screen.getByText(usernameNotAlphaNumError$())).toBeInTheDocument();
    });
  });

  it('will set the validation text to required if the username is empty', async () => {
    renderComponent();
    const user = userEvent.setup();

    const usernameInput = await screen.findByRole('textbox', { name: usernameLabel$() });

    await user.click(usernameInput);
    await user.type(usernameInput, 'a');
    await user.clear(usernameInput);

    await waitFor(() => {
      expect(screen.getByText(requiredFieldError$())).toBeInTheDocument();
    });
  });

  it('will not show validation text if username is empty and not blurred', async () => {
    renderComponent();
    expect(screen.queryByText(requiredFieldError$())).not.toBeInTheDocument();
    expect(screen.queryByText(usernameNotAlphaNumError$())).not.toBeInTheDocument();
  });
});
