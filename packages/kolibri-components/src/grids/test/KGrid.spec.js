import { shallowMount } from '@vue/test-utils';
import KGrid from '../KGrid';

function makeWrapper(options) {
  return shallowMount(KGrid, options);
}

describe('KGrid component', () => {
  it('grid should have 4 columns on small screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 400, height: 400 });
    expect(wrapper.vm.windowIsSmall).toEqual(true);
    expect(wrapper.vm.windowIsMedium).toEqual(false);
    expect(wrapper.vm.windowIsLarge).toEqual(false);
    expect(wrapper.vm.windowGridColumns).toEqual(4);
  });
  it('grid should have 8 columns on medium screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 700, height: 700 });
    expect(wrapper.vm.windowIsSmall).toEqual(false);
    expect(wrapper.vm.windowIsMedium).toEqual(true);
    expect(wrapper.vm.windowIsLarge).toEqual(false);
    expect(wrapper.vm.windowGridColumns).toEqual(8);
  });
  it('grid should have 12 columns on large screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.vm.windowIsSmall).toEqual(false);
    expect(wrapper.vm.windowIsMedium).toEqual(false);
    expect(wrapper.vm.windowIsLarge).toEqual(true);
    expect(wrapper.vm.windowGridColumns).toEqual(12);
  });
});
