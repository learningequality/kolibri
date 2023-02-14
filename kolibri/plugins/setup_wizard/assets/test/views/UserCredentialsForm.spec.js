import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import UserCredentialsForm from '../../src/views/onboarding-forms/UserCredentialsForm';

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(UserCredentialsForm, {
    store,
    // These need to be stubbed because of some mysterious errors
    stubs: ['FullNameTextbox', 'UsernameTextbox'],
  });
  jest.spyOn(wrapper.vm, '$emit');
  const actions = {
    simulateSubmit: () => wrapper.findComponent({ name: 'OnboardingForm' }).vm.$emit('submit'),
  };
  return { store, wrapper, actions };
}

describe.skip('UserCredentialsForm', () => {
  it('clicking submit updates vuex with correct data', async () => {
    const { store, wrapper, actions } = makeWrapper();
    wrapper.setData({
      fullName: 'Schoolhouse Rock',
      fullNameValid: true,
      username: 'schoolhouse_rock',
      usernameValid: true,
      password: 'password',
      passwordValid: true,
    });
    actions.simulateSubmit();
    await wrapper.vm.$nextTick();
    expect(store.state.onboardingData.user).toEqual({
      full_name: 'Schoolhouse Rock',
      username: 'schoolhouse_rock',
      password: 'password',
    });
    expect(wrapper.vm.$emit).toHaveBeenCalledWith('click_next', {
      full_name: 'Schoolhouse Rock',
      username: 'schoolhouse_rock',
      password: 'password',
    });
  });
});
