import { mount } from '@vue/test-utils';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import DraggableUniverse from '../DraggableUniverse.vue';
import { createDraggableUniverse, injectDraggableUniverse } from '../useDraggableUniverse';

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion');

describe('useDraggableUniverse', () => {
  beforeEach(() => {
    useKLiveRegion.mockReturnValue({ sendPoliteMessage: jest.fn() });
  });

  it('gives separate universes distinct group names', () => {
    const a = createDraggableUniverse();
    const b = createDraggableUniverse();
    expect(a.groupName).not.toEqual(b.groupName);
  });

  it('uses an explicit name when provided', () => {
    expect(createDraggableUniverse({ name: 'gaps' }).groupName).toBe('gaps');
  });

  it('honours a custom delay', () => {
    expect(createDraggableUniverse({ delay: 0 }).delay.value).toBe(0);
    expect(createDraggableUniverse().delay.value).toBe(250);
  });

  it('tracks later changes to the delay prop', async () => {
    let injected = null;
    const Child = {
      render: () => null,
      setup() {
        injected = injectDraggableUniverse();
      },
    };
    const wrapper = mount(DraggableUniverse, {
      propsData: { delay: 250 },
      slots: { default: Child },
    });
    await wrapper.setProps({ delay: 0 });
    expect(injected.delay.value).toBe(0);
  });

  it('resolves a registered region element back to its API', () => {
    const universe = createDraggableUniverse();
    const el = document.createElement('div');
    const api = { insertAt: jest.fn() };
    universe.registerRegion(el, api);
    expect(universe.getRegion(el)).toBe(api);
    universe.unregisterRegion(el);
    expect(universe.getRegion(el)).toBeUndefined();
  });

  it('provides the context to descendants that inject it', () => {
    let injected = null;
    const Child = {
      render: () => null,
      setup() {
        injected = injectDraggableUniverse();
      },
    };
    mount(DraggableUniverse, {
      propsData: { name: 'shared' },
      slots: { default: Child },
    });
    expect(injected).not.toBeNull();
    expect(injected.groupName).toBe('shared');
  });

  it('injects null when there is no universe ancestor', () => {
    let injected = 'unset';
    mount({
      render: () => null,
      setup() {
        injected = injectDraggableUniverse();
      },
    });
    expect(injected).toBeNull();
  });
});
