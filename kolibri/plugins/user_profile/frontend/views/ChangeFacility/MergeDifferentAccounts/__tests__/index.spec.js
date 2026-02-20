import { computed } from 'vue';
import { mount, createLocalVue } from '@vue/test-utils';
import MergeDifferentAccounts from '../index.vue';
import * as useRemoteFacility from '../../../../composables/useRemoteFacility';
import { remoteFacilityUsers } from '../../../../composables/useRemoteFacility';

const localVue = createLocalVue();
const sendMachineEvent = jest.fn();
jest.mock('../../../../composables/useRemoteFacility');
useRemoteFacility.remoteFacilityUsers.mockResolvedValue({
  users: [{ username: 'other_user', id: null }],
});

function makeWrapper({ targetFacility, targetAccount, fullname, username } = {}) {
  return mount(MergeDifferentAccounts, {
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
const getBackButton = wrapper => wrapper.find('[data-test="backButton"]');
const getContinueButton = wrapper => wrapper.find('[data-test="continueButton"]');
const clickBackButton = wrapper => getBackButton(wrapper).trigger('click');
const clickContinueButton = wrapper => getContinueButton(wrapper).trigger('click');

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
  });

  it(`clicking continue button trigger the function to check if the user exists in the target facility`, () => {
    const wrapper = makeWrapper({
      targetFacility: { url: 'http://localhost/test', id: 'id_facility' },
    });
    setUsernameTextboxValue(wrapper, 'other_user');
    clickContinueButton(wrapper);
    expect(remoteFacilityUsers).toHaveBeenCalledWith(
      'http://localhost/test',
      'id_facility',
      'other_user',
    );
  });

  it(`clicking the back button sends the back event to the state machine`, () => {
    const wrapper = makeWrapper();
    clickBackButton(wrapper);
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'BACK',
    });
  });
});
