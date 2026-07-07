import { mount } from '@vue/test-utils';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import DragContainer from '../DragContainer.vue';

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion');

// Real @shopify/draggable manipulates mouse/pointer events in ways jsdom doesn't
// support; only its constructor shape matters for these tests.
jest.mock('@shopify/draggable/lib/es5/draggable.bundle.legacy.js', () => ({
  Sortable: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    removePlugin: jest.fn(),
    destroy: jest.fn(),
  })),
  Plugins: { SwapAnimation: 'SwapAnimation' },
  Draggable: { Plugins: { Focusable: 'Focusable' } },
}));

describe('DragContainer', () => {
  let sendPoliteMessage;
  const items = [
    { id: 1, title: 'First' },
    { id: 2, title: 'Second' },
    { id: 3, title: 'Third' },
  ];

  beforeEach(() => {
    sendPoliteMessage = jest.fn();
    useKLiveRegion.mockReturnValue({ sendPoliteMessage });
  });

  async function makeWrapper(propsData = {}) {
    const wrapper = mount(DragContainer, {
      propsData: { items, ...propsData },
      slots: {
        default: `
          <div>
            <div tabindex="0" class="row" data-test="row-0"></div>
            <div tabindex="0" class="row" data-test="row-1"></div>
            <div tabindex="0" class="row" data-test="row-2"></div>
          </div>
        `,
      },
    });
    // initialize() runs on $nextTick after mount, and is what registers
    // the focusout listener we're testing against
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  describe('full-order announcement on focus-exit', () => {
    it('announces the full current order when focus moves outside the container', async () => {
      document.hasFocus = jest.fn(() => true);
      const wrapper = await makeWrapper({ getItemLabel: item => item.title });
      const outsideEl = document.createElement('button');
      document.body.appendChild(outsideEl);

      await wrapper.trigger('focusout', { relatedTarget: outsideEl });

      expect(sendPoliteMessage).toHaveBeenCalledWith(
        'Current order: 1. First, 2. Second, 3. Third',
      );
      document.body.removeChild(outsideEl);
    });

    it('announces the full order even when relatedTarget is null, provided the window is still focused', async () => {
      document.hasFocus = jest.fn(() => true);
      const wrapper = await makeWrapper({ getItemLabel: item => item.title });

      await wrapper.trigger('focusout', { relatedTarget: null });

      expect(sendPoliteMessage).toHaveBeenCalledWith(expect.stringContaining('Current order:'));
    });

    it('does not announce anything when getItemLabel is not provided', async () => {
      document.hasFocus = jest.fn(() => true);
      const wrapper = await makeWrapper();
      const outsideEl = document.createElement('button');
      document.body.appendChild(outsideEl);

      await wrapper.trigger('focusout', { relatedTarget: outsideEl });

      expect(sendPoliteMessage).not.toHaveBeenCalled();
      document.body.removeChild(outsideEl);
    });
  });

  describe('no announcement on row-to-row focus movement', () => {
    it('does not announce when focus moves to another row inside the container', async () => {
      document.hasFocus = jest.fn(() => true);
      const wrapper = await makeWrapper({ getItemLabel: item => item.title });
      const rowB = wrapper.find('[data-test="row-1"]').element;

      await wrapper.trigger('focusout', { relatedTarget: rowB });

      expect(sendPoliteMessage).not.toHaveBeenCalled();
    });
  });

  describe('window/tab blur', () => {
    it('does not announce on window blur, even with a null relatedTarget', async () => {
      document.hasFocus = jest.fn(() => false);
      const wrapper = await makeWrapper({ getItemLabel: item => item.title });

      await wrapper.trigger('focusout', { relatedTarget: null });

      expect(sendPoliteMessage).not.toHaveBeenCalled();
    });
  });
});
