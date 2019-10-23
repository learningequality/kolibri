import KGridItem from '../KGridItem';
import { makeWrapperSmall, makeWrapperMedium, makeWrapperLarge } from './wrapper';

describe('KGridItem component', () => {
  it('should mount', () => {
    const wrapper = makeWrapperSmall(KGridItem, {});
    expect(wrapper.exists()).toEqual(true);
  });

  describe('responsive alignment', () => {
    const props = {
      layout: { span: 2 },
      layout4: { alignment: 'right' },
      layout8: { alignment: 'left' },
      layout12: { alignment: 'center' },
    };
    it('small screen', () => {
      const wrapper = makeWrapperSmall(KGridItem, props);
      expect(wrapper.element.style['text-align']).toEqual('right');
    });
    it('medium screen', () => {
      const wrapper = makeWrapperMedium(KGridItem, props);
      expect(wrapper.element.style['text-align']).toEqual('left');
    });
    it('large screen', () => {
      const wrapper = makeWrapperLarge(KGridItem, props);
      expect(wrapper.element.style['text-align']).toEqual('center');
    });
  });

  it('should handle text and number-based responsive sizes - small', () => {
    const props = {
      layout4: { span: '1' },
      layout8: { span: 2 },
      layout12: { span: '3' },
    };
    const wrapper = makeWrapperSmall(KGridItem, props);
    expect(wrapper.classes()[1]).toEqual('pure-u-6-24');
  });

  it('should handle responsive sizes - medium', () => {
    const props = {
      layout4: { span: 1 },
      layout8: { span: 2 },
      layout12: { span: 3 },
    };
    const wrapper = makeWrapperMedium(KGridItem, props);
    expect(wrapper.classes()[1]).toEqual('pure-u-6-24');
  });

  it('should handle responsive sizes - large', () => {
    const props = {
      layout4: { span: 1 },
      layout8: { span: 2 },
      layout12: { span: 3 },
    };
    const wrapper = makeWrapperLarge(KGridItem, props);
    expect(wrapper.classes()[1]).toEqual('pure-u-6-24');
  });

  describe('default behaviors', () => {
    const props = {
      layout: { alignment: 'right' },
      layout4: { alignment: 'center' },
      layout8: { span: 2 },
      layout12: { span: 6, alignment: 'left' },
    };

    it('should be full-width, center-aligned on small screens', () => {
      const wrapper = makeWrapperSmall(KGridItem, props);
      expect(wrapper.element.style['text-align']).toEqual('center');
      expect(wrapper.classes()[1]).toEqual('pure-u-24-24');
    });

    it('should be 25% width, right-aligned on medium screens', () => {
      const wrapper = makeWrapperMedium(KGridItem, props);
      expect(wrapper.element.style['text-align']).toEqual('right');
      expect(wrapper.classes()[1]).toEqual('pure-u-6-24');
    });

    it('should be 50% width, left-aligned on large screens', () => {
      const wrapper = makeWrapperLarge(KGridItem, props);
      expect(wrapper.element.style['text-align']).toEqual('left');
      expect(wrapper.classes()[1]).toEqual('pure-u-12-24');
    });
  });
});
