import { shallowMount } from '@vue/test-utils';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import AppBar from '../AppBar';

jest.mock('kolibri/urls');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri/composables/useUser');

function createWrapper({ propsData } = {}) {
  const node = document.createElement('div');
  document.body.appendChild(node);
  return shallowMount(AppBar, {
    propsData,
    attachTo: node,
  });
}

describe('app bar component', () => {
  beforeAll(() => {
    useKResponsiveWindow.mockImplementation(() => ({}));
  });
  describe('smoke test', () => {
    it('should render', () => {
      const wrapper = createWrapper({ loading: false });
      expect(wrapper.findComponent(AppBar).element).toBeVisible();
    });
  });
});
