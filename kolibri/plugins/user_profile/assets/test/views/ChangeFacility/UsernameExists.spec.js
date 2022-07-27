import { mount, createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import makeStore from '../../makeStore';
import UsernameExists from '../../../src/views/ChangeFacility/UsernameExists';

const localVue = createLocalVue();
localVue.use(VueRouter);
const sendMachineEvent = jest.fn();

function makeWrapper({ targetFacility, username } = {}) {
  const store = makeStore();

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
    store,
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
      username: 'Test User',
    });
    expect(wrapper.text()).toContain(
      'Change Facility An account with the username ‘Test User’ already exists in the ‘Test Facility’ learning facility.'
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
