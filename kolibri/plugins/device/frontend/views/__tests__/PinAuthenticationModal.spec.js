import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { Store } from 'vuex';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import PinAuthenticationModal from '../PinAuthenticationModal.vue';

// Mock the client and urls modules
jest.mock('kolibri/client');
jest.mock('kolibri/urls');

let store;

const renderComponent = (options = {}) => {
  return render(PinAuthenticationModal, {
    props: {
      facilityDatasetId: 'test-facility-id',
    },
    store,
    ...options,
  });
};

describe('PinAuthenticationModal', () => {
  beforeEach(() => {
    client.mockResolvedValue({ data: { is_pin_valid: true } });
    urls['kolibri:core:ispinvalid'] = jest.fn().mockReturnValue('/api/mock/ispinvalid/');

    store = new Store({
      modules: {
        facilityConfig: {
          namespaced: true,
          state: {
            facilityDatasetId: 'test-dataset-id',
          },
        },
      },
      actions: {
        createSnackbar: jest.fn(),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('emits cancel when the user clicks Cancel', async () => {
    const { emitted } = renderComponent();

    await fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(emitted()).toHaveProperty('cancel');
    expect(emitted().cancel).toHaveLength(1);
  });

  describe('submitting a PIN', () => {
    it('does not show validation messages before the user submits the form', () => {
      renderComponent();

      expect(screen.queryByText('Incorrect PIN, please try again')).not.toBeInTheDocument();
      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Enter numbers only')).not.toBeInTheDocument();
    });

    it('emits submit when the user enters a valid PIN and submits', async () => {
      const { emitted } = renderComponent();

      await userEvent.type(screen.getByLabelText('PIN'), '1234');
      await fireEvent.click(screen.getByRole('button', { name: /continue/i }));

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

      await userEvent.type(screen.getByLabelText('PIN'), '1234');
      await fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText('Incorrect PIN, please try again')).toBeInTheDocument();
      });
    });

    it('shows a numbers-only validation message when the PIN contains letters', async () => {
      renderComponent();

      await userEvent.type(screen.getByLabelText('PIN'), 'abcd');
      await fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('Enter numbers only')).toBeInTheDocument();
    });

    it('shows a required-field validation message when the PIN is empty', async () => {
      renderComponent();

      await fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });
});
