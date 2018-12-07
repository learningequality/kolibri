import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import SuperuserCredentialsForm from '../../src/views/onboarding-forms/SuperuserCredentialsForm';

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(SuperuserCredentialsForm, {
    store,
  });
  jest.spyOn(wrapper.vm, '$emit');
  const actions = {
    simulateSubmit: () => wrapper.find({ name: 'OnboardingForm' }).vm.$emit('submit'),
  };
  return { store, wrapper, actions };
}

describe('SuperuserCredentialsForm', () => {
  it('clicking submit updates vuex with correct data', () => {
    const { store, wrapper, actions } = makeWrapper();
    wrapper.setData({
      name: 'Schoolhouse Rock',
      username: 'schoolhouse_rock',
      password: 'password',
      passwordConfirm: 'password',
      visitedFields: {
        name: true,
        username: true,
        password: true,
        passwordConfirm: true,
      },
    });
    actions.simulateSubmit();
    expect(store.state.onboardingData.superuser).toEqual({
      full_name: 'Schoolhouse Rock',
      username: 'schoolhouse_rock',
      password: 'password',
    });
    expect(wrapper.vm.$emit).toHaveBeenCalledWith('submit');
  });
});
