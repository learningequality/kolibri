import { mount } from '@vue/test-utils';
import PersonalDataConsentForm from '../../src/views/onboarding-forms/PersonalDataConsentForm';

function makeWrapper() {
  const wrapper = mount(PersonalDataConsentForm);
  return { wrapper };
}

describe('PersonalDataConsentForm', () => {
  it('the PrivacyInfoModal is hidden by default', () => {
    const { wrapper } = makeWrapper();
    expect(wrapper.findComponent({ name: 'PrivacyInfoModal' }).exists()).toBeFalsy();
  });
  it('the "View statement" opens the statement', async () => {
    const { wrapper } = makeWrapper();
    const button = wrapper.findComponent({ name: 'KButton' });
    button.vm.$emit('click');
    await wrapper.find("[data-test='modal-open-button']").vm.$emit('click');
    expect(wrapper.findComponent({ name: 'PrivacyInfoModal' }).exists());

    await wrapper.findComponent({ name: 'PrivacyInfoModal' }).vm.$emit('cancel');
    expect(wrapper.findComponent({ name: 'PrivacyInfoModal' }).exists()).toBeFalsy();
  });
});
