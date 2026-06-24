import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useSnackbar from 'kolibri/composables/useSnackbar';
import useFacility from 'kolibri-common/composables/useFacility';
import { qrLoginStrings } from 'kolibri-common/strings/qrLoginStrings';
import UserIdCardModal from '../UserIdCardModal.vue';

jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  __esModule: true,
  default: { fetchModel: jest.fn() },
}));
jest.mock('kolibri/composables/useSnackbar');
jest.mock('kolibri-common/composables/useFacility');

// Stub StudentIdCard so the test doesn't pull in its full dependency graph;
// it surfaces the learner's name so we can assert the data flowed through.
jest.mock('kolibri-common/components/StudentIdCard', () => ({
  __esModule: true,
  default: {
    name: 'StudentIdCard',
    props: ['learner'],
    render(h) {
      const name = this.learner && this.learner.full_name;
      return h('div', { class: 'student-card-stub' }, name || '');
    },
  },
}));

jest.mock('kolibri-common/components/PrintableIdCards', () => ({
  __esModule: true,
  default: {
    name: 'PrintableIdCards',
    props: ['learners', 'brandImage'],
    render(h) {
      return h('div', { class: 'printable-stub' }, 'printable');
    },
  },
}));

const { printCard$ } = qrLoginStrings;

const USER = {
  id: 'u1',
  full_name: 'Ada Lovelace',
  username: 'ada',
  qr_login_token: 'tok123',
  profile_image: 'data:image/jpeg;base64,abc',
};

function setup() {
  const createSnackbar = jest.fn();
  useSnackbar.mockReturnValue({ createSnackbar });
  useFacility.mockReturnValue({
    facilityConfig: { value: { extra_fields: {} } },
  });
  return { createSnackbar };
}

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('UserIdCardModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('fetches the full user and shows their ID card', async () => {
    FacilityUserResource.fetchModel.mockResolvedValue(USER);
    const { container } = render(UserIdCardModal, { props: { userId: 'u1' } });

    await flushPromises();

    const card = container.querySelector('.student-card-stub');
    expect(card).toBeTruthy();
    expect(card).toHaveTextContent(/Ada Lovelace/);
    expect(FacilityUserResource.fetchModel).toHaveBeenCalledWith({ id: 'u1' });
  });

  it('emits close and shows a snackbar when the user fails to load', async () => {
    FacilityUserResource.fetchModel.mockRejectedValue(new Error('boom'));
    const { emitted } = render(UserIdCardModal, { props: { userId: 'u1' } });

    await flushPromises();

    expect(emitted()).toHaveProperty('close');
    expect(useSnackbar().createSnackbar).toHaveBeenCalled();
  });

  it('shows the print overlay when the Print button is clicked', async () => {
    FacilityUserResource.fetchModel.mockResolvedValue(USER);
    const { container } = render(UserIdCardModal, { props: { userId: 'u1' } });

    await flushPromises();
    await userEvent.click(screen.getByText(printCard$()));

    expect(container.querySelector('.id-card-print-overlay')).toBeTruthy();
    expect(container.querySelector('.printable-stub')).toBeTruthy();
  });
});
