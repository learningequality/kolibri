/* eslint-env mocha */
import Vue from 'vue-test';
import ProgressIcon from '../src/views/progress-icon';
import { mount } from 'avoriaz';
import UiTooltip from 'keen-ui/src/UiTooltip';
import UiIcon from 'keen-ui/src/UiIcon';
import assert from 'assert';

function testIcon(wrapper, expected) {
  const { iconType, text } = expected;
  assert.equal(wrapper.first(UiIcon).getProp('icon'), iconType);
  assert.equal(
    wrapper
      .first(UiTooltip)
      .text()
      .trim(),
    text
  );
}

describe('ProgressIcon Component', () => {
  it('should be empty when progress is < 0', () => {
    const wrapper = mount(ProgressIcon, {
      propsData: {
        // Causes a validation error
        progress: -1.0,
      },
    });
    const tooltip = wrapper.first(UiTooltip);
    assert.equal(wrapper.contains(UiIcon), false);
    // Tooltip is still around, just nothing to trigger it.
    assert.equal(tooltip.text().trim(), 'Completed');
  });

  it('it should show an in-progress icon when progress is between 0 and 1', () => {
    const wrapper = mount(ProgressIcon, {
      propsData: {
        progress: 0.1,
      },
    });
    testIcon(wrapper, { iconType: 'schedule', text: 'In progress' });
  });

  it('it should show a completed icon when progress is exactly 1', () => {
    const wrapper = mount(ProgressIcon, {
      propsData: {
        progress: 1.0,
      },
    });
    testIcon(wrapper, { iconType: 'star', text: 'Completed' });
  });

  it('it should show a completed icon when progress is greater than 1', () => {
    const wrapper = mount(ProgressIcon, {
      propsData: {
        progress: 2.0,
      },
    });
    testIcon(wrapper, { iconType: 'star', text: 'Completed' });
  });
});
