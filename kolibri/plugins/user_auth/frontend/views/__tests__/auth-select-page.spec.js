import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import AuthSelect from '../AuthSelect';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('kolibri/urls');
const localVue = createLocalVue();
const router = new VueRouter({
  routes: [
    { name: 'SIGN_IN', path: '/signin' },
    { name: 'SIGN_UP', path: '/signup' },
    { name: 'FACILITY_SELECT', path: '/facilities' },
  ],
});

function makeWrapper() {
  const store = makeStore();
  store.getters = { ...store.getters, allowAccess: true };

  return mount(AuthSelect, {
    store,
    localVue,
    router,
  });
}

describe.skip('user index page component', () => {
  it('auth select facility', () => {
    const wrapper = makeWrapper();
    const createLink = wrapper.find('[data-test="createUser"]');
    expect(createLink.attributes().href).toBe('#/facilities?next=SIGN_UP&backTo=AUTH_SELECT');
    const signIn = wrapper.find('[data-test="signIn"]');
    expect(signIn.attributes().href).toBe('#/facilities?next=SIGN_IN&backTo=AUTH_SELECT');
  });
});
