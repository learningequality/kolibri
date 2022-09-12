import { mount, createLocalVue } from '@vue/test-utils';
import MergeUsernameExists from '../../../src/views/ChangeFacility/MergeUsernameExists';

const localVue = createLocalVue();
const sendMachineEvent = jest.fn();

function makeWrapper({ targetFacility, username } = {}) {
  return mount(MergeUsernameExists, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
      },
      state: {
        value: {
          targetFacility,
        },
      },
    },
    mocks: {
      $store: {
        getters: {
          session: { username: username },
        },
      },
    },
    localVue,
  });
}

const getBackButton = wrapper => wrapper.find('[data-test="backButton"]');
const getContinueButton = wrapper => wrapper.find('[data-test="continueButton"]');
const clickBackButton = wrapper => getBackButton(wrapper).trigger('click');
const clickContinueButton = wrapper => getContinueButton(wrapper).trigger('click');

describe(`ChangeFacility/MergeUsernameExists`, () => {
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
      username: 'test1',
    });
    const line1Paragraph = wrapper.find('[data-test="line1"]');
    expect(line1Paragraph.text()).toEqual(
      'An account with the username ‘test1’ already exists in the ‘Test Facility’ learning facility.'
    );
    const line2Paragraph = wrapper.find('[data-test="line2"]');
    expect(line2Paragraph.text()).toEqual(
      'You can merge all of your account and progress data with this account in ‘Test Facility’ learning facility, or you can create a new account. All of your progress data will be moved to this new account.'
    );
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
