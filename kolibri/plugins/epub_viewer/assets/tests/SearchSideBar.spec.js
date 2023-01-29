import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import SearchSideBar from '../src/views/SearchSideBar';
import SampleSearchResults from './SampleSearchResults';

const mockMark = {
  mark: jest.fn(),
};
jest.mock('mark.js', () => jest.fn().mockImplementation(() => mockMark));

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

  it('should highlight search terms', () => {
    const wrapper = createWrapper();
    wrapper.vm.searchQuery = 'biology';
    wrapper.vm.searchResults = SampleSearchResults;
    wrapper.vm.createMarks(wrapper.vm.searchQuery);
    expect(mockMark.mark).toHaveBeenCalled();
  });
});
