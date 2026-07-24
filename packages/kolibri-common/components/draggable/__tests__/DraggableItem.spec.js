import { mount } from '@vue/test-utils';
import DraggableItem from '../DraggableItem.vue';
import DraggableHandle from '../DraggableHandle.vue';
import { ITEM_CLASS, HANDLE_CLASS, DISABLED_CLASS } from '../classDefinitions';

describe('DraggableItem', () => {
  it('renders the requested tag with the item marker class', () => {
    const wrapper = mount(DraggableItem, { propsData: { tag: 'li' } });
    expect(wrapper.element.tagName).toBe('LI');
    expect(wrapper.classes()).toContain(ITEM_CLASS);
  });

  it('merges a consumer-supplied class onto the same root', () => {
    const host = mount({
      components: { DraggableItem },
      template: `<DraggableItem class="my-row" />`,
    });
    const item = host.findComponent(DraggableItem);
    expect(item.classes()).toContain(ITEM_CLASS);
    expect(item.classes()).toContain('my-row');
  });

  it('adds the disabled class only when disabled', () => {
    expect(mount(DraggableItem).classes()).not.toContain(DISABLED_CLASS);
    expect(mount(DraggableItem, { propsData: { disabled: true } }).classes()).toContain(
      DISABLED_CLASS,
    );
  });

  it('forwards attributes and listeners to the root element', async () => {
    const onClick = jest.fn();
    const wrapper = mount(DraggableItem, {
      attrs: { tabindex: '-1' },
      listeners: { click: onClick },
    });
    expect(wrapper.attributes('tabindex')).toBe('-1');
    await wrapper.trigger('click');
    expect(onClick).toHaveBeenCalled();
  });

  it('renders its slot content', () => {
    const wrapper = mount(DraggableItem, { slots: { default: '<span>hello</span>' } });
    expect(wrapper.text()).toBe('hello');
  });
});

describe('DraggableHandle', () => {
  it('renders the requested tag with the handle marker class', () => {
    const wrapper = mount(DraggableHandle, { propsData: { tag: 'span' } });
    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.classes()).toContain(HANDLE_CLASS);
  });

  it('renders its slot content', () => {
    const wrapper = mount(DraggableHandle, { slots: { default: '<i>grip</i>' } });
    expect(wrapper.text()).toBe('grip');
  });
});
