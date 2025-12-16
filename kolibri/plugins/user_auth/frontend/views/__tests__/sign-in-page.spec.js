import { mount } from '@vue/test-utils';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import SignInPage from '../SignInPage';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('kolibri/urls');
jest.mock('kolibri-common/composables/useFacilities');

function makeWrapper() {
  const store = makeStore();
  store.state.facilityId = '123';
  const selectedFacility = {
    id: 123,
    name: 'test facility',
    dataset: {
      learner_can_login_with_no_password: false,
    },
  };
  useFacilities.mockImplementation(() =>
    useFacilitiesMock({
      facilities: {
        value: [
          {
            id: '123',
            name: 'test facility',
            dataset: {},
          },
        ],
      },
      facilityId: '123',
      selectedFacility: selectedFacility,
    }),
  );
  return mount(SignInPage, {
    store,
  });
}

//
describe('signInPage component', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toEqual(true);
  });
  it('will set the username as invalid if it contains punctuation and is blurred', () => {
    const wrapper = makeWrapper();
    wrapper.setData({ username: '?', usernameBlurred: true });
    expect(wrapper.vm.usernameIsInvalid).toEqual(true);
  });
  it('will set the validation text to required if the username is empty and blurred', () => {
    const wrapper = makeWrapper();
    wrapper.setData({ username: '', usernameBlurred: true });
    expect(wrapper.vm.usernameIsInvalidText).toEqual(wrapper.vm.coreString('requiredFieldError'));
  });
  it('will set the validation text to empty if the username is empty and not blurred', () => {
    const wrapper = makeWrapper();
    wrapper.setData({ username: '', usernameBlurred: false });
    expect(wrapper.vm.usernameIsInvalidText).toEqual('');
  });
});
