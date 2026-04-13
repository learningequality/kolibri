import { computed } from 'vue';
import { mount, createLocalVue } from '@vue/test-utils';
import { FacilityUserGender } from 'kolibri/constants';
import ConfirmAccountDetails from '../ConfirmAccountDetails';

const localVue = createLocalVue();
const sendMachineEvent = jest.fn();

function makeWrapper({ targetFacility, targetAccount, username } = {}) {
  return mount(ConfirmAccountDetails, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
      },
      state: computed(() => ({
        targetFacility,
        targetAccount,
        username,
      })),
    },
    localVue,
  });
}

const getContinueButton = wrapper => wrapper.find('[data-testid="continueButton"]');
const clickContinueButton = wrapper => getContinueButton(wrapper).trigger('click');
const getBackButton = wrapper => wrapper.find('[data-testid="backButton"]');
const clickBackButton = wrapper => getBackButton(wrapper).trigger('click');

describe(`ChangeFacility/MergeAccountDialog/ConfirmAccountDetails`, () => {
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
      targetAccount: {
        full_name: 'Test Full Name',
        username: 'remote_username',
        gender: FacilityUserGender.FEMALE,
        id_number: 'test id',
        birth_year: '1989',
      },
      username: 'TestLocalUser',
    });
    expect(wrapper.text()).toContain(
      "Your account will be merged into this account in 'Test Facility'",
    );
    expect(wrapper.find('[data-testid="fullname"]').text()).toEqual('Test Full Name');
    expect(wrapper.find('[data-testid="username"]').text()).toEqual('remote_username');
    expect(wrapper.find('[data-testid="gender"]').text()).toEqual('Female');
    expect(wrapper.find('[data-testid="idnumber"]').text()).toEqual('test id');
    expect(wrapper.find('[data-testid="birthyear"]').text()).toEqual('1989');
  });

  it(`clicking the continue button sends the continue event to the state machine`, () => {
    const wrapper = makeWrapper();
    clickContinueButton(wrapper);
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'CONTINUE',
    });
  });

  it(`clicking the back button sends the back event to the state machine`, () => {
    const wrapper = makeWrapper();
    clickBackButton(wrapper);
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'BACK',
    });
  });
});
