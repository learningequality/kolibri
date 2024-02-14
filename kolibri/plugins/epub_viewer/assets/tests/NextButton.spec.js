import { mount } from '@vue/test-utils';
import NextButton from '../src/views/NextButton';

function createWrapper() {
  return mount(NextButton);
}

describe('Next button', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
  it('should emit an event when the button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find('.next-button').trigger('click');
    expect(wrapper.emitted().goToNextPage).toBeTruthy();
  });
});
