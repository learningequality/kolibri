import { mount } from '@vue/test-utils';
import PreviousButton from '../src/views/PreviousButton';

function createWrapper() {
  return mount(PreviousButton);
}

describe('Previous button', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
  it('should emit an event when the button is clicked', () => {
    const wrapper = createWrapper();
    wrapper.find('button').trigger('click');
    expect(wrapper.emitted().goToPreviousPage).toBeTruthy();
  });
});
