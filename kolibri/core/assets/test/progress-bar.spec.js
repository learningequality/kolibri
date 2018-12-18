import { shallowMount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import ProgressBar from '../src/views/ProgressBar';

function testProgressBar(wrapper, expected) {
  const { text, width } = expected;
  expect(wrapper.find('.progress-bar-text').text()).toEqual(text);
  expect(wrapper.find('.progress-bar-complete').element.style.width).toEqual(width);
}

describe('ProgressBar Component', () => {
  it('should give 0 percent for progress of < 0', () => {
    const wrapper = shallowMount(ProgressBar, {
      propsData: {
        progress: -0.0000001,
      },
      store,
    });
    // The negative still shows up...
    testProgressBar(wrapper, { text: '-0%', width: '0%' });
  });

  it('should give 10 percent for progress of 0.1', () => {
    const wrapper = shallowMount(ProgressBar, {
      propsData: {
        progress: 0.1,
      },
      store,
    });
    testProgressBar(wrapper, { text: '10%', width: '10%' });
  });

  it('should give 100 percent for progress of 1.0', () => {
    const wrapper = shallowMount(ProgressBar, {
      propsData: {
        progress: 1.0,
      },
      store,
    });
    testProgressBar(wrapper, { text: '100%', width: '100%' });
  });

  it('should give 100 percent for progress of > 1.0', () => {
    const wrapper = shallowMount(ProgressBar, {
      propsData: {
        progress: 1.0000001,
      },
      store,
    });
    testProgressBar(wrapper, { text: '100%', width: '100%' });
  });
});
