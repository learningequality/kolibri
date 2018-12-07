import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import CreateLearnerAccountForm from '../../src/views/onboarding-forms/CreateLearnerAccountForm';

function makeWrapper(options) {
  const store = makeStore();
  if (options.preset) {
    store.commit('SET_FACILITY_PRESET', options.preset);
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

  it('has the correct default with "informal" preset', () => {
    const { wrapper } = makeWrapper({ preset: 'informal' });
    expect(wrapper.vm.settingIsEnabled).toEqual(true);
  });

  it('if user has set it in a previous step, it is kept', () => {
    const { wrapper } = makeWrapper({ preset: 'nonformal', previousChoice: false });
    expect(wrapper.vm.settingIsEnabled).toEqual(false);
  });

  it('after clicking submit, the setting in vuex is updated', () => {
    const { wrapper, store } = makeWrapper({ preset: 'formal' });
    wrapper.find({ name: 'YesNoForm' }).vm.emitSetting();
    expect(store.state.onboardingData.settings.learner_can_sign_up).toEqual(false);
    expect(store.state.onboardingData.settings.learner_can_edit_name).toEqual(false);
    expect(store.state.onboardingData.settings.learner_can_edit_username).toEqual(false);
    expect(wrapper.vm.$emit).toHaveBeenCalledTimes(1);
  });
});
