import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import KTooltipExample from './KTooltipExample';

const DEFAULT_PROPS = {
  reference: 'tooltipTriggerElement',
  refs: {},
  disabled: false,
  placement: 'auto',
};
function makeWrapper(kTooltipProps = DEFAULT_PROPS, slot = 'Sample tooltip content.') {
  return mount(KTooltipExample, {
    propsData: { kTooltipProps },
    slots: {
      default: slot,
    },
    store,
  });
}
describe('KTooltip component', () => {
  it('should create a tooltip', async () => {
    const wrapper = makeWrapper();
    wrapper.setProps({
      kTooltipProps: {
        ...DEFAULT_PROPS,
        refs: wrapper.vm.$refs,
      },
    });
    await wrapper.vm.$nextTick();
    const tooltip = wrapper.find({ name: 'KTooltip' });
    expect(tooltip.text()).toEqual('Sample tooltip content.');
  });
});
