import { mount } from '@vue/test-utils';
import SignInPage from '../../src/views/SignInPage';
import makeStore from '../makeStore';

jest.mock('kolibri/urls');

function makeWrapper() {
  const store = makeStore();
  store.state.facilityId = '123';
  store.state.core.facilities.push({
    id: '123',
    name: 'test facility',
    dataset: {},
  });
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
