import { shallowMount } from '@vue/test-utils';
import KGrid from '../KGrid';

function makeWrapper(options) {
  return shallowMount(KGrid, options);
}

function getGrid(wrapper) {
  return wrapper.find('.pure-g');
}

describe('KGrid component', () => {
  it('should have a "pure-g" grid element', () => {
    const wrapper = makeWrapper({ propsData: {} });
    expect(getGrid(wrapper).exists()).toEqual(true);
  });
  it('grid should have a -12px offset on large screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.vm.actualGutterSize).toEqual(24);
    expect(getGrid(wrapper).element.style['margin-left']).toEqual('-12px');
    expect(getGrid(wrapper).element.style['margin-right']).toEqual('-12px');
  });
  it('grid should have a -8px offset on small screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 400, height: 400 });
    expect(wrapper.vm.actualGutterSize).toEqual(16);
    expect(getGrid(wrapper).element.style['margin-left']).toEqual('-8px');
    expect(getGrid(wrapper).element.style['margin-right']).toEqual('-8px');
  });
  it('grid should have a -8px offset on wide, short screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 900, height: 500 });
    expect(wrapper.vm.actualGutterSize).toEqual(16);
    expect(getGrid(wrapper).element.style['margin-left']).toEqual('-8px');
    expect(getGrid(wrapper).element.style['margin-right']).toEqual('-8px');
  });
  it('grid should have a -5px offset when 10px gutters are specified', () => {
    const wrapper = makeWrapper({ propsData: { gutter: 10 } });
    expect(wrapper.vm.actualGutterSize).toEqual(10);
    expect(getGrid(wrapper).element.style['margin-left']).toEqual('-5px');
    expect(getGrid(wrapper).element.style['margin-right']).toEqual('-5px');
  });
  it('grid should have 4 columns on small screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 400, height: 400 });
    expect(wrapper.vm.windowIsSmall).toEqual(true);
    expect(wrapper.vm.windowIsMedium).toEqual(false);
    expect(wrapper.vm.windowIsLarge).toEqual(false);
    expect(wrapper.vm.actualNumCols).toEqual(4);
  });
  it('grid should have 8 columns on medium screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 700, height: 700 });
    expect(wrapper.vm.windowIsSmall).toEqual(false);
    expect(wrapper.vm.windowIsMedium).toEqual(true);
    expect(wrapper.vm.windowIsLarge).toEqual(false);
    expect(wrapper.vm.actualNumCols).toEqual(8);
  });
  it('grid should have 12 columns on large screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.vm.windowIsSmall).toEqual(false);
    expect(wrapper.vm.windowIsMedium).toEqual(false);
    expect(wrapper.vm.windowIsLarge).toEqual(true);
    expect(wrapper.vm.actualNumCols).toEqual(12);
  });
  it('grid should allow a custom number of columns', () => {
    const wrapper = makeWrapper({ propsData: { cols: 7 } });
    expect(wrapper.vm.actualNumCols).toEqual(7);
  });
});
