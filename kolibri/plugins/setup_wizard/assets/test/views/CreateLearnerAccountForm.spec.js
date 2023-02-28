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
    provide: {
      wizardService: {
        state: {
          context: {
            learnerCanCreateAccount: null,
            formalOrNonformal: options.preset,
          },
        },
      },
    },
  });
  jest.spyOn(wrapper.vm, '$emit');

  return { wrapper, store };
}

describe('CreateLearnerAccountForm', () => {
  it('has the correct default with "nonformal" preset', () => {
    const { wrapper } = makeWrapper({ preset: 'nonformal' });
    expect(wrapper.vm.setting).toEqual(true);
  });

  it('has the correct default with "formal" preset', () => {
    const { wrapper } = makeWrapper({ preset: 'formal' });
    expect(wrapper.vm.setting).toEqual(false);
  });
});
