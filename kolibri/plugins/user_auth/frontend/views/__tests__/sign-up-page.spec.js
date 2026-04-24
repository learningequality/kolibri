import { render, screen } from '@testing-library/vue';
import { ref, computed } from 'vue';
import useAuthFlow, { useAuthFlowMock } from '../../composables/useAuthFlow'; // eslint-disable-line import-x/named
import SignUpPage from '../SignUpPage';
import { ComponentMap } from '../../constants';

jest.mock('../../composables/useAuthFlow');

const selectedFacility = ref({
  id: 1,
  name: 'Facility 1',
  dataset: {
    learner_can_login_with_no_password: false,
  },
});

function renderComponent() {
  useAuthFlow.mockReturnValue(
    useAuthFlowMock({
      selectedFacility,
      facilityConfig: ref({ learner_can_login_with_no_password: false }),
      facilityId: computed(() => selectedFacility.value?.id || null),
      defaultRoute: ref(ComponentMap.USERNAME_SIGN_IN),
      canSignUpWithFacility: computed(() => true),
    }),
  );

  return render(
    SignUpPage,
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

describe('signUpPage component', () => {
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
      dataset: { learner_can_login_with_no_password: false },
    };
    expect(await screen.findByText(FACILITY_2_NAME)).toBeInTheDocument();
  });
});
