import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import GuestAccessForm from '../../src/views/onboarding-forms/GuestAccessForm';

function makeWrapper(options) {
  const store = makeStore();
  if (options.preset === 'formal') {
    store.dispatch('setFormalUsageDefaults');
  } else {
    store.dispatch('setNonformalUsageDefaults');
  }
  if (options.previousChoice !== undefined) {
    store.commit('SET_ALLOW_GUEST_ACCESS', options.previousChoice);
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

  it('if user has set it in a previous step, it is kept', () => {
    const { wrapper } = makeWrapper({ preset: 'nonformal', previousChoice: false });
    expect(wrapper.vm.settingIsEnabled).toEqual(false);
  });

  it('after clicking submit, the setting in vuex is updated', () => {
    const { wrapper, store } = makeWrapper({ preset: 'formal' });
    wrapper.findComponent({ name: 'YesNoForm' }).vm.emitSetting();
    expect(store.state.onboardingData.allow_guest_access).toEqual(false);
    expect(wrapper.vm.$emit).toHaveBeenCalledTimes(1);
  });
});
