import { mount } from '@vue/test-utils';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import DragSortWidget from '../DragSortWidget/index.vue';

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion');

describe('DragSortWidget', () => {
  let sendPoliteMessage;

  beforeEach(() => {
    sendPoliteMessage = jest.fn();
    useKLiveRegion.mockReturnValue({ sendPoliteMessage });
  });

  function makeWrapper(propsData = {}) {
    return mount(DragSortWidget, {
      propsData: {
        isFirst: false,
        isLast: false,
        ...propsData,
      },
    });
  }

  describe('move-button announcements', () => {
    it('announces the item and its new position on move up', async () => {
      const wrapper = makeWrapper({ itemLabel: 'Rubens Barrichello', position: 2, total: 3 });
      await wrapper.findComponent({ ref: 'upBtn' }).vm.$emit('click');
      expect(sendPoliteMessage).toHaveBeenCalledWith('Rubens Barrichello moved to position 1 of 3');
    });

    it('announces the item and its new position on move down', async () => {
      const wrapper = makeWrapper({ itemLabel: 'Rubens Barrichello', position: 2, total: 3 });
      await wrapper.findComponent({ ref: 'dnBtn' }).vm.$emit('click');
      expect(sendPoliteMessage).toHaveBeenCalledWith('Rubens Barrichello moved to position 3 of 3');
    });

    it('does not announce when itemLabel is not provided', async () => {
      const wrapper = makeWrapper({ position: 2, total: 3 });
      await wrapper.findComponent({ ref: 'upBtn' }).vm.$emit('click');
      expect(sendPoliteMessage).not.toHaveBeenCalled();
    });

    it('does not announce when total is not provided', async () => {
      const wrapper = makeWrapper({ itemLabel: 'Rubens Barrichello', position: 2 });
      await wrapper.findComponent({ ref: 'upBtn' }).vm.$emit('click');
      expect(sendPoliteMessage).not.toHaveBeenCalled();
    });
  });

  describe('item-specific aria-labels', () => {
    it('uses the item label in vertical mode', () => {
      const wrapper = makeWrapper({ itemLabel: 'Rubens Barrichello', position: 2, total: 3 });
      expect(wrapper.findComponent({ ref: 'upBtn' }).props('ariaLabel')).toBe(
        'Move Rubens Barrichello up',
      );
      expect(wrapper.findComponent({ ref: 'dnBtn' }).props('ariaLabel')).toBe(
        'Move Rubens Barrichello down',
      );
    });

    it('falls back to the generic label when no itemLabel is given', () => {
      const wrapper = makeWrapper();
      expect(wrapper.findComponent({ ref: 'upBtn' }).props('ariaLabel')).toBe('Move up');
      expect(wrapper.findComponent({ ref: 'dnBtn' }).props('ariaLabel')).toBe('Move down');
    });
  });
});
