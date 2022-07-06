import { shallowMount, mount } from '@vue/test-utils';
import ChooseAdmin from '../index.vue';

const sendMachineEvent = jest.fn();
function makeWrapper() {
  return mount(ChooseAdmin, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
      },
    },
  });
}

const getBackButton = wrapper => wrapper.find('[data-test="backButton"]');
const getContinueButton = wrapper => wrapper.find('[data-test="continueButton"]');

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
    expect(wrapper.text()).toContain('Choose an account to manage channels and accounts.');
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
