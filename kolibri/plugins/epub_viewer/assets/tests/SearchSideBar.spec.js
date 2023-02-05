import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import SearchSideBar from '../src/views/SearchSideBar';

function createWrapper() {
  const node = document.createElement('app');
  document.body.appendChild(node);
  return mount(SearchSideBar, {
    propsData: {
      book: {},
    },
    store,
    attachTo: node,
  });
}

describe('Search side bar', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });

  it('should allow parent to focus on input box', () => {
    const wrapper = createWrapper();
    wrapper.vm.focusOnInput();
    const elementThatIsFocused = document.activeElement;
    expect(elementThatIsFocused.classList.contains('search-input')).toBe(true);
  });
});
