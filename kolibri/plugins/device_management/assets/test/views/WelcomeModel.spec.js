import { mount } from '@vue/test-utils';
import WelcomeModal from '../../src/views/WelcomeModal';

function makeWrapper(options) {
  const wrapper = mount(WelcomeModal, {
    ...options,
  });
  return { wrapper };
}

describe('WelcomeModal', () => {
  it('clicking submit emits a "submit" event', () => {
    const submitListener = jest.fn();
    const { wrapper } = makeWrapper({
      listeners: {
        submit: submitListener,
      },
    });
    wrapper.find('form').trigger('submit');
    expect(submitListener).toHaveBeenCalledTimes(1);
  });
});
