import VueRouter from 'vue-router';
import { mount } from '@vue/test-utils';
import SignUpPage from '../../src/views/sign-up-page';
import makeStore from '../util/makeStore';

function makeWrapper() {
  return mount(SignUpPage, {
    store: makeStore(),
    router: new VueRouter({
      routes: [{ name: 'SIGN_IN', path: '/signin' }],
    }),
  });
}

describe('signUpPage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.isVueInstance()).toEqual(true);
  });
});
