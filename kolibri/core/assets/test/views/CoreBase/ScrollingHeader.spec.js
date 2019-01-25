import { mount } from '@vue/test-utils';
import ScrollingHeader from '../../../src/views/CoreBase/ScrollingHeader';

jest.useFakeTimers();

const HEIGHT = 100;

function createWrapper(scrollPosition = 0) {
  return mount(ScrollingHeader, {
    propsData: {
      height: HEIGHT,
      scrollPosition,
    },
  });
}

describe('Scrolling header movement logic', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
  it('should be pinned to the top by default', () => {
    const wrapper = createWrapper();
    expect(wrapper.vm.pinned).toBe(true);
    expect(wrapper.vm.offset).toBe(0);
  });
  it("should stay pinned pinned when it's currently pinned onscreen and we scroll up", () => {
    const wrapper = createWrapper(500);
    wrapper.setData({ pinned: true, offset: 0 });
    wrapper.setProps({ scrollPosition: 495 });
    expect(wrapper.vm.pinned).toBe(true);
    expect(wrapper.vm.offset).toBe(0);
    wrapper.vm.scrollingStopped();
    jest.runOnlyPendingTimers();
    expect(wrapper.vm.pinned).toBe(true);
    expect(wrapper.vm.offset).toBe(0);
  });
  it("should attach to content when it's currently pinned onscreen and we scroll down and then re-pin", () => {
    const wrapper = createWrapper(500);
    wrapper.setData({ pinned: true, offset: 0 });
    wrapper.setProps({ scrollPosition: 505 });
    expect(wrapper.vm.pinned).toBe(false);
    expect(wrapper.vm.offset).toBe(505);
    wrapper.vm.scrollingStopped();
    jest.runOnlyPendingTimers();
    expect(wrapper.vm.pinned).toBe(true);
    expect(wrapper.vm.offset).toBe(0);
  });
  it("should stay hidden when it's currently hidden and we scroll down", () => {
    const wrapper = createWrapper(500);
    wrapper.setData({ pinned: true, offset: -HEIGHT });
    wrapper.setProps({ scrollPosition: 505 });
    expect(wrapper.vm.pinned).toBe(true);
    expect(wrapper.vm.offset).toBe(-HEIGHT);
    wrapper.vm.scrollingStopped();
    jest.runOnlyPendingTimers();
    expect(wrapper.vm.pinned).toBe(true);
    expect(wrapper.vm.offset).toBe(-HEIGHT);
  });

  describe('scrolling down and currently attached to content', () => {
    it('should become pinned offscreen when after it scrolls offscreen', () => {
      const wrapper = createWrapper(500);
      wrapper.setData({ pinned: false, offset: 450 });
      wrapper.setProps({ scrollPosition: 650 });
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(-HEIGHT);
      wrapper.vm.scrollingStopped();
      jest.runOnlyPendingTimers();
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(-HEIGHT);
    });
    it("should stay attached to content when it's partially visible and then pin", () => {
      const wrapper = createWrapper(500);
      wrapper.setData({ pinned: false, offset: 450 });
      wrapper.setProps({ scrollPosition: 505 });
      expect(wrapper.vm.pinned).toBe(false);
      expect(wrapper.vm.offset).toBe(450);
      wrapper.vm.scrollingStopped();
      jest.runOnlyPendingTimers();
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(-HEIGHT);
    });
  });

  describe('scrolling up and currently attached to content', () => {
    it('should stay attached to content when partially visible and scrolling is slow and then pin', () => {
      const wrapper = createWrapper(500);
      wrapper.setData({ pinned: false, offset: 450 });
      wrapper.setProps({ scrollPosition: 495 });
      expect(wrapper.vm.pinned).toBe(false);
      expect(wrapper.vm.offset).toBe(450);
      wrapper.vm.scrollingStopped();
      jest.runOnlyPendingTimers();
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(-HEIGHT);
    });
    it('should become visibly pinned when scrolling is fast', () => {
      const wrapper = createWrapper(500);
      wrapper.setData({ pinned: false, offset: 450 });
      wrapper.setProps({ scrollPosition: 480 });
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(0);
      wrapper.vm.scrollingStopped();
      jest.runOnlyPendingTimers();
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(0);
    });
    it("should become visibly pinned when it's too low", () => {
      const wrapper = createWrapper(500);
      wrapper.setData({ pinned: false, offset: 550 });
      wrapper.setProps({ scrollPosition: 495 });
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(0);
    });
  });

  describe('stop scrolling with bar partially on screen', () => {
    it("should become visibly pinned if we're near the top of the screen", () => {
      const wrapper = createWrapper(10);
      wrapper.setData({ pinned: false, offset: 0 });
      wrapper.vm.scrollingStopped();
      jest.runOnlyPendingTimers();
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(0);
    });
    it('should become fully hidden if the app bar is 50% of the way on screen', () => {
      const wrapper = createWrapper(500);
      wrapper.setData({ pinned: false, offset: 450 });
      wrapper.vm.scrollingStopped();
      jest.runOnlyPendingTimers();
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(-HEIGHT);
    });
    it('should become fully visible if the app bar is 90% of the way on screen', () => {
      const wrapper = createWrapper(500);
      wrapper.setData({ pinned: false, offset: 495 });
      wrapper.vm.scrollingStopped();
      jest.runOnlyPendingTimers();
      expect(wrapper.vm.pinned).toBe(true);
      expect(wrapper.vm.offset).toBe(0);
    });
  });
});
