import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import SetupWizardIndex from '../../src/views/SetupWizardIndex';

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(SetupWizardIndex, {
    store,
  });
  jest.spyOn(wrapper.vm, 'provisionDevice').mockResolvedValue();
  return { wrapper, store };
}

async function assertAtCorrectFormEmitSubmit(componentName, wrapper) {
  const component = wrapper.find({ name: componentName });
  expect(component.isVueInstance()).toBe(true);
  // Simulate clicking submit because clicking the button doesn't work
  component.vm.$emit('submit');
  await wrapper.vm.$nextTick();
  if (component.name() !== 'PersonalDataConsentForm') {
    expect(component.exists()).toBe(false);
  }
}

xdescribe('SetupWizardIndex', () => {
  it('clicking next takes you to the next step', async () => {
    const { wrapper } = makeWrapper();
    // Step 1: DefaultLanguageForm
    await assertAtCorrectFormEmitSubmit('DefaultLanguageForm', wrapper);
    // Step 2: Facility Permissions Form
    await assertAtCorrectFormEmitSubmit('FacilityPermissionsForm', wrapper);
    // Step 3: Guest Access Form
    await assertAtCorrectFormEmitSubmit('GuestAccessForm', wrapper);
    // Step 4: Learners can create own account form
    await assertAtCorrectFormEmitSubmit('CreateLearnerAccountForm', wrapper);
    // Step 5: Require password for learners form
    await assertAtCorrectFormEmitSubmit('RequirePasswordForLearnersForm', wrapper);
    // Step 6: Superuser Credentials Form
    await assertAtCorrectFormEmitSubmit('SuperuserCredentialsForm', wrapper);
    // Step 7: Personal Data Consent Form
    await assertAtCorrectFormEmitSubmit('PersonalDataConsentForm', wrapper);
    expect(wrapper.vm.provisionDevice).toHaveBeenCalledTimes(1);
  });

  it('submits a default facility name if "informal" preset is used', async () => {
    const { wrapper, store } = makeWrapper();
    // set superuser, since that's how name is derived
    store.commit('SET_FACILITY_PRESET', 'informal');
    store.commit('SET_SUPERUSER_CREDENTIALS', {
      full_name: 'Fred Rogers',
      username: 'mr_rogers',
      password: 'password',
    });
    store.commit('SET_ONBOARDING_STEP', 7);
    await wrapper.vm.$nextTick();
    await assertAtCorrectFormEmitSubmit('PersonalDataConsentForm', wrapper);
    const matcher = expect.objectContaining({ facility: { name: 'Home Facility Fred Rogers' } });
    expect(wrapper.vm.provisionDevice).toHaveBeenCalledWith(matcher);
  });

  it('submits correct data when provisioning', async () => {
    const { wrapper, store } = makeWrapper();
    // set superuser, since that's how name is derived
    store.commit('SET_FACILITY_PRESET', 'formal');
    store.commit('SET_SUPERUSER_CREDENTIALS', {
      full_name: 'Fred Rogers',
      username: 'mr_rogers',
      password: 'password',
    });
    store.commit('SET_FACILITY_NAME', "Mr. Roger's Neighborhood");
    store.commit('SET_ALLOW_GUEST_ACCESS', true);
    store.commit('SET_LEARNER_CAN_SIGN_UP', false);
    store.commit('SET_LEARNER_CAN_LOGIN_WITH_NO_PASSWORD', true);
    store.commit('SET_ONBOARDING_STEP', 7);
    await wrapper.vm.$nextTick();
    await assertAtCorrectFormEmitSubmit('PersonalDataConsentForm', wrapper);
    const matcher = expect.objectContaining({
      language_id: 'en',
      facility: { name: "Mr. Roger's Neighborhood" },
      preset: 'formal',
      allow_guest_access: true,
      superuser: {
        full_name: 'Fred Rogers',
        username: 'mr_rogers',
        password: 'password',
        gender: 'NOT_SPECIFIED',
        birth_year: 'NOT_SPECIFIED',
      },
      settings: {
        learner_can_sign_up: false,
        learner_can_edit_name: false,
        learner_can_edit_username: false,
        learner_can_login_with_no_password: true,
      },
    });
    expect(wrapper.vm.provisionDevice).toHaveBeenCalledWith(matcher);
  });
});
