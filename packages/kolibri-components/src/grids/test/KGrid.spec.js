import { shallowMount } from '@vue/test-utils';
import KGrid from '../KGrid';

function makeWrapper(options) {
  return shallowMount(KGrid, options);
}

describe('KGrid component', () => {
  it('grid should have 4 columns on small screens', async () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 400, height: 400 });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm).toMatchObject({
      windowIsSmall: true,
      windowIsMedium: false,
      windowIsLarge: false,
      windowGridColumns: 4,
    });
  });
  it('grid should have 8 columns on medium screens', async () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 700, height: 700 });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm).toMatchObject({
      windowIsSmall: false,
      windowIsMedium: true,
      windowIsLarge: false,
      windowGridColumns: 8,
    });
  });
  it('grid should have 12 columns on large screens', async () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm).toMatchObject({
      windowIsSmall: false,
      windowIsMedium: false,
      windowIsLarge: true,
      windowGridColumns: 12,
    });
  });
});
