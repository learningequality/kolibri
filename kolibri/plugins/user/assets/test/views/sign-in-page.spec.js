import { mount } from '@vue/test-utils';
import SignInPage from '../../src/views/sign-in-page';
import makeStore from '../util/makeStore';

jest.mock('kolibri.urls');

function makeWrapper() {
  return mount(SignInPage, {
    store: makeStore(),
  });
}

describe('signInPage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.isVueInstance()).toEqual(true);
  });
});
