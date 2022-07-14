import { shallowMount } from '@vue/test-utils';
import ConfirmAccount from '../index.vue';

describe(`ChangeFacility/ConfirmAccount`, () => {
  it(`smoke test`, () => {
    const wrapper = shallowMount(ConfirmAccount);
    expect(wrapper.exists()).toBeTruthy();
  });
});
