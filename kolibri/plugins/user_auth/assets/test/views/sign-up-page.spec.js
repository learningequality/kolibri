import VueRouter from 'vue-router';
import { mount, createLocalVue } from '@vue/test-utils';
import SignUpPage from '../../src/views/SignUpPage';
import makeStore from '../makeStore';

const localVue = createLocalVue();
localVue.use(VueRouter);

const router = new VueRouter({
  routes: [{ name: 'SIGN_IN', path: '/signin' }],
});
router.getRoute = () => {
  return { name: 'SIGN_IN', path: '/signin' };
};

function makeWrapper() {
  const store = makeStore();
  store.state.core.facilities = [
    { id: 1, name: 'Facility 1' },
    { id: 2, name: 'Facility 2' },
  ];
  store.state.facilityId = 1;
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
    await wrapper.vm.$store.commit('SET_FACILITY_ID', 2);
    expect(facilityLabel).toHaveTextContent(/Facility 2/);
  });
});
