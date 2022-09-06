import { mount, createLocalVue } from '@vue/test-utils';
import ConfirmMerge from '../../../src/views/ChangeFacility/ConfirmMerge';

const localVue = createLocalVue();
const sendMachineEvent = jest.fn();

function makeWrapper() {
  return mount(ConfirmMerge, {
    provide: {
      changeFacilityService: {
        send: sendMachineEvent,
      },
    },
    localVue,
  });
}

const getBackButton = wrapper => wrapper.find('[data-test="backButton"]');
const getContinueButton = wrapper => wrapper.find('[data-test="continueButton"]');
const clickBackButton = wrapper => getBackButton(wrapper).trigger('click');
const clickContinueButton = wrapper => getContinueButton(wrapper).trigger('click');

describe(`ChangeFacility/ConfirmMerge`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`smoke test`, () => {
    const wrapper = makeWrapper();
    expect(wrapper.exists()).toBeTruthy();
  });

  it('continue is disabled until merging is accepted', async () => {
    const wrapper = makeWrapper();
    const checkbox = wrapper.find('input[class="k-checkbox-input"]');
    const continueButton = wrapper.find('[data-test="continueButton"]');
    expect(continueButton.vm.disabled).toBeTruthy();
    checkbox.trigger('click');
    await wrapper.vm.$nextTick();
    expect(continueButton.vm.disabled).toBeFalsy();
  });

  it(`clicking continue button sends the continue event to the state machine`, async () => {
    const wrapper = makeWrapper();
    clickContinueButton(wrapper);
    expect(sendMachineEvent).not.toHaveBeenCalled();

    const checkbox = wrapper.find('input[class="k-checkbox-input"]');
    checkbox.trigger('click');
    await wrapper.vm.$nextTick();
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
