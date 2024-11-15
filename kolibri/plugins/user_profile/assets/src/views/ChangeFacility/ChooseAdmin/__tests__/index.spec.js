import { coreStoreFactory } from 'kolibri/store';
import { shallowMount, mount } from '@vue/test-utils';
import ChooseAdmin from '../index.vue';
import coreModule from '../../../../../../../../core/assets/src/state/modules/core';

const sendMachineEvent = jest.fn();
function makeWrapper({ userId, sourceFacilityUsers } = {}) {
  const store = coreStoreFactory();
  store.registerModule('core', coreModule);
  store.dispatch('notLoading');
  return mount(ChooseAdmin, {
    store,
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
      },
      state: {
        value: {
          userId,
          sourceFacilityUsers,
        },
      },
    },
  });
}

const TEST_CURRENT_USER_ID = 'current-id';
const TEST_FACILITY_USERS = [
  {
    id: TEST_CURRENT_USER_ID,
    full_name: 'Current User',
    username: 'currentuser',
  },
  {
    id: 'learner-1',
    full_name: 'Learner 1',
    username: 'learner1',
  },
  {
    id: 'learner-2',
    full_name: 'Learner 2',
    username: 'learner2',
  },
];

const getBackButton = wrapper => wrapper.find('[data-test="backButton"]');
const getContinueButton = wrapper => wrapper.find('[data-test="continueButton"]');
const getUserTable = wrapper => wrapper.find('[data-test="userTable"]');

describe(`ChangeFacility/ChooseAdmin`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`smoke test`, () => {
    const wrapper = shallowMount(ChooseAdmin);
    expect(wrapper.exists()).toBeTruthy();
  });

  it('shows the title and the description', () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toContain('Choose a new super admin');
    expect(wrapper.text()).toContain('Choose someone to manage channels and user accounts.');
  });

  it('shows a selectable table with all facility users except of a current user', () => {
    const wrapper = makeWrapper({
      userId: TEST_CURRENT_USER_ID,
      sourceFacilityUsers: TEST_FACILITY_USERS,
    });
    const userTable = getUserTable(wrapper);
    expect(userTable).toBeTruthy();
    expect(userTable.text()).not.toContain('Current User');
    const users = userTable.findAllComponents({ name: 'KRadioButton' });
    expect(users.length).toBe(2);
    expect(users.at(0).text()).toContain('Learner 1');
    expect(users.at(1).text()).toContain('Learner 2');
  });

  it(`shows the back button`, () => {
    const wrapper = makeWrapper();
    expect(getBackButton(wrapper).exists()).toBeTruthy();
  });

  it(`clicking the back button sends the back event to the state machine`, () => {
    const wrapper = makeWrapper();
    expect(getBackButton(wrapper).trigger('click'));
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'BACK',
    });
  });

  it(`shows the continue button`, () => {
    const wrapper = makeWrapper();
    expect(getContinueButton(wrapper).exists()).toBeTruthy();
  });

  describe(`when a new super admin is not selected`, () => {
    it(`continue button is disabled`, () => {
      const wrapper = makeWrapper();
      expect(getContinueButton(wrapper).element.disabled).toBeTruthy();
    });
  });

  describe(`when a new super admin is selected`, () => {
    let wrapper;
    beforeEach(() => {
      wrapper = makeWrapper({
        userId: TEST_CURRENT_USER_ID,
        sourceFacilityUsers: TEST_FACILITY_USERS,
      });
      getUserTable(wrapper)
        .findAllComponents({ name: 'KRadioButton' })
        .at(1)
        .find('input')
        .trigger('change');
    });

    it(`continue button is enabled`, () => {
      expect(getContinueButton(wrapper).element.disabled).toBeFalsy();
    });

    it(`clicking the continue button sends the select new super admin and continue events to the state machine`, () => {
      expect(getContinueButton(wrapper).trigger('click'));
      expect(sendMachineEvent).toHaveBeenCalledWith({
        type: 'SELECTNEWSUPERADMIN',
        value: 'learner-2',
      });
      expect(sendMachineEvent).toHaveBeenCalledWith({
        type: 'CONTINUE',
      });
    });
  });
});
