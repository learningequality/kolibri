import { render, fireEvent, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import WelcomeModal from '../WelcomeModal';

const { continueAction$ } = coreStrings;

describe('WelcomeModal', () => {
  it('emits submit event when continue button is clicked', async () => {
    const submitListener = jest.fn();

    render(WelcomeModal, {
      listeners: {
        submit: submitListener,
      },
    });

    const submitButton = screen.getByRole('button', { name: continueAction$() });
    await fireEvent.click(submitButton);
    expect(submitListener).toHaveBeenCalledTimes(1);
  });
});
