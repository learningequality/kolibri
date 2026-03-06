import { render, screen, configure } from '@testing-library/vue';
import '@testing-library/jest-dom';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import { ref } from 'vue';
import SignUpPage from '../SignUpPage';
import makeStore from '../../__tests__/utils/makeStore';

configure({ testIdAttribute: 'data-test' });

jest.mock('kolibri-common/composables/useFacilities');

const selectedFacility = ref({ id: 1, name: 'Facility 1' });

function renderComponent() {
  const store = makeStore();

  useFacilities.mockImplementation(() =>
    useFacilitiesMock({
      facilities: {
        value: [
          { id: 1, name: 'Facility 1' },
          { id: 2, name: 'Facility 2' },
        ],
      },
      selectedFacility: selectedFacility,
    }),
  );

  return render(
    SignUpPage,
    {
      store,
      routes: [{ name: 'SIGN_IN', path: '/signin' }],
    },
    (_vue, _store, router) => {
      router.getRoute = () => {
        return { name: 'SIGN_IN', path: '/signin' };
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
    selectedFacility.value = { id: 2, name: 'Facility 2' };
    expect(await screen.findByText(/Facility 2/)).toBeInTheDocument();
  });
});
