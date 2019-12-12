import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import SetupWizardIndex from '../../src/views/SetupWizardIndex';

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(SetupWizardIndex, {
    store,
  });
  jest.spyOn(wrapper.vm, 'provisionDevice').mockResolvedValue();
  const els = {
    DefaultLanguageForm: () => wrapper.find({ name: 'DefaultLanguageForm' }),
    FacilityPermissionsForm: () => wrapper.find({ name: 'FacilityPermissionsForm' }),
    GuestAccessForm: () => wrapper.find({ name: 'GuestAccessForm' }),
    CreateLearnerAccountForm: () => wrapper.find({ name: 'CreateLearnerAccountForm' }),
    RequirePasswordForLearnersForm: () => wrapper.find({ name: 'RequirePasswordForLearnersForm' }),
    SuperuserCredentialsForm: () => wrapper.find({ name: 'SuperuserCredentialsForm' }),
    PersonalDataConsentForm: () => wrapper.find({ name: 'PersonalDataConsentForm' }),
  };
  return { wrapper, store, els };
}

describe('SetupWizardIndex', () => {
  it('clicking next takes you to the next step', async () => {
    const { els, wrapper } = makeWrapper();
    // Step 1: DefaultLanguageForm
    expect(els.DefaultLanguageForm().isVueInstance()).toBe(true);
    // Simulate clicking submit because clicking the button doesn't work
    els.DefaultLanguageForm().vm.$emit('submit');
    expect(els.DefaultLanguageForm().exists()).toBe(false);

    // Step 2: Facility Permissions Form
    expect(els.FacilityPermissionsForm().isVueInstance()).toBe(true);
    els.FacilityPermissionsForm().vm.$emit('submit');
    await wrapper.vm.$nextTick();
    expect(els.FacilityPermissionsForm().exists()).toBe(false);

    // Step 3: Guest Access Form
    expect(els.GuestAccessForm().isVueInstance()).toBe(true);
    els.GuestAccessForm().vm.$emit('submit');
    expect(els.GuestAccessForm().exists()).toBe(false);

    // Step 4: Learners can create own account form
    expect(els.CreateLearnerAccountForm().isVueInstance()).toBe(true);
    els.CreateLearnerAccountForm().vm.$emit('submit');
    expect(els.CreateLearnerAccountForm().exists()).toBe(false);

    // Step 5: Require password for learners form
    expect(els.RequirePasswordForLearnersForm().isVueInstance()).toBe(true);
    els.RequirePasswordForLearnersForm().vm.$emit('submit');
    expect(els.RequirePasswordForLearnersForm().exists()).toBe(false);

    // Step 6: Superuser Credentials Form
    expect(els.SuperuserCredentialsForm().isVueInstance()).toBe(true);
    els.SuperuserCredentialsForm().vm.$emit('submit');
    expect(els.SuperuserCredentialsForm().exists()).toBe(false);

    // Step 7: Personal Data Consent Form
    expect(els.PersonalDataConsentForm().isVueInstance()).toBe(true);
    els.PersonalDataConsentForm().vm.$emit('submit');

    expect(wrapper.vm.provisionDevice).toHaveBeenCalledTimes(1);
  });

  it('submits a default facility name if "informal" preset is used', () => {
    const { els, wrapper, store } = makeWrapper();
    // set superuser, since that's how name is derived
    store.commit('SET_FACILITY_PRESET', 'informal');
    store.commit('SET_SU', {
      full_name: 'Fred Rogers',
      username: 'mr_rogers',
      password: 'password',
    });
    store.commit('SET_ONBOARDING_STEP', 7);
    els.PersonalDataConsentForm().vm.$emit('submit');
    const matcher = expect.objectContaining({ facility: { name: 'Home Facility Fred Rogers' } });
    expect(wrapper.vm.provisionDevice).toHaveBeenCalledWith(matcher);
  });

  it('submits correct data when provisioning', () => {
    const { els, wrapper, store } = makeWrapper();
    // set superuser, since that's how name is derived
    store.commit('SET_FACILITY_PRESET', 'formal');
    store.commit('SET_SU', {
      full_name: 'Fred Rogers',
      username: 'mr_rogers',
      password: 'password',
    });
    store.commit('SET_FACILITY_NAME', "Mr. Roger's Neighborhood");
    store.commit('SET_ALLOW_GUEST_ACCESS', true);
    store.commit('SET_LEARNER_CAN_SIGN_UP', false);
    store.commit('SET_LEARNER_CAN_LOGIN_WITH_NO_PASSWORD', true);
    store.commit('SET_ONBOARDING_STEP', 7);
    els.PersonalDataConsentForm().vm.$emit('submit');
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
