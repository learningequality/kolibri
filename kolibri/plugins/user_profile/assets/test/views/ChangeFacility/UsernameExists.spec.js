import { mount, createLocalVue } from '@vue/test-utils';
import UsernameExists from '../../../src/views/ChangeFacility/UsernameExists';

const localVue = createLocalVue();
const sendMachineEvent = jest.fn();

function makeWrapper({ targetFacility, username } = {}) {
  return mount(UsernameExists, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
      },
      state: {
        value: {
          targetFacility,
          username,
        },
      },
    },
    localVue,
  });
}

const getMergeButton = wrapper => wrapper.find('[data-test="mergeButton"]');
const getCreateButton = wrapper => wrapper.find('[data-test="createButton"]');
const clickMergeButton = wrapper => getMergeButton(wrapper).trigger('click');
const clickCreateButton = wrapper => getCreateButton(wrapper).trigger('click');

describe(`ChangeFacility/UsernameExists`, () => {
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
      "An account with the username 'test1' already exists in the 'Test Facility' learning facility. You can merge your account and its progress data with this account.",
    );
    const line2Paragraph = wrapper.find('[data-test="line2"]');
    expect(line2Paragraph.text()).toEqual(
      'Alternatively, you can create a new account and all your progress data will be moved to this new account.',
    );
  });
  it(`shows the buttons`, () => {
    const wrapper = makeWrapper();
    expect(getMergeButton(wrapper).exists()).toBeTruthy();
    expect(getCreateButton(wrapper).exists()).toBeTruthy();
  });

  it(`clicking the merge button sends the merge event to the state machine`, () => {
    const wrapper = makeWrapper();
    clickMergeButton(wrapper);
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'MERGE',
    });
  });
  it(`clicking the create button sends the new event to the state machine`, () => {
    const wrapper = makeWrapper();
    clickCreateButton(wrapper);
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'NEW',
    });
  });
});
