import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import CreateLearnerAccountForm from '../../src/views/onboarding-forms/CreateLearnerAccountForm';

function makeWrapper(options) {
  const store = makeStore();
  if (options.preset === 'formal') {
    store.dispatch('setFormalUsageDefaults');
  } else {
    store.dispatch('setNonformalUsageDefaults');
  }
  if (options.previousChoice !== undefined) {
    store.commit('SET_LEARNER_CAN_SIGN_UP', options.previousChoice);
  }
  const wrapper = mount(CreateLearnerAccountForm, {
    store,
  });
  jest.spyOn(wrapper.vm, '$emit');

  return { wrapper, store };
}

describe('CreateLearnerAccountForm', () => {
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
    expect(store.state.onboardingData.settings.learner_can_sign_up).toEqual(false);
    expect(store.state.onboardingData.settings.learner_can_edit_name).toEqual(false);
    expect(store.state.onboardingData.settings.learner_can_edit_username).toEqual(false);
    expect(wrapper.vm.$emit).toHaveBeenCalledTimes(1);
  });
});
