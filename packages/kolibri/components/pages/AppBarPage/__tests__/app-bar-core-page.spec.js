import { createLocalVue, mount } from '@vue/test-utils';
import Vuex, { Store } from 'vuex';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import AppBarPage from '../index';

jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('vue-router/composables', () => ({
  useRoute: jest.fn(() => ({ params: {}, query: {} })),
}));

const localVue = createLocalVue();
localVue.use(Vuex);
const store = new Store({
  state: {
    core: {},
  },
});

function createWrapper({ propsData = {}, slots = {} } = {}) {
  return mount(AppBarPage, {
    propsData,
    slots,
    stubs: {
      CoreMenu: {
        template: '<div><slot /></div>',
        methods: { focusFirstEl() {} },
      },
    },
    store,
    localVue,
  });
}

describe('AppBarPage', () => {
  beforeAll(() => {
    useKResponsiveWindow.mockImplementation(() => ({
      windowIsSmall: false,
    }));
  });
  describe('AppBar & optional sub-nav slot display', () => {
    it('should render the AppBar component with the given title prop', async () => {
      const wrapper = createWrapper({ propsData: { title: 'Test Title', loading: false } });
      // set AppBar data prop appBarWidth to 1800 so that the full title is displayed
      const appBar = wrapper.findComponent({ name: 'AppBar' });
      appBar.setData({ appBarWidth: 1800 });
      await appBar.vm.$nextTick();
      expect(wrapper.findComponent({ name: 'AppBar' }).element).toHaveTextContent('Test Title');
    });
    it("should pass a given `subNav` slot content to the AppBar's `sub-nav` slot", () => {
      const wrapper = createWrapper({ slots: { subNav: '<div>Test Sub Nav</div>' } });
      expect(wrapper.findComponent({ name: 'AppBar' }).element).toHaveTextContent('Test Sub Nav');
    });
  });

  describe('Toggling the side nav', () => {
    // I tried testing that the SideNav element was visible, but there is always a rendered
    // wrapper - the hidden bit is within the SideNav component - so this is the best I could think
    // of to avoid dealing too much with the DOM of a child component
    // Instead, this tests that the internal state is passed to the SideNav component as expected
    it('should show the side nav when the AppBar.toggleSideNav event is emitted', async () => {
      const wrapper = createWrapper();
      expect(wrapper.findComponent({ name: 'SideNav' }).vm.navShown).toBe(false);
      await wrapper.vm.$refs.appBar.$emit('toggleSideNav');
      expect(wrapper.findComponent({ name: 'SideNav' }).vm.navShown).toBe(true);
    });

    it('should hide the side nav when the AppBar.toggleSideNav event is emitted', async () => {
      const wrapper = createWrapper();
      await wrapper.setData({ navShown: true });
      await wrapper.vm.$refs.sideNav.$emit('toggleSideNav');
      expect(wrapper.findComponent({ name: 'SideNav' }).vm.navShown).toBe(false);
    });
  });
});
