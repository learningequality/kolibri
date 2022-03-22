import { createLocalVue, mount } from '@vue/test-utils';
import Vuex from 'vuex';
import AppBarCorePage from '../../src/views/AppBarCorePage';

const localVue = createLocalVue();
localVue.use(Vuex);
const store = new Vuex.Store({
  getters: {
    isUserLoggedIn: jest.fn(),
  },
});

function createWrapper({ propsData = {}, slots = {} } = {}) {
  return mount(AppBarCorePage, {
    propsData,
    slots,
    stubs: ['CoreMenu'],
    store,
    localVue,
  });
}

describe('AppBarCorePage', () => {
  describe('AppBar & optional sub-nav slot display', () => {
    it('should render the AppBar component with the given title prop', () => {
      const wrapper = createWrapper({ propsData: { title: 'Test Title' } });
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

  describe('Toggling the language switcher modal', () => {
    it('should show the side nav when the AppBar.showLanguageModal event is emitted', async () => {
      const wrapper = createWrapper();
      expect(wrapper.findComponent({ name: 'LanguageSwitcherModal' }).exists()).toBe(false);
      await wrapper.vm.$refs.appBar.$emit('showLanguageModal');
      expect(wrapper.findComponent({ name: 'LanguageSwitcherModal' }).exists()).toBe(true);
    });
    it('should hide the language switcher modal when LanguageSwitcherModal.cancel is emitted', async () => {
      const wrapper = createWrapper();
      await wrapper.setData({ languageModalShown: true });
      expect(wrapper.findComponent({ name: 'LanguageSwitcherModal' }).exists()).toBe(true);
      await wrapper.vm.$refs.languageSwitcherModal.$emit('cancel');
      expect(wrapper.findComponent({ name: 'LanguageSwitcherModal' }).exists()).toBe(false);
    });
  });
});
