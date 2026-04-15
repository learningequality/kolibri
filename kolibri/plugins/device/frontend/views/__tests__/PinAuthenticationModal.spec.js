import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import PinAuthenticationModal, { strings as pinModalStrings } from '../PinAuthenticationModal.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const renderComponent = (options = {}) => {
  return render(PinAuthenticationModal, {
    props: {
      facilityDatasetId: 'test-facility-id',
    },
    ...options,
  });
};

describe('PinAuthenticationModal', () => {
  beforeEach(() => {
    client.mockResolvedValue({ data: { is_pin_valid: true } });
    urls['kolibri:core:ispinvalid'] = jest.fn().mockReturnValue('/api/mock/ispinvalid/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('emits cancel when the user clicks Cancel', async () => {
    const { emitted } = renderComponent();

    await fireEvent.click(screen.getByRole('button', { name: coreString('cancelAction') }));

    expect(emitted()).toHaveProperty('cancel');
    expect(emitted().cancel).toHaveLength(1);
  });

  describe('submitting a PIN', () => {
    it('does not show validation messages before the user submits the form', () => {
      renderComponent();

      expect(screen.queryByText(pinModalStrings.incorrectPin$())).not.toBeInTheDocument();
      expect(screen.queryByText(coreString('requiredFieldError'))).not.toBeInTheDocument();
      expect(screen.queryByText(coreString('numbersOnly'))).not.toBeInTheDocument();
    });

    it('emits submit when the user enters a valid PIN and submits', async () => {
      const { emitted } = renderComponent();

      await userEvent.type(screen.getByLabelText(pinModalStrings.pinPlaceholder$()), '1234');
      await fireEvent.click(screen.getByRole('button', { name: coreString('continueAction') }));

      await waitFor(() => {
        expect(emitted()).toHaveProperty('submit');
      });

      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: { pin_code: '1234' },
        }),
      );
    });

    it('shows an incorrect PIN message when the submitted PIN is invalid', async () => {
      client.mockResolvedValue({ data: { is_pin_valid: false } });

      renderComponent();

      await userEvent.type(screen.getByLabelText(pinModalStrings.pinPlaceholder$()), '1234');
      await fireEvent.click(screen.getByRole('button', { name: coreString('continueAction') }));

      await waitFor(() => {
        expect(screen.getByText(pinModalStrings.incorrectPin$())).toBeInTheDocument();
      });
    });

    it('shows a numbers-only validation message when the PIN contains letters', async () => {
      renderComponent();

      await userEvent.type(screen.getByLabelText(pinModalStrings.pinPlaceholder$()), 'abcd');
      await fireEvent.click(screen.getByRole('button', { name: coreString('continueAction') }));

      expect(screen.getByText(coreString('numbersOnly'))).toBeInTheDocument();
    });

    it('shows a required-field validation message when the PIN is empty', async () => {
      renderComponent();

      await fireEvent.click(screen.getByRole('button', { name: coreString('continueAction') }));

      expect(screen.getByText(coreString('requiredFieldError'))).toBeInTheDocument();
    });
  });
});
