import { mount } from '@vue/test-utils';
import UiIcon from 'kolibri-design-system/lib/keen/UiIcon';
import ProgressIcon from '../ProgressIcon';

function testIcon(wrapper, expectedText) {
  expect(wrapper.findComponent({ name: 'KTooltip' }).text().trim()).toEqual(expectedText);
}

describe('ProgressIcon Component', () => {
  it('should be empty when progress is < 0', async () => {
    const wrapper = mount(ProgressIcon, {
      propsData: {
        // Causes a validation error
        progress: -1.0,
      },
    });
    await wrapper.vm.$nextTick();
    const tooltip = wrapper.findComponent({ name: 'KTooltip' });
    expect(wrapper.findComponent(UiIcon).element).toBeFalsy();
    // Tooltip is still around, just nothing to trigger it.
    expect(tooltip.text().trim()).toEqual('Completed');
  });

  it('it should show an in-progress icon when progress is between 0 and 1', async () => {
    const wrapper = mount(ProgressIcon, {
      propsData: {
        progress: 0.1,
      },
    });
    await wrapper.vm.$nextTick();
    testIcon(wrapper, 'In progress');
  });

  it('it should show a completed icon when progress is exactly 1', async () => {
    const wrapper = mount(ProgressIcon, {
      propsData: {
        progress: 1.0,
      },
    });
    await wrapper.vm.$nextTick();
    testIcon(wrapper, 'Completed');
  });

  it('it should show a completed icon when progress is greater than 1', async () => {
    const wrapper = mount(ProgressIcon, {
      propsData: {
        progress: 2.0,
      },
    });
    await wrapper.vm.$nextTick();
    testIcon(wrapper, 'Completed');
  });
});
