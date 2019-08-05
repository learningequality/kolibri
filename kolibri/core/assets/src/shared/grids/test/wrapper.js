import { mount } from '@vue/test-utils';

function _makeWrapper(Component, propsData, gridMetrics) {
  return mount(Component, {
    propsData,
    provide: { gridMetrics },
  });
}

// mimic the behavior of the responsive KGrid
const SMALL_GRID = { numCols: 4, gutterWidth: 16 };
const SMALL_DIMENSIONS = { width: 400, height: 400 };
const MEDIUM_GRID = { numCols: 8, gutterWidth: 24 };
const MEDIUM_DIMESNIONS = { width: 700, height: 700 };
const LARGE_GRID = { numCols: 12, gutterWidth: 24 };
const LARGE_DIMENSIONS = { width: 900, height: 900 };

export function makeWrapperSmall(Component, propsData) {
  const wrapper = _makeWrapper(Component, propsData, SMALL_GRID);
  wrapper.vm._updateWindow(SMALL_DIMENSIONS);
  return wrapper;
}

export function makeWrapperMedium(Component, propsData) {
  const wrapper = _makeWrapper(Component, propsData, MEDIUM_GRID);
  wrapper.vm._updateWindow(MEDIUM_DIMESNIONS);
  return wrapper;
}

export function makeWrapperLarge(Component, propsData) {
  const wrapper = _makeWrapper(Component, propsData, LARGE_GRID);
  wrapper.vm._updateWindow(LARGE_DIMENSIONS);
  return wrapper;
}
