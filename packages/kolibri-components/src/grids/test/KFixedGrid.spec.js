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

  it('should allow a custom number of columns', () => {
    const wrapper = makeWrapper({ propsData: { numCols: 7 } });
    expect(wrapper.vm.actualNumCols).toEqual(7);
  });

  describe('gutters and margins ', () => {
    function assertMarginSize(wrapper, margins) {
      expect(getGrid(wrapper).element.style['margin-left']).toEqual(`${margins}px`);
      expect(getGrid(wrapper).element.style['margin-right']).toEqual(`${margins}px`);
    }

    const gutterSizesTestCases = [
      // width | height | informal desc. | gutter size | margins
      [100, 900, 'skinny', 16, null],
      [900, 100, 'short', 16, null],
      [900, 900, 'large', 24, -12],
      [400, 400, 'small', 16, -8],
      [900, 500, 'wide', 16, -8],
    ];

    it.each(gutterSizesTestCases)(
      '%d x %d (%s) windows should have gutter size %d and %dpx margins',
      async (...args) => {
        const [width, height, , gutter, margins] = args;
        const wrapper = makeWrapper({ propsData: {} });
        wrapper.vm._updateWindow({ width, height });
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.actualGutterSize).toEqual(gutter);
        if (margins) {
          assertMarginSize(wrapper, margins);
        }
      }
    );

    it('should have a -5px offset when 10px gutters are specified', () => {
      const wrapper = makeWrapper({ propsData: { gutter: 10 } });
      expect(wrapper.vm.actualGutterSize).toEqual(10);
      assertMarginSize(wrapper, -5);
    });
  });
});
