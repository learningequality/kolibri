import { mount } from '@vue/test-utils';
import SearchButton from '../src/views/SearchButton';

function createWrapper() {
  return mount(SearchButton);
}

describe('Search button', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
  it('should emit an event when the button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find('button').trigger('click');
    expect(wrapper.emitted().click).toBeTruthy();
  });
});
