import { render, screen, waitFor, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import PersonalDataConsentForm from '../onboarding-forms/PersonalDataConsentForm';

function renderComponent() {
  render(PersonalDataConsentForm, {
    baseElement: document.body,
    provide: {
      wizardService: {
        state: {
          context: {},
        },
      },
    },
  });
}

describe('PersonalDataConsentForm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not show the privacy statement modal on initial render', () => {
    renderComponent();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the privacy statement modal when the user clicks "Usage and privacy"', async () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('modal-open-button'));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('closes the privacy statement modal when the user clicks "Close"', async () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('modal-open-button'));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    jest.runAllTimers();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
