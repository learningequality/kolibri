import { mount } from '@vue/test-utils';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import DraggableUniverse from '../DraggableUniverse.vue';
import DraggableRegion from '../DraggableRegion.vue';
import { ITEM_CLASS } from '../classDefinitions';

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion');

// Real SortableJS drives pointer events jsdom can't produce; we only need the
// options object it's constructed with, so we can drive the region's own
// lifecycle callbacks (onStart / onEnd / group.put) against real jsdom nodes.
let mockInstances;
jest.mock('sortablejs', () =>
  jest.fn().mockImplementation((el, options) => {
    const instance = { el, options, option: jest.fn(), destroy: jest.fn() };
    mockInstances.push(instance);
    return instance;
  }),
);

// A row element carrying the draggable marker class, so insertNodeAt has real
// children to index into.
function row(text) {
  const el = document.createElement('div');
  el.className = ITEM_CLASS;
  el.textContent = text;
  return el;
}

describe('DraggableRegion', () => {
  let sendPoliteMessage;

  beforeEach(() => {
    mockInstances = [];
    sendPoliteMessage = jest.fn();
    useKLiveRegion.mockReturnValue({ sendPoliteMessage });
    document.hasFocus = jest.fn(() => true);
  });

  // Mounts a lone region and returns its captured Sortable options. The region marks
  // the element written inside it rather than rendering one of its own.
  async function mountRegion(propsData = {}, mountOptions = {}) {
    const wrapper = mount(DraggableRegion, {
      propsData: { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], ...propsData },
      slots: { default: '<div />' },
      ...mountOptions,
    });
    await wrapper.vm.$nextTick();
    const instance = mockInstances[mockInstances.length - 1];
    return { wrapper, options: instance.options, sortable: instance };
  }

  it('sorts the element written inside it, rather than one of its own', async () => {
    const { wrapper, sortable } = await mountRegion({}, { slots: { default: '<ul />' } });
    expect(wrapper.element.tagName).toBe('UL');
    expect(sortable.el).toBe(wrapper.element);
  });

  it('confines the press-and-hold delay to touch, so a mouse drag is not swallowed', async () => {
    const { options } = await mountRegion();
    expect(options.delayOnTouchOnly).toBe(true);
  });

  describe('capacity (group.put)', () => {
    it('accepts a drop while below capacity and rejects it once full', async () => {
      const { options } = await mountRegion({ items: [{ id: 'a' }], capacity: 2 });
      expect(options.group.put()).toBe(true);
      const { options: full } = await mountRegion({
        items: [{ id: 'a' }, { id: 'b' }],
        capacity: 2,
      });
      expect(full.group.put()).toBe(false);
    });

    it('never rejects when capacity is null (unlimited)', async () => {
      const { options } = await mountRegion({ items: [{ id: 'a' }, { id: 'b' }], capacity: null });
      expect(options.group.put()).toBe(true);
    });

    it('rejects every drop when disabled', async () => {
      const { options } = await mountRegion({ items: [], capacity: 5, disabled: true });
      expect(options.group.put()).toBe(false);
    });

    it('rejects when the accepts predicate returns false, even below capacity', async () => {
      const { options } = await mountRegion({
        items: [{ id: 'a' }],
        capacity: 5,
        accepts: () => false,
      });
      expect(options.group.put()).toBe(false);
    });
  });

  describe('options that change after mount', () => {
    it('pushes a flipped sortable prop into the SortableJS instance', async () => {
      const { wrapper, sortable } = await mountRegion({ sortable: true });
      await wrapper.setProps({ sortable: false });
      expect(sortable.option).toHaveBeenCalledWith('sort', false);
    });

    it('pushes a flipped clone prop into the SortableJS instance', async () => {
      const { wrapper, sortable } = await mountRegion({ clone: false });
      await wrapper.setProps({ clone: true });
      expect(sortable.option).toHaveBeenCalledWith(
        'group',
        expect.objectContaining({ pull: 'clone' }),
      );
    });

    it("pushes the universe's changed delay into the SortableJS instance", async () => {
      const wrapper = mount({
        components: { DraggableUniverse, DraggableRegion },
        data() {
          return { delay: 250, items: [{ id: 'a' }] };
        },
        template: `
          <DraggableUniverse :delay="delay">
            <div>
              <DraggableRegion :items="items"><div /></DraggableRegion>
            </div>
          </DraggableUniverse>
        `,
      });
      await wrapper.vm.$nextTick();
      const sortable = mockInstances[mockInstances.length - 1];
      expect(sortable.options.delay).toBe(250);

      await wrapper.setData({ delay: 0 });
      expect(sortable.option).toHaveBeenCalledWith('delay', 0);
    });
  });

  describe('reorder within a region', () => {
    it('emits the reordered array on a same-region move', async () => {
      const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const { wrapper, options } = await mountRegion({ items });
      const from = wrapper.element;
      [row('a'), row('b'), row('c')].forEach(r => from.appendChild(r));
      const item = from.children[0];

      options.onEnd({
        item,
        from,
        to: from,
        oldIndex: 0,
        oldDraggableIndex: 0,
        newDraggableIndex: 2,
      });

      const emitted = wrapper.emitted('update:items');
      expect(emitted).toHaveLength(1);
      expect(emitted[0][0].map(i => i.id)).toEqual(['b', 'c', 'a']);
    });

    it('emits nothing for a no-op drag (same index)', async () => {
      const { wrapper, options } = await mountRegion();
      const from = wrapper.element;
      from.appendChild(row('a'));
      options.onEnd({
        item: from.children[0],
        from,
        to: from,
        oldIndex: 0,
        oldDraggableIndex: 1,
        newDraggableIndex: 1,
      });
      expect(wrapper.emitted('update:items')).toBeUndefined();
    });

    it('reverts the DOM so the moved node is back under its source at its old index', async () => {
      const { wrapper, options } = await mountRegion();
      const from = wrapper.element;
      [row('a'), row('b')].forEach(r => from.appendChild(r));
      const item = from.children[0];
      options.onEnd({
        item,
        from,
        to: from,
        oldIndex: 0,
        oldDraggableIndex: 0,
        newDraggableIndex: 1,
      });
      expect(item.parentElement).toBe(from);
      expect(from.children[0]).toBe(item);
    });
  });

  // Two regions inside one universe so they share a SortableJS group and registry.
  async function mountUniverse(targetProps = {}, { sourceProps = {}, sourceItems } = {}) {
    const wrapper = mount({
      components: { DraggableUniverse, DraggableRegion },
      data() {
        return {
          source: sourceItems || [{ id: 'a' }, { id: 'b' }],
          target: [{ id: 'x' }],
          sourceProps,
          targetProps,
        };
      },
      template: `
        <DraggableUniverse>
          <div>
            <DraggableRegion :items="source" v-bind="sourceProps" @update:items="source = $event">
              <div />
            </DraggableRegion>
            <DraggableRegion :items="target" v-bind="targetProps" @update:items="target = $event">
              <div />
            </DraggableRegion>
          </div>
        </DraggableUniverse>
      `,
    });
    await wrapper.vm.$nextTick();
    const regions = wrapper.findAllComponents({ name: 'DraggableRegion' });
    return {
      wrapper,
      sourceRegion: regions.at(0),
      targetRegion: regions.at(1),
      sourceOptions: mockInstances[0].options,
      sourceEl: regions.at(0).element,
      targetEl: regions.at(1).element,
    };
  }

  describe('cross-region move', () => {
    it('moves an item: source loses it, target gains it at the drop index', async () => {
      const { sourceRegion, targetRegion, sourceOptions, sourceEl, targetEl } =
        await mountUniverse();
      sourceEl.appendChild(row('a'));
      sourceEl.appendChild(row('b'));
      const item = sourceEl.children[0];

      sourceOptions.onStart({ oldDraggableIndex: 0 });
      sourceOptions.onEnd({
        item,
        from: sourceEl,
        to: targetEl,
        oldIndex: 0,
        oldDraggableIndex: 0,
        newDraggableIndex: 1,
      });

      expect(sourceRegion.emitted('update:items')[0][0].map(i => i.id)).toEqual(['b']);
      expect(targetRegion.emitted('update:items')[0][0].map(i => i.id)).toEqual(['x', 'a']);
    });

    // SortableJS builds a clone node for every drag, whether or not it is shown
    it('removes the clone node SortableJS left in the source region', async () => {
      const { sourceOptions, sourceEl, targetEl } = await mountUniverse();
      sourceEl.appendChild(row('a'));
      sourceEl.appendChild(row('b'));
      const item = sourceEl.children[0];
      const clone = row('a-clone');
      sourceEl.appendChild(clone);

      sourceOptions.onStart({ oldDraggableIndex: 0 });
      sourceOptions.onEnd({
        item,
        clone,
        from: sourceEl,
        to: targetEl,
        oldIndex: 0,
        oldDraggableIndex: 0,
        newDraggableIndex: 0,
      });

      expect(clone.parentNode).toBeNull();
    });

    it('announces the drop when the target region has a label', async () => {
      const { sourceOptions, sourceEl, targetEl } = await mountUniverse({ label: 'Gap 1' });
      sourceEl.appendChild(row('a'));
      sourceEl.appendChild(row('b'));
      sourceOptions.onStart({ oldDraggableIndex: 0 });
      sourceOptions.onEnd({
        item: sourceEl.children[0],
        from: sourceEl,
        to: targetEl,
        oldIndex: 0,
        oldDraggableIndex: 0,
        newDraggableIndex: 0,
      });
      expect(sendPoliteMessage).toHaveBeenCalledWith('Moved to Gap 1');
    });

    it('leaves data untouched when dropped outside the universe', async () => {
      const { sourceRegion, sourceOptions, sourceEl } = await mountUniverse();
      sourceEl.appendChild(row('a'));
      sourceEl.appendChild(row('b'));
      const stray = document.createElement('div');
      sourceOptions.onStart({ oldDraggableIndex: 0 });
      sourceOptions.onEnd({
        item: sourceEl.children[0],
        from: sourceEl,
        to: stray,
        oldIndex: 0,
        oldDraggableIndex: 0,
        newDraggableIndex: 0,
      });
      expect(sourceRegion.emitted('update:items')).toBeUndefined();
    });
  });

  describe('cross-region clone', () => {
    // Drags the first source item onto the front of the target region, as a clone.
    async function dropClone({ sourceProps, sourceItems } = {}) {
      const context = await mountUniverse(
        {},
        { sourceProps: sourceProps || { clone: true }, sourceItems },
      );
      const { sourceOptions, sourceEl, targetEl } = context;
      sourceEl.appendChild(row('a'));
      sourceEl.appendChild(row('b'));
      sourceOptions.onStart({ oldDraggableIndex: 0 });
      sourceOptions.onEnd({
        item: sourceEl.children[0],
        from: sourceEl,
        to: targetEl,
        oldIndex: 0,
        oldDraggableIndex: 0,
        newDraggableIndex: 0,
        pullMode: 'clone',
      });
      return context;
    }

    it('sets pull to clone when the clone prop is set', async () => {
      const { options } = await mountRegion({ clone: true });
      expect(options.group.pull).toBe('clone');
    });

    it('leaves the source array untouched', async () => {
      const { sourceRegion } = await dropClone();
      expect(sourceRegion.emitted('update:items')).toBeUndefined();
    });

    it('inserts a copy, not the source object itself', async () => {
      const { sourceRegion, targetRegion } = await dropClone();
      const inserted = targetRegion.emitted('update:items')[0][0][0];
      const original = sourceRegion.props('items')[0];
      expect(inserted).not.toBe(original);
      expect(inserted).toEqual(original);
    });

    it('does not mutate the source item when the clone is changed', async () => {
      const { sourceRegion, targetRegion } = await dropClone();
      const inserted = targetRegion.emitted('update:items')[0][0][0];
      inserted.id = 'changed';
      inserted.matched = true;
      expect(sourceRegion.props('items')[0]).toEqual({ id: 'a' });
    });

    it('keeps the identifier field the source data uses', async () => {
      const { targetRegion } = await dropClone({
        sourceItems: [
          { identifier: 'CHOICE_A', text: 'Alpha' },
          { identifier: 'CHOICE_B', text: 'Beta' },
        ],
      });
      expect(targetRegion.emitted('update:items')[0][0][0]).toEqual({
        identifier: 'CHOICE_A',
        text: 'Alpha',
      });
    });

    it('uses a transform function passed as the clone prop', async () => {
      let next = 0;
      const { targetRegion } = await dropClone({
        sourceProps: { clone: original => ({ ...original, uid: `copy-${++next}` }) },
      });
      expect(targetRegion.emitted('update:items')[0][0][0]).toEqual({ id: 'a', uid: 'copy-1' });
    });
  });

  describe('full-order announcement on focus-exit', () => {
    // The announcement waits a frame to see where focus settled.
    function nextFrame() {
      return new Promise(resolve => requestAnimationFrame(() => resolve()));
    }

    // A region in the document, so document.activeElement can be inside it.
    async function mountAttachedRegion() {
      const { wrapper } = await mountRegion({}, { attachTo: document.body });
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      return { wrapper, outside };
    }

    it('announces the current order when focus leaves the region', async () => {
      const { wrapper, outside } = await mountAttachedRegion();
      // Simulate DragSortWidget registrations via the provided callbacks.
      const provided = wrapper.vm._provided;
      provided.registerSortItem(0, 'First', 1);
      provided.registerSortItem(1, 'Second', 2);
      provided.registerSortItem(2, 'Third', 3);

      await wrapper.trigger('focusout', { relatedTarget: outside });
      outside.focus();
      await nextFrame();

      expect(sendPoliteMessage).toHaveBeenCalledWith(
        'Current order: 1. First, 2. Second, 3. Third',
      );
      document.body.removeChild(outside);
      wrapper.destroy();
    });

    it('does not announce when no items are registered', async () => {
      const { wrapper, outside } = await mountAttachedRegion();
      await wrapper.trigger('focusout', { relatedTarget: outside });
      outside.focus();
      await nextFrame();
      expect(sendPoliteMessage).not.toHaveBeenCalled();
      document.body.removeChild(outside);
      wrapper.destroy();
    });

    it('does not announce anything for items that have been unregistered', async () => {
      const { wrapper } = await mountRegion();
      const provided = wrapper.vm._provided;
      provided.registerSortItem(0, 'First', 1);
      provided.registerSortItem(1, 'Second', 2);
      provided.registerSortItem(2, 'Third', 3);
      [0, 1, 2].forEach(uid => provided.unregisterSortItem(uid));

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      await wrapper.trigger('focusout', { relatedTarget: outside });

      expect(sendPoliteMessage).not.toHaveBeenCalled();
      document.body.removeChild(outside);
    });

    it('does not announce on window blur (document not focused)', async () => {
      document.hasFocus = jest.fn(() => false);
      const { wrapper } = await mountRegion();
      wrapper.vm._provided.registerSortItem(0, 'First', 1);
      await wrapper.trigger('focusout', { relatedTarget: null });
      await nextFrame();
      expect(sendPoliteMessage).not.toHaveBeenCalled();
    });
  });

  describe('no announcement on row-to-row focus movement', () => {
    it('does not announce when focus moves to another row inside the region', async () => {
      const { wrapper } = await mountRegion();
      const provided = wrapper.vm._provided;
      provided.registerSortItem(0, 'First', 1);
      provided.registerSortItem(1, 'Second', 2);
      const secondRow = row('Second');
      wrapper.element.appendChild(secondRow);

      await wrapper.trigger('focusout', { relatedTarget: secondRow });

      expect(sendPoliteMessage).not.toHaveBeenCalled();
    });
  });
});
