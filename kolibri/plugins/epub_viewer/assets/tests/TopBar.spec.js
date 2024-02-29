import { mount } from '@vue/test-utils';
import TopBar from '../src/views/TopBar';

function createWrapper({ title, isInFullscreen = false } = {}) {
  const node = document.createElement('app');
  document.body.appendChild(node);
  return mount(TopBar, {
    propsData: {
      title,
      isInFullscreen,
    },
    attachTo: node,
  });
}

describe('Top bar', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
  it('should not have a heading if a title is not passed in', () => {
    const wrapper = createWrapper();
    expect(wrapper.find('h2').element).toBeFalsy();
  });
  it('should have a heading if a title is passed in', () => {
    const title = 'Book title';
    const wrapper = createWrapper({ title });
    expect(wrapper.find('h2').element).toBeTruthy();
  });
  it('should allow parent to focus on table of contents button', () => {
    const wrapper = createWrapper();
    wrapper.vm.focusOnTocButton();
    const elementThatIsFocused = document.activeElement;
    expect(elementThatIsFocused).toHaveAttribute('data-test', 'toc button');
  });
  it('should allow parent to focus on settings button', () => {
    const wrapper = createWrapper();
    wrapper.vm.focusOnSettingsButton();
    const elementThatIsFocused = document.activeElement;
    expect(elementThatIsFocused).toHaveAttribute('data-test', 'settings button');
  });
  it('should allow parent to focus on search button', () => {
    const wrapper = createWrapper();
    wrapper.vm.focusOnSearchButton();
    const elementThatIsFocused = document.activeElement;
    expect(elementThatIsFocused).toHaveAttribute('data-test', 'search button');
  });

  it('should emit and event when the table of contents button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.findComponent({ name: 'TocButton' }).trigger('click');
    expect(wrapper.emitted().tableOfContentsButtonClicked).toBeTruthy();
  });
  it('should emit and event when the settings button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.findComponent({ name: 'SettingsButton' }).trigger('click');
    expect(wrapper.emitted().settingsButtonClicked).toBeTruthy();
  });
  it('should emit and event when the search button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.findComponent({ name: 'SearchButton' }).trigger('click');
    expect(wrapper.emitted().searchButtonClicked).toBeTruthy();
  });
  it('should emit and event when the fullscreen button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.findComponent({ ref: 'fullscreenButton' }).trigger('click');
    expect(wrapper.emitted().fullscreenButtonClicked).toBeTruthy();
  });
});
