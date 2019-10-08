import { mount } from '@vue/test-utils';
import ScrollingHeader from '../../../src/views/CoreBase/ScrollingHeader';

jest.useFakeTimers();

const HEIGHT = 100;

function createWrapper(scrollPosition = 0) {
  return mount(ScrollingHeader, {
    propsData: {
      height: HEIGHT,
      scrollPosition,
    },
  });
}

describe('Scrolling header movement logic', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
});
