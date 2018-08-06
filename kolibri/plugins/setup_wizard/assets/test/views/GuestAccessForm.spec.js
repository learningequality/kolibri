import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import GuestAccessForm from '../../src/views/onboarding-forms/GuestAccessForm';

function makeWrapper(options) {
  const store = makeStore();
  if (options.preset) {
    store.commit('SET_FACILITY_PRESET', options.preset);
  }
  const wrapper = mount(GuestAccessForm, {
    store,
  });
  jest.spyOn(wrapper.vm, '$emit');

  return { wrapper, store };
}

describe('GuestAccessForm', () => {
  it('has the correct default with "nonformal" preset', () => {
    const { wrapper } = makeWrapper({ preset: 'nonformal' });
    expect(wrapper.vm.settingIsEnabled).toEqual(true);
  });

  it('has the correct default with "formal" preset', () => {
    const { wrapper } = makeWrapper({ preset: 'formal' });
    expect(wrapper.vm.settingIsEnabled).toEqual(false);
  });

  it('has the correct default with "personal" preset', () => {
    const { wrapper } = makeWrapper({ preset: 'personal' });
    expect(wrapper.vm.settingIsEnabled).toEqual(true);
  });

  it('after clicking submit, the setting in vuex is updated', () => {
    const { wrapper, store } = makeWrapper({ preset: 'formal' });
    wrapper.find({ name: 'YesNoForm' }).vm.$emit('submit');
    expect(store.state.onboardingData.settings.allow_guest_access).toEqual(false);
    expect(wrapper.vm.$emit).toHaveBeenCalledTimes(1);
  });
});
