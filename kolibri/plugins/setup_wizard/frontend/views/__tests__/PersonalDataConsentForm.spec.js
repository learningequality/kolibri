import { render, screen, waitFor, fireEvent } from '@testing-library/vue';
import '@testing-library/jest-dom';
import PersonalDataConsentForm from '../onboarding-forms/PersonalDataConsentForm';
import { FooterMessageTypes } from '../../constants';

function renderComponent() {
  render(PersonalDataConsentForm, {
    baseElement: document.body,
    props: {
      footerMessageType: FooterMessageTypes.NEW_FACILITY,
    },
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
  it('does not show the privacy statement modal on initial render', () => {
    renderComponent();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the privacy statement modal when the user clicks "Usage and privacy"', async () => {
    renderComponent();
    fireEvent.click(screen.getByText(/usage and privacy/i));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('closes the privacy statement modal when the user clicks "Close"', async () => {
    renderComponent();
    fireEvent.click(screen.getByText(/usage and privacy/i));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
