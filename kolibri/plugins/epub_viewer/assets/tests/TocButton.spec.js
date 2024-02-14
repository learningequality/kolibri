import { mount } from '@vue/test-utils';
import TocButton from '../src/views/TocButton';

function createWrapper() {
  return mount(TocButton);
}

describe('Table of contents button', () => {
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
