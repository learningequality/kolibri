import { shallowMount, createLocalVue } from '@vue/test-utils';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import Vuex from 'vuex';
import AppBar from '../../src/views/AppBar';

jest.mock('kolibri.urls');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('../../src/composables/useUser');

const localVue = createLocalVue();
localVue.use(Vuex);
const store = new Vuex.Store({
  state: {},
  getters: {
    isAppContext: () => false,
  },
});

function createWrapper({ propsData } = {}) {
  const node = document.createElement('div');
  document.body.appendChild(node);
  return shallowMount(AppBar, {
    store,
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
