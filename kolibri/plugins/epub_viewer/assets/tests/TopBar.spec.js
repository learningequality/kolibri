import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import TopBar from '../src/views/TopBar';

function createWrapper({ title, isInFullscreen = false } = {}) {
  return mount(TopBar, {
    propsData: {
      title,
      isInFullscreen,
    },
    store,
  });
}

describe('Top bar', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
  it('should not have a heading if a title is not passed in', () => {
    const wrapper = createWrapper();
    expect(wrapper.contains('h2')).toBe(false);
  });
  it('should have a heading if a title is passed in', () => {
    const title = 'Book title';
    const wrapper = createWrapper({ title });
    expect(wrapper.contains('h2')).toBe(true);
  });
  it('should allow parent to focus on table of contents button', () => {
    const wrapper = createWrapper();
    wrapper.vm.focusOnTocButton();
    const elementThatIsFocused = document.activeElement;
    expect(elementThatIsFocused.getAttribute('data-test')).toEqual('toc button');
  });
  it('should allow parent to focus on settings button', () => {
    const wrapper = createWrapper();
    wrapper.vm.focusOnSettingsButton();
    const elementThatIsFocused = document.activeElement;
    expect(elementThatIsFocused.getAttribute('data-test')).toEqual('settings button');
  });
  it('should allow parent to focus on search button', () => {
    const wrapper = createWrapper();
    wrapper.vm.focusOnSearchButton();
    const elementThatIsFocused = document.activeElement;
    expect(elementThatIsFocused.getAttribute('data-test')).toEqual('search button');
  });

  it('should emit and event when the table of contents button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find({ name: 'TocButton' }).trigger('click');
    expect(wrapper.emitted().tableOfContentsButtonClicked).toBeTruthy();
  });
  it('should emit and event when the settings button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find({ name: 'SettingsButton' }).trigger('click');
    expect(wrapper.emitted().settingsButtonClicked).toBeTruthy();
  });
  it('should emit and event when the search button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find({ name: 'SearchButton' }).trigger('click');
    expect(wrapper.emitted().searchButtonClicked).toBeTruthy();
  });
  it('should emit and event when the fullscreen button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find({ ref: 'fullscreenButton' }).trigger('click');
    expect(wrapper.emitted().fullscreenButtonClicked).toBeTruthy();
  });
});
