import { mount } from '@vue/test-utils';
import DraggableItem from '../DraggableItem.vue';
import DraggableHandle from '../DraggableHandle.vue';
import { ITEM_CLASS, HANDLE_CLASS, DISABLED_CLASS } from '../classDefinitions';

// The slot's own element is what gets marked, so every mount supplies one.
const slots = { default: '<div />' };

describe('DraggableItem', () => {
  it('marks the element the consumer wrote instead of wrapping it', () => {
    const wrapper = mount(DraggableItem, { slots: { default: '<li>row</li>' } });
    expect(wrapper.element.tagName).toBe('LI');
    expect(wrapper.classes()).toContain(ITEM_CLASS);
  });

  it('keeps the classes that element already had', () => {
    const wrapper = mount(DraggableItem, { slots: { default: '<div class="my-row" />' } });
    expect(wrapper.classes()).toContain(ITEM_CLASS);
    expect(wrapper.classes()).toContain('my-row');
  });

  it('merges a class bound on the component onto that same element', () => {
    const host = mount({
      components: { DraggableItem },
      template: `<DraggableItem class="my-row"><div /></DraggableItem>`,
    });
    const item = host.findComponent(DraggableItem);
    expect(item.classes()).toContain(ITEM_CLASS);
    expect(item.classes()).toContain('my-row');
  });

  it('adds the disabled class only when disabled', () => {
    expect(mount(DraggableItem, { slots }).classes()).not.toContain(DISABLED_CLASS);
    expect(mount(DraggableItem, { propsData: { disabled: true }, slots }).classes()).toContain(
      DISABLED_CLASS,
    );
  });

  it('forwards attributes to that element', () => {
    const wrapper = mount(DraggableItem, { attrs: { tabindex: '-1' }, slots });
    expect(wrapper.attributes('tabindex')).toBe('-1');
  });

  it('renders its slot content', () => {
    const wrapper = mount(DraggableItem, { slots: { default: '<div><span>hello</span></div>' } });
    expect(wrapper.text()).toBe('hello');
  });
});

describe('DraggableHandle', () => {
  it('marks the element the consumer wrote instead of wrapping it', () => {
    const wrapper = mount(DraggableHandle, { slots: { default: '<span>grip</span>' } });
    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.classes()).toContain(HANDLE_CLASS);
  });

  it('marks the root element of a component in its slot', () => {
    const Grip = { name: 'Grip', template: '<button class="grip">grip</button>' };
    const wrapper = mount(DraggableHandle, { slots: { default: Grip } });
    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.classes()).toContain(HANDLE_CLASS);
    expect(wrapper.classes()).toContain('grip');
  });
});
