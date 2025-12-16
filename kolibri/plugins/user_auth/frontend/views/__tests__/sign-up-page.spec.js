import VueRouter from 'vue-router';
import { mount, createLocalVue } from '@vue/test-utils';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import { ref, nextTick } from 'vue';
import SignUpPage from '../SignUpPage';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('kolibri-common/composables/useFacilities');

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [{ name: 'SIGN_IN', path: '/signin' }],
});
router.getRoute = () => {
  return { name: 'SIGN_IN', path: '/signin' };
};

const selectedFacility = ref({ id: 1, name: 'Facility 1' });

function makeWrapper() {
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
  return mount(SignUpPage, {
    store,
    router,
  });
}

describe('signUpPage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBeTruthy();
  });
});

describe('multiFacility signUpPage component', () => {
  it('right facility', async () => {
    const wrapper = makeWrapper();
    const facilityLabel = wrapper.find('[data-test="facilityLabel"]').element;
    expect(facilityLabel).toHaveTextContent(/Facility 1/);
    selectedFacility.value = { id: 2, name: 'Facility 2' };
    await nextTick();
    expect(facilityLabel).toHaveTextContent(/Facility 2/);
  });
});
