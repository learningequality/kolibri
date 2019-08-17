import { shallowMount } from '@vue/test-utils';
import KFixedGrid from '../KFixedGrid';

function makeWrapper(options) {
  return shallowMount(KFixedGrid, options);
}

function getGrid(wrapper) {
  return wrapper.find('.pure-g');
}

describe('KFixedGrid component', () => {
  it('should have a "pure-g" grid element', () => {
    const wrapper = makeWrapper({ propsData: {} });
    expect(getGrid(wrapper).exists()).toEqual(true);
  });
  it('should have 16 pixel gutters for skinny windows', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 100, height: 900 });
    expect(wrapper.vm.actualGutterSize).toEqual(16);
  });
  it('should have 16 pixel gutters for short windows', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 900, height: 100 });
    expect(wrapper.vm.actualGutterSize).toEqual(16);
  });
  it('should have 24 pixel gutters for large windows', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.vm.actualGutterSize).toEqual(24);
  });
  it('should have a -12px offset on large screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.vm.actualGutterSize).toEqual(24);
    expect(getGrid(wrapper).element.style['margin-left']).toEqual('-12px');
    expect(getGrid(wrapper).element.style['margin-right']).toEqual('-12px');
  });
  it('should have a -8px offset on small screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 400, height: 400 });
    expect(wrapper.vm.actualGutterSize).toEqual(16);
    expect(getGrid(wrapper).element.style['margin-left']).toEqual('-8px');
    expect(getGrid(wrapper).element.style['margin-right']).toEqual('-8px');
  });
  it('should have a -8px offset on wide, short screens', () => {
    const wrapper = makeWrapper({ propsData: {} });
    wrapper.vm._updateWindow({ width: 900, height: 500 });
    expect(wrapper.vm.actualGutterSize).toEqual(16);
    expect(getGrid(wrapper).element.style['margin-left']).toEqual('-8px');
    expect(getGrid(wrapper).element.style['margin-right']).toEqual('-8px');
  });
  it('should have a -5px offset when 10px gutters are specified', () => {
    const wrapper = makeWrapper({ propsData: { gutter: 10 } });
    expect(wrapper.vm.actualGutterSize).toEqual(10);
    expect(getGrid(wrapper).element.style['margin-left']).toEqual('-5px');
    expect(getGrid(wrapper).element.style['margin-right']).toEqual('-5px');
  });
  it('should allow a custom number of columns', () => {
    const wrapper = makeWrapper({ propsData: { numCols: 7 } });
    expect(wrapper.vm.actualNumCols).toEqual(7);
  });
});
