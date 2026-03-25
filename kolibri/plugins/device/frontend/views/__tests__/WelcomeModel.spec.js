import { render, fireEvent, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import WelcomeModal from '../WelcomeModal';

describe('WelcomeModal', () => {
  it('emits submit event when continue button is clicked', async () => {
    const submitListener = jest.fn();

    render(WelcomeModal, {
      listeners: {
        submit: submitListener,
      },
    });

    const submitButton = screen.getByRole('button', { name: /continue/i });
    await fireEvent.click(submitButton);
    expect(submitListener).toHaveBeenCalledTimes(1);
  });
});
