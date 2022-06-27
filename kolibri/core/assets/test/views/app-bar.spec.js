import { shallowMount } from '@vue/test-utils';
import AppBar from '../../src/views/AppBar';

jest.mock('kolibri.urls');

function createWrapper({ propsData } = {}) {
  return shallowMount(AppBar, { propsData });
}

describe('app bar component', () => {
  describe('smoke test', () => {
    it('should render', () => {
      const wrapper = createWrapper({ loading: false });
      expect(wrapper.findComponent(AppBar).element).toBeVisible();
    });
  });
});
