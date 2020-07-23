import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import RequirePasswordForLearnersForm from '../../src/views/onboarding-forms/RequirePasswordForLearnersForm';

function makeWrapper(options) {
  const store = makeStore();
  if (options.preset === 'formal') {
    store.dispatch('setFormalUsageDefaults');
  } else {
    store.dispatch('setNonformalUsageDefaults');
  }
  if (options.previousChoice !== undefined) {
    store.commit('SET_LEARNER_CAN_LOGIN_WITH_NO_PASSWORD', options.previousChoice);
  }
  const wrapper = mount(RequirePasswordForLearnersForm, {
    store,
  });
  jest.spyOn(wrapper.vm, '$emit');

  return { wrapper, store };
}

describe('RequirePasswordForLearnersForm', () => {
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
    expect(wrapper.vm.settingIsEnabled).toEqual(true);
  });

  it('after clicking submit, the setting in vuex is updated', () => {
    const { wrapper, store } = makeWrapper({ preset: 'formal' });
    wrapper.findComponent({ name: 'YesNoForm' }).vm.emitSetting();
    expect(store.state.onboardingData.settings.learner_can_login_with_no_password).toEqual(true);
    expect(wrapper.vm.$emit).toHaveBeenCalledTimes(1);
  });
});
