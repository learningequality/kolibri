import { mount } from '@vue/test-utils';
import ScrollingHeader from '../ScrollingHeader';

function makeWrapper(params = {}) {
  const node = document.createElement('app');
  document.body.appendChild(node);
  const { scrollPosition = 0, isHidden } = params;
  return mount(ScrollingHeader, {
    propsData: {
      mainWrapperScrollHeight: 1000,
      scrollPosition,
      isHidden,
    },
    attachTo: node,
  });
}

describe('ScrollingHeader component', () => {
  it('should not do anything if it is hidden and user continues to go down', async () => {
    const wrapper = makeWrapper({ isHidden: true, scrollPosition: 10 });
    wrapper.setProps({
      scrollPosition: 20,
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:isHidden')).toBeUndefined();
  });

  it('should not do anything if it is shown and user continues to go up', async () => {
    const wrapper = makeWrapper({ isHidden: false, scrollPosition: 100 });
    wrapper.setProps({
      scrollPosition: 50,
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:isHidden')).toBeUndefined();
  });

  it('should not do anything if hidden and scrolling up under the distance threshold', async () => {
    const wrapper = makeWrapper({ isHidden: true, scrollPosition: 500 });
    wrapper.setProps({
      scrollPosition: 450,
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:isHidden')).toBeUndefined();
  });

  it('should not do anything if shown and scrolling down under the distance threshold', async () => {
    const wrapper = makeWrapper({ isHidden: false, scrollPosition: 500 });
    wrapper.setProps({
      scrollPosition: 520,
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:isHidden')).toBeUndefined();
  });

  it('should hide itself if going past the distance threshold', async () => {
    const wrapper = makeWrapper({ isHidden: false, scrollPosition: 100 });
    wrapper.setProps({
      scrollPosition: 200,
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:isHidden')[0]).toEqual([true]);
  });

  it('should unhide itself if going past the distance threshold', async () => {
    const wrapper = makeWrapper({ isHidden: true, scrollPosition: 500 });
    wrapper.setProps({
      scrollPosition: 200,
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:isHidden')[0]).toEqual([false]);
  });
});
