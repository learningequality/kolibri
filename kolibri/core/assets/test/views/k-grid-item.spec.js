import { shallowMount } from '@vue/test-utils';
import range from 'lodash/range';
import KGridItem from '../../src/views/KGrid/KGridItem';
import allowableUnits from './k-grid-units';

function isAllowed(cls) {
  return allowableUnits.includes(cls);
}

function makeWrapper(propsData, gridMetrics) {
  return shallowMount(KGridItem, {
    propsData,
    provide: { gridMetrics },
  });
}

const SMALL_GRID = { numCols: 4, gutterWidth: 16 };
const MEDIUM_GRID = { numCols: 8, gutterWidth: 24 };
const LARGE_GRID = { numCols: 12, gutterWidth: 24 };

describe('KGridItem component', () => {
  it('should mount', () => {
    const wrapper = makeWrapper({ size: 2 }, SMALL_GRID);
    expect(wrapper.exists()).toEqual(true);
  });

  it('should always have an allowable grid unit', () => {
    const allowableCols = range(1, 13);
    allowableCols.forEach(i => {
      allowableCols.forEach(j => {
        if (i <= j) {
          const wrapper = makeWrapper({ size: i }, { numCols: j, gutterWidth: 16 });
          expect(isAllowed(wrapper.classes()[1])).toEqual(true);
        }
      });
    });
    const responsiveLayouts = [4, 8, 12];
    const allowedPercentages = [25, 50, 75, 100];
    responsiveLayouts.forEach(numCols => {
      allowedPercentages.forEach(size => {
        const wrapper = makeWrapper({ size, percentage: true }, { numCols, gutterWidth: 16 });
        expect(isAllowed(wrapper.classes()[1])).toEqual(true);
      });
    });
  });

  it('should mount have 8px padding for 16px gutters', () => {
    const wrapper = makeWrapper({ size: 2 }, { numCols: 4, gutterWidth: 16 });
    expect(wrapper.element.style['padding-left']).toEqual('8px');
    expect(wrapper.element.style['padding-right']).toEqual('8px');
  });

  it('should mount have 12px padding for 24px gutters', () => {
    const wrapper = makeWrapper({ size: 2 }, { numCols: 4, gutterWidth: 24 });
    expect(wrapper.element.style['padding-left']).toEqual('12px');
    expect(wrapper.element.style['padding-right']).toEqual('12px');
  });

  it('should handle non-responsive alignment', () => {
    const wrapper = makeWrapper({ size: 2, alignment: 'center' }, SMALL_GRID);
    expect(wrapper.element.style['text-align']).toEqual('center');
  });

  it('should handle text-based responsive alignment', () => {
    const wrapper = makeWrapper({ size: 2, alignments: 'right, left, center' }, SMALL_GRID);
    wrapper.vm._updateWindow({ width: 400, height: 400 });
    expect(wrapper.element.style['text-align']).toEqual('right');
    wrapper.vm._updateWindow({ width: 700, height: 700 });
    expect(wrapper.element.style['text-align']).toEqual('left');
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.element.style['text-align']).toEqual('center');
  });

  it('should handle array-based responsive alignment', () => {
    const wrapper = makeWrapper({ size: 2, alignments: ['right', 'left', 'center'] }, SMALL_GRID);
    wrapper.vm._updateWindow({ width: 400, height: 400 });
    expect(wrapper.element.style['text-align']).toEqual('right');
    wrapper.vm._updateWindow({ width: 700, height: 700 });
    expect(wrapper.element.style['text-align']).toEqual('left');
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.element.style['text-align']).toEqual('center');
  });

  it('should handle text-based responsive sizes - small', () => {
    const wrapper = makeWrapper({ sizes: '1, 2, 3' }, SMALL_GRID);
    wrapper.vm._updateWindow({ width: 400, height: 400 });
    expect(wrapper.classes()[1]).toEqual('pure-u-6-24');
  });

  it('should handle text-based responsive sizes - medium', () => {
    const wrapper = makeWrapper({ sizes: '1, 2, 3' }, MEDIUM_GRID);
    wrapper.vm._updateWindow({ width: 700, height: 700 });
    expect(wrapper.classes()[1]).toEqual('pure-u-6-24');
  });

  it('should handle text-based responsive sizes - large', () => {
    const wrapper = makeWrapper({ sizes: '1, 2, 3' }, LARGE_GRID);
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.classes()[1]).toEqual('pure-u-6-24');
  });

  it('should handle array-based responsive sizes - small', () => {
    const wrapper = makeWrapper({ sizes: [3, 5, 9] }, SMALL_GRID);
    wrapper.vm._updateWindow({ width: 400, height: 400 });
    expect(wrapper.classes()[1]).toEqual('pure-u-18-24');
  });

  it('should handle array-based responsive sizes - medium', () => {
    const wrapper = makeWrapper({ sizes: [3, 5, 9] }, MEDIUM_GRID);
    wrapper.vm._updateWindow({ width: 700, height: 700 });
    expect(wrapper.classes()[1]).toEqual('pure-u-15-24');
  });

  it('should handle array-based responsive sizes - large', () => {
    const wrapper = makeWrapper({ sizes: [3, 5, 9] }, LARGE_GRID);
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.classes()[1]).toEqual('pure-u-18-24');
  });

  it('should handle array-based responsive percentage sizes - large', () => {
    const wrapper = makeWrapper({ sizes: [25, 50, 25], percentage: true }, LARGE_GRID);
    wrapper.vm._updateWindow({ width: 900, height: 900 });
    expect(wrapper.classes()[1]).toEqual('pure-u-6-24');
  });

  it('should handle text-based non-responsive percentage size', () => {
    const wrapper = makeWrapper({ size: '50', percentage: true }, MEDIUM_GRID);
    wrapper.vm._updateWindow({ width: 700, height: 700 });
    expect(wrapper.classes()[1]).toEqual('pure-u-12-24');
  });
});
