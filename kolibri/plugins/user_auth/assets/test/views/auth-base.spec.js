import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import AuthBase from '../../src/views/AuthBase';
import makeStore from '../makeStore';

jest.mock('kolibri/urls');
const localVue = createLocalVue();
localVue.use(VueRouter);
const router = new VueRouter({
  routes: [{ name: 'SIGN_UP', path: '/signup' }],
});
router.getRoute = jest.fn();

const store = makeStore();
store.state.core.facilityConfig = { learner_can_sign_up: true };

function makeWrapper(allowAccess = true) {
  store.getters = { ...store.getters, allowAccess: allowAccess };

  return mount(AuthBase, {
    store: store,
    localVue,
    router,
  });
}

describe.skip('auth base component', () => {
  it('access_disallowed', () => {
    const wrapper = makeWrapper(false);
    const restrictedParagraph = wrapper.find('[data-test="restrictedAccess"]');
    expect(restrictedParagraph.exists()).toBeTruthy();
  });

  it('access_allowed', () => {
    const wrapper = makeWrapper();
    const restrictedParagraph = wrapper.find('[data-test="restrictedAccess"]');
    expect(restrictedParagraph.exists()).toBeFalsy();
  });
  it('create_session_link', () => {
    const wrapper = makeWrapper();
    const createLink = wrapper.find('[data-test="createUser"]');
    expect(createLink.attributes().href).toBe('#/signup');
  });
});
