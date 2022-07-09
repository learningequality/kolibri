import { shallowMount, mount } from '@vue/test-utils';
import CreateAccount from '../index.vue';

const sendMachineEvent = jest.fn();
function makeWrapper() {
  return mount(CreateAccount, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
      },
      state: {
        value: {
          targetFacility: {
            name: 'Test Facility',
          },
        },
      },
    },
  });
}

const getBackButton = wrapper => wrapper.find('[data-test="backButton"]');
const getContinueButton = wrapper => wrapper.find('[data-test="continueButton"]');

describe(`ChangeFacility/CreateAccount`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`smoke test`, () => {
    const wrapper = shallowMount(CreateAccount);
    expect(wrapper.exists()).toBeTruthy();
  });

  it(`shows the message about creating a new account in the target facility`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toContain('New account for ‘Test Facility’ learning facility');
  });

  it(`shows the back button`, () => {
    const wrapper = makeWrapper();
    expect(getBackButton(wrapper).exists()).toBeTruthy();
  });

  it(`shows the continue button`, () => {
    const wrapper = makeWrapper();
    expect(getContinueButton(wrapper).exists()).toBeTruthy();
  });

  it(`clicking the back button sends the back event to the state machine`, () => {
    const wrapper = makeWrapper();
    expect(getBackButton(wrapper).trigger('click'));
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'BACK',
    });
  });

  it(`clicking the continue button sends the continue event to the state machine`, () => {
    const wrapper = makeWrapper();
    expect(getContinueButton(wrapper).trigger('click'));
    expect(sendMachineEvent).toHaveBeenCalledWith({
      type: 'CONTINUE',
    });
  });
});
