import { mount } from '@vue/test-utils';
import UserPage from '../../src/views/UserIndex';
import makeStore from '../makeStore';

jest.mock('kolibri.urls');

function makeWrapper() {
  return mount(UserPage, {
    store: makeStore(),
  });
}

describe('user index page component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toEqual(true);
  });
});
