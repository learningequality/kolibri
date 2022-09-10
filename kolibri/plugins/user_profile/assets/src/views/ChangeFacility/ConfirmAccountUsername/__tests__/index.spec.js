import { shallowMount, mount } from '@vue/test-utils';
import ConfirmAccountUsername from '../index.vue';

const sendMachineEvent = jest.fn();
function makeWrapper({ targetFacility } = {}) {
  return mount(ConfirmAccountUsername, {
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
  });
}

const getCreateNewAccountButton = wrapper => wrapper.find('[data-test="createNewAccountButton"]');
const clickCreateNewAccountButton = wrapper => getCreateNewAccountButton(wrapper).trigger('click');

describe(`ChangeFacility/ConfirmAccountUsername`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`smoke test`, () => {
    const wrapper = shallowMount(ConfirmAccountUsername);
    expect(wrapper.exists()).toBeTruthy();
  });

  it(`shows the 'Create new account' button`, () => {
    const wrapper = makeWrapper();
    expect(getCreateNewAccountButton(wrapper).exists()).toBeTruthy();
  });

  describe(`when learners are not allowed to sign up in the target facility`, () => {
    it(`'Create new account' button is disabled`, () => {
      const wrapper = makeWrapper({ targetFacility: { learner_can_sign_up: false } });
      expect(getCreateNewAccountButton(wrapper).attributes().disabled).toBeTruthy();
    });
  });

  describe(`when learners are allowed to sign up in the target facility`, () => {
    let wrapper;

    beforeEach(() => {
      wrapper = makeWrapper({ targetFacility: { learner_can_sign_up: true } });
    });

    it(`'Create new account' button is enabled`, () => {
      expect(getCreateNewAccountButton(wrapper).attributes().disabled).toBeFalsy();
    });

    it(`Clicking the 'Create new account' button sends the 'NEW' event to the state machine`, () => {
      clickCreateNewAccountButton(wrapper);
      expect(sendMachineEvent).toHaveBeenCalledWith({
        type: 'NEW',
      });
    });
  });
});
