import { mount } from '@vue/test-utils';
import store from 'kolibri.coreVue.vuex.store';
import PersonalDataConsentForm from '../../src/views/onboarding-forms/PersonalDataConsentForm';

function makeWrapper() {
  const wrapper = mount(PersonalDataConsentForm, { store });
  return { wrapper };
}

describe('PersonalDataConsentForm', () => {
  it('the "View statement" opens the statement', () => {
    const { wrapper } = makeWrapper();
    const modal = () => wrapper.find({ name: 'PrivacyInfoModal' });
    const button = wrapper.find({ name: 'KButton' });
    expect(modal().exists()).toEqual(false);
    button.vm.$emit('click');
    expect(modal().exists()).toEqual(true);
    // And cancelling closes it
    modal().vm.$emit('cancel');
    expect(modal().exists()).toEqual(false);
  });

  it('clicking submit on form bubbles up the "submit" event', () => {
    const { wrapper } = makeWrapper();
    jest.spyOn(wrapper.vm, '$emit');
    wrapper.find({ name: 'OnboardingForm' }).vm.$emit('submit');
    expect(wrapper.vm.$emit).toHaveBeenCalledTimes(1);
  });
});
