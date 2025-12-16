import { computed } from 'vue';
import { mount, createLocalVue } from '@vue/test-utils';
import MergeAccountDialog from '../index.vue';

import * as useRemoteFacility from '../../../../composables/useRemoteFacility';
import remoteFacilityUserData from '../../../../composables/useRemoteFacility';

const localVue = createLocalVue();
const sendMachineEvent = jest.fn();

function makeWrapper({ targetFacility, targetAccount, fullname, username } = {}) {
  return mount(MergeAccountDialog, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
        state: { value: 'requireAccountCreds' },
      },
      state: computed(() => ({
        targetFacility,
        targetAccount,
        fullname,
        username,
      })),
    },
    localVue,
  });
}

const getUsernameTextbox = wrapper => wrapper.find('[data-test="usernameTextbox"]');
const setUsernameTextboxValue = (wrapper, value) => {
  getUsernameTextbox(wrapper).find('input').setValue(value);
};
const getPasswordTextbox = wrapper => wrapper.find('[data-test="passwordTextbox"]');
const setPasswordTextboxValue = (wrapper, value) => {
  getPasswordTextbox(wrapper).find('input').setValue(value);
};

describe(`ChangeFacility/MergeAccountDialog`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`smoke test`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBeTruthy();
  });

  it(`Show correct info`, () => {
    const wrapper = makeWrapper({
      targetFacility: { name: 'Test Facility' },
      fullname: 'Test User 1',
      username: 'test1',
      targetAccount: { username: 'test2' },
    });
    const fullname_paragraph = wrapper.find('[data-test="fullName"]');
    expect(fullname_paragraph.text()).toEqual('Test User 1');
    const username_paragraph = wrapper.find('[data-test="username"]');
    expect(username_paragraph.text()).toEqual('test1');
    expect(wrapper.find('[data-test="usernameTextbox"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="passwordTextbox"]').exists()).toBe(true);
    expect(wrapper.text()).toContain(
      "Enter the password of the account 'test2' in 'Test Facility' learning facility that you want to merge your account with",
    );
  });

  it('Change to useAdminPassword state when clicking link', () => {
    const wrapper = makeWrapper();
    const useAdminButton = wrapper.find('[data-test="useAdminAccount"]');
    useAdminButton.trigger('click');
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'USEADMIN',
    });
  });

  it('Check useAdminPassword makes username textbox appear', async () => {
    const wrapper = makeWrapper();
    wrapper.setData({ usingAdminPasswordState: true });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="usernameTextbox"]').exists()).toBe(true);
  });

  it('Check remoteFacilityUserData is called with the user credentials', async () => {
    const wrapper = makeWrapper({
      targetFacility: { id: 'id_facility', url: 'http://localhost/test' },
      fullname: 'Test User 1',
      username: 'test1',
      targetAccount: { username: 'test1' },
    });
    jest.spyOn(useRemoteFacility, 'default').mockReturnValue(Promise.resolve({}));
    setPasswordTextboxValue(wrapper, 'my password');

    const continueButton = wrapper.find('[data-test="continueButton"]');
    continueButton.trigger('click');
    await wrapper.vm.$nextTick();

    expect(remoteFacilityUserData).toHaveBeenCalledWith(
      'http://localhost/test',
      'id_facility',
      'test1',
      'my password',
      null,
    );
  });

  it('Check remoteFacilityUserData is called with the admin credentials', async () => {
    const wrapper = makeWrapper({
      targetFacility: { id: 'id_facility', url: 'http://localhost/test' },
      fullname: 'Test User 1',
      username: 'test1',
      targetAccount: { username: 'test1' },
    });
    jest.spyOn(useRemoteFacility, 'default').mockReturnValue(Promise.resolve({}));
    wrapper.setData({ usingAdminPasswordState: true });
    await wrapper.vm.$nextTick();

    setUsernameTextboxValue(wrapper, 'testadmin');
    setPasswordTextboxValue(wrapper, 'admin password');

    const continueButton = wrapper.find('[data-test="continueButton"]');
    continueButton.trigger('click');
    await wrapper.vm.$nextTick();
    expect(remoteFacilityUserData).toHaveBeenCalledWith(
      'http://localhost/test',
      'id_facility',
      'test1',
      'admin password',
      'testadmin',
    );
  });
});
