import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import SettingsSideBar from '../src/views/SettingsSideBar';
import { THEMES } from '../src/views/EpubConstants';

function createWrapper({ theme = THEMES.BEIGE } = {}) {
  return mount(SettingsSideBar, {
    propsData: {
      theme,
    },
    store,
  });
}

describe('Settings side bar', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('should emit an event if the decrease font size button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find({ ref: 'decreaseFontSizeButton' }).trigger('click');
    expect(wrapper.emitted().decreaseFontSize).toBeTruthy();
  });
  it('should emit an event if the increase font size button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find({ ref: 'increaseFontSizeButton' }).trigger('click');
    expect(wrapper.emitted().increaseFontSize).toBeTruthy();
  });
  it('should have 2, 3, 4, or 6 themes', () => {
    const wrapper = createWrapper();
    expect([2, 3, 4, 6]).toContain(Object.keys(wrapper.vm.themes).length);
  });
  it('should emit an event when a theme is selected', () => {
    const wrapper = createWrapper();
    wrapper.find('.theme-button').trigger('click');
    expect(wrapper.emitted().setTheme[0][0]).toBe(THEMES.WHITE);
  });
});
