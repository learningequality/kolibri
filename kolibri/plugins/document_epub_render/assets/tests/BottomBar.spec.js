import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import BottomBar from '../src/views/BottomBar';

function createWrapper({
  heading,
  sliderValue = 0,
  sliderStep = 1,
  locationsAreReady = true,
} = {}) {
  return mount(BottomBar, {
    propsData: {
      heading,
      sliderValue,
      sliderStep,
      locationsAreReady,
    },
    store,
  });
}

describe('Bottom bar', () => {
  it('should mount', () => {
    const wrapper = createWrapper();
    expect(wrapper.exists()).toBe(true);
  });
  it('should not display a heading if none is provided', () => {
    const wrapper = createWrapper();
    expect(wrapper.contains('h3')).toBe(false);
  });
  it('should display a heading if one is provided', () => {
    const heading = 'Chapter 1';
    const wrapper = createWrapper({ heading });
    expect(wrapper.contains('h3')).toBe(true);
  });
  it('should not display slider if locations are not ready', () => {
    const wrapper = createWrapper({ locationsAreReady: false });
    expect(wrapper.contains('input')).toBeFalsy();
  });
  it('should display slider if locations are ready', () => {
    const wrapper = createWrapper();
    expect(wrapper.contains('input')).toBeTruthy();
  });
  it('should set the correct value on the slider', () => {
    const sliderValue = 100;
    const wrapper = createWrapper({ sliderValue });
    expect(wrapper.find('input').element.value).toBe(String(sliderValue));
  });
  it('should set the correct step on the slider', () => {
    const sliderStep = 10;
    const wrapper = createWrapper({ sliderStep });
    expect(wrapper.find('input').element.step).toBe(String(sliderStep));
  });
  it("should emit an event when the slider's value is changed", () => {
    const newValue = 50;
    const wrapper = createWrapper();
    wrapper.find('input').element.value = newValue;
    wrapper.find('input').trigger('change');
    expect(wrapper.emitted().sliderChanged[0][0]).toBe(newValue);
  });
});
