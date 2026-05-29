import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { ref, computed } from 'vue';
import client from 'kolibri/client';
import {
  OptionsForSignIn,
  PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING,
} from 'kolibri-common/constants/Auth';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import useAuthFlow, { useAuthFlowMock } from '../../composables/useAuthFlow'; // eslint-disable-line import-x/named
import useAuthRouter, { useAuthRouterMock } from '../../composables/useAuthRouter'; // eslint-disable-line import-x/named
import { SignUpResource } from '../../apiResource';
import SignUpPage from '../SignUpPage';
import { ComponentMap } from '../../constants';

jest.mock('../../composables/useAuthFlow');
jest.mock('../../composables/useAuthRouter');
jest.mock('../../apiResource', () => ({
  SignUpResource: {
    saveModel: jest.fn(),
  },
}));
jest.mock('kolibri/client');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri/urls', () => ({
  'kolibri:core:usernameavailable': () => '/usernameavailable',
}));
const selectedFacility = ref({
  id: 1,
  name: 'Facility 1',
  dataset: {
    learner_can_login_with_no_password: true,
  },
});
const signInOptions = ref([OptionsForSignIn.USERNAME_PASSWORD]);

function renderComponent({ step = 1, _signInOptions = [OptionsForSignIn.USERNAME_PASSWORD] } = {}) {
  signInOptions.value = _signInOptions;
  useAuthFlow.mockReturnValue(
    useAuthFlowMock({
      selectedFacility,
      signInOptions,
      facilityId: computed(() => selectedFacility.value?.id || null),
      canSignUpWithFacility: computed(() => true),
    }),
  );
  useAuthRouter.mockReturnValue(
    useAuthRouterMock({
      defaultRoute: ref({ name: ComponentMap.USERNAME_SIGN_IN, params: {}, query: {} }),
      nextParam: ref(''),
    }),
  );

  return render(
    SignUpPage,
    {
      routes: [
        { name: ComponentMap.SIGN_UP, path: '/signup' },
        { name: ComponentMap.USERNAME_SIGN_IN, path: '/signin' },
      ],
    },
    (_vue, _store, router) => {
      router.push({
        name: ComponentMap.SIGN_UP,
        path: '/signup',
        query: {
          step,
        },
      });
      router.push = jest.fn(() => Promise.resolve());
      router.replace = jest.fn(() => Promise.resolve());
      router.getRoute = () => {
        return { name: ComponentMap.USERNAME_SIGN_IN, path: '/signin' };
      };
    },
  );
}

describe('signUpPage component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.mockResolvedValue({});
  });

  it('smoke test', () => {
    renderComponent();
    expect(screen.getByTestId('facilityLabel')).toBeInTheDocument();
  });
});

describe('multiFacility signUpPage component', () => {
  it('right facility', async () => {
    renderComponent();
    expect(screen.getByTestId('facilityLabel')).toHaveTextContent('Facility 1');
    const FACILITY_2_NAME = 'Facility 2';
    selectedFacility.value = {
      id: 2,
      name: FACILITY_2_NAME,
      dataset: { learner_can_login_with_no_password: true },
    };
    expect(await screen.findByText(FACILITY_2_NAME)).toBeInTheDocument();
  });
});

describe('picture password modal behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    client.mockResolvedValue({});
    sessionStorage.clear();
  });

  const { finishAction$ } = coreStrings;

  async function proceedToSignupSubmit(container) {
    await fireEvent.update(container.querySelector('input[autocomplete="name"]'), 'Jane Doe');
    await fireEvent.update(container.querySelector('input[autocomplete="username"]'), 'jdoe');
    const passwordInputs = container.querySelectorAll('input[autocomplete="new-password"]');
    for (const passwordInput of passwordInputs) {
      await fireEvent.update(passwordInput, 'password123');
    }
    await fireEvent.click(screen.getByRole('button', { name: finishAction$() }));
  }

  it('stores picture password in sessionStorage and redirects when picture password is assigned', async () => {
    SignUpResource.saveModel.mockResolvedValue({ id: 'new_user', picture_password: '3.7.12' });
    const { container } = renderComponent({
      step: 2,
      _signInOptions: [OptionsForSignIn.USERNAME_PASSWORD, OptionsForSignIn.PICTURE_PASSWORD],
    });

    await proceedToSignupSubmit(container);

    await waitFor(() => {
      expect(redirectBrowser).toHaveBeenCalledTimes(1);
    });
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).toBe('true');
  });

  it('redirects without storing in sessionStorage when picture password is null', async () => {
    SignUpResource.saveModel.mockResolvedValue({ id: 'new_user', picture_password: null });
    const { container } = renderComponent({
      step: 2,
      _signInOptions: [OptionsForSignIn.USERNAME_PASSWORD, OptionsForSignIn.PICTURE_PASSWORD],
    });

    await proceedToSignupSubmit(container);

    await waitFor(() => {
      expect(redirectBrowser).toHaveBeenCalledTimes(1);
    });
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).not.toBe('true');
  });

  it('redirects without storing in sessionStorage when picture sign-in is not enabled', async () => {
    SignUpResource.saveModel.mockResolvedValue({ id: 'new_user', picture_password: '3.7.12' });
    const { container } = renderComponent({
      step: 2,
      _signInOptions: [OptionsForSignIn.USERNAME_PASSWORD],
    });

    await proceedToSignupSubmit(container);

    await waitFor(() => {
      expect(redirectBrowser).toHaveBeenCalledTimes(1);
    });
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).not.toBe('true');
  });
});
