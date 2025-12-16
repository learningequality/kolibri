import { computed } from 'vue';
import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import CreateAccount from '../index.vue';

const localVue = createLocalVue();
localVue.use(Vuex);

jest.mock('kolibri/composables/useUser');

const sendMachineEvent = jest.fn();
function makeWrapper({ targetFacility } = {}) {
  return mount(CreateAccount, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
      },
      state: computed(() => ({
        targetFacility,
      })),
    },
    localVue,
  });
}

const getBackButton = wrapper => wrapper.find('[data-test="backButton"]');
const getContinueButton = wrapper => wrapper.find('[data-test="continueButton"]');
const getUsernameTextbox = wrapper => wrapper.find('[data-test="usernameTextbox"]');
const getPasswordTextbox = wrapper => wrapper.find('[data-test="passwordTextbox"]');
const clickBackButton = wrapper => getBackButton(wrapper).trigger('click');
const clickContinueButton = wrapper => getContinueButton(wrapper).trigger('click');
const setUsernameTextboxValue = (wrapper, value) => {
  getUsernameTextbox(wrapper).find('input').setValue(value);
};
const setPasswordTextboxValue = (wrapper, value) => {
  getPasswordTextbox(wrapper).findComponent({ ref: 'password' }).find('input').setValue(value);
  getPasswordTextbox(wrapper).findComponent({ ref: 'confirm' }).find('input').setValue(value);
};

describe(`ChangeFacility/CreateAccount`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock());
  });

  it(`smoke test`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBeTruthy();
  });

  it(`shows the message about creating a new account in the target facility
    that contains user's full name and the target facility name`, () => {
    useUser.mockImplementation(() => useUserMock({ session: { full_name: 'Test User' } }));
    const wrapper = makeWrapper({
      targetFacility: { name: 'Test Facility' },
    });
    expect(wrapper.text()).toContain(
      "New account for 'Test User' in 'Test Facility' learning facility",
    );
  });

  it(`shows the back button`, () => {
    const wrapper = makeWrapper();
    expect(getBackButton(wrapper).exists()).toBeTruthy();
  });

  it(`shows the continue button`, () => {
    const wrapper = makeWrapper();
    expect(getContinueButton(wrapper).exists()).toBeTruthy();
  });

  it(`shows the username textbox`, () => {
    const wrapper = makeWrapper();
    expect(getUsernameTextbox(wrapper).exists()).toBeTruthy();
  });

  it(`shows the privacy modal link`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.findAll('a').filter(link => link.text() === 'Usage and privacy').length).toBe(1);
  });

  describe(`when the target facility doesn't require password on learner accounts`, () => {
    it(`doesn't show the password textbox`, () => {
      const wrapper = makeWrapper({ targetFacility: { learner_can_login_with_no_password: true } });
      expect(getPasswordTextbox(wrapper).exists()).toBeFalsy();
    });
  });

  describe(`when the target facility requires password on learner accounts`, () => {
    it(`shows the password textbox`, () => {
      const wrapper = makeWrapper({
        targetFacility: { learner_can_login_with_no_password: false },
      });
      expect(getPasswordTextbox(wrapper).exists()).toBeTruthy();
    });
  });

  it(`shows the message for users to remember their account information`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toContain(
      'Important: please remember this account information. Write it down if needed.',
    );
  });

  it(`clicking the back button sends the back event to the state machine`, () => {
    const wrapper = makeWrapper();
    clickBackButton(wrapper);
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'BACK',
    });
  });

  describe(`when the new user account form is valid`, () => {
    it(`clicking the continue button sends the continue event with the form data as its value to the state machine`, async () => {
      const wrapper = makeWrapper();
      setUsernameTextboxValue(wrapper, 'testusername');
      setPasswordTextboxValue(wrapper, 'testpassword');
      // wait for validation
      await wrapper.vm.$nextTick();
      clickContinueButton(wrapper);
      expect(sendMachineEvent).toHaveBeenCalledWith({
        type: 'CONTINUE',
        value: {
          username: 'testusername',
          password: 'testpassword',
        },
      });
    });
  });

  describe(`when the new user account form is invalid`, () => {
    it(`clicking the continue button doesn't send the continue event to the state machine`, () => {
      const wrapper = makeWrapper();
      // the form is empty and therefore invalid
      clickContinueButton(wrapper);
      expect(sendMachineEvent).not.toHaveBeenCalled();
    });
  });
});
