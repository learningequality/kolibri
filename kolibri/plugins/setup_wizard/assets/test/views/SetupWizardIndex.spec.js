import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import SetupWizardIndex from '../../src/views/SetupWizardIndex';

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(SetupWizardIndex, {
    store,
  })
  jest.spyOn(wrapper.vm, 'provisionDevice').mockResolvedValue();
  const els = {
    DefaultLanguageForm: () => wrapper.find({ name: 'DefaultLanguageForm' }),
    FacilityPermissionsForm: () => wrapper.find({ name: 'FacilityPermissionsForm' }),
    GuestAccessForm: () => wrapper.find({ name: 'GuestAccessForm' }),
    SuperuserCredentialsForm: () => wrapper.find({ name: 'SuperuserCredentialsForm' }),
  };
  return { wrapper, store, els };
}

describe('SetupWizardIndex', () => {
  it('clicking next takes you to the next step', async () => {
    const { els, wrapper } = makeWrapper();
    // Step 1: DefaultLanguageForm
    expect(els.DefaultLanguageForm().isVueComponent).toBe(true);
    // Simulate clicking submit because clicking the button doesn't work
    els.DefaultLanguageForm().vm.$emit('submit');
    expect(els.DefaultLanguageForm().exists()).toBe(false);

    // Step 2: Facility Permissions Form
    expect(els.FacilityPermissionsForm().isVueComponent).toBe(true);
    els.FacilityPermissionsForm().vm.$emit('submit');
    await wrapper.vm.$nextTick();
    expect(els.FacilityPermissionsForm().exists()).toBe(false);

    // Step 3: Guest Access Form
    expect(els.GuestAccessForm().isVueComponent).toBe(true);
    els.GuestAccessForm().vm.$emit('submit');
    expect(els.GuestAccessForm().exists()).toBe(false);

    // Step 4: Superuser Credentials Form
    expect(els.SuperuserCredentialsForm().isVueComponent).toBe(true);
    els.SuperuserCredentialsForm().vm.$emit('submit');
    expect(wrapper.vm.provisionDevice).toHaveBeenCalledTimes(1);
  });
});
