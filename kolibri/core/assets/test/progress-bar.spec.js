/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import { expect } from 'chai';
import { shallow } from '@vue/test-utils';
import ProgressBar from '../src/views/progress-bar';

function testProgressBar(wrapper, expected) {
  const { text, width } = expected;
  expect(wrapper.find('.progress-bar-text').text()).to.equal(text);
  expect(wrapper.find('.progress-bar-complete').element.style.width).to.equal(width);
}

describe('ProgressBar Component', () => {
  it('should give 0 percent for progress of < 0', () => {
    const wrapper = shallow(ProgressBar, {
      propsData: {
        progress: -0.0000001,
      },
    });
    // The negative still shows up...
    testProgressBar(wrapper, { text: '-0%', width: '0%' });
  });

  it('should give 10 percent for progress of 0.1', () => {
    const wrapper = shallow(ProgressBar, {
      propsData: {
        progress: 0.1,
      },
    });
    testProgressBar(wrapper, { text: '10%', width: '10%' });
  });

  it('should give 100 percent for progress of 1.0', () => {
    const wrapper = shallow(ProgressBar, {
      propsData: {
        progress: 1.0,
      },
    });
    testProgressBar(wrapper, { text: '100%', width: '100%' });
  });

  it('should give 100 percent for progress of > 1.0', () => {
    const wrapper = shallow(ProgressBar, {
      propsData: {
        progress: 1.0000001,
      },
    });
    testProgressBar(wrapper, { text: '100%', width: '100%' });
  });
});
