import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import StudentIdCard from '../StudentIdCard.vue';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKE_QR'),
}));

jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  __esModule: true,
  default: {
    saveModel: jest.fn(),
    rotateQrToken: jest.fn(),
    assignQrToken: jest.fn(),
  },
}));

// Stub the confirmation modal so the regenerate flow can be driven in tests
// without pulling in KModal. The stub emits `confirm` when its button is
// clicked, mirroring the real modal's submit behaviour.
jest.mock('kolibri-common/components/RegenerateQRModal', () => ({
  __esModule: true,
  default: {
    name: 'RegenerateQRModal',
    props: ['learnerName'],
    render(h) {
      return h(
        'button',
        { class: 'regen-confirm', on: { click: () => this.$emit('confirm') } },
        'ConfirmRegen',
      );
    },
  },
}));

const LEARNER_WITH_PHOTO = {
  id: 'user-1',
  full_name: 'Maria Lopez',
  username: 'maria',
  qr_login_token: 'test_token_abc123',
  profile_image: 'data:image/jpeg;base64,abc123',
};

const LEARNER_NO_PHOTO = {
  id: 'user-2',
  full_name: 'Joao Silva',
  username: 'joao',
  qr_login_token: 'test_token_xyz789',
  profile_image: null,
};

const LEARNER_NO_QR = {
  id: 'user-3',
  full_name: 'No Token User',
  username: 'notoken',
  qr_login_token: null,
  profile_image: null,
};

describe('StudentIdCard', () => {
  it('renders the learner name and username', () => {
    render(StudentIdCard, {
      props: { learner: LEARNER_WITH_PHOTO },
    });
    expect(screen.getByText('Maria Lopez')).toBeInTheDocument();
    expect(screen.getByText('maria')).toBeInTheDocument();
  });

  it('renders the uploaded photo when profile_image is set', () => {
    const { container } = render(StudentIdCard, {
      props: { learner: LEARNER_WITH_PHOTO },
    });
    const photo = container.querySelector('.learner-photo');
    expect(photo).toBeTruthy();
    expect(photo).toHaveAttribute('src', 'data:image/jpeg;base64,abc123');
  });

  it('renders a photo placeholder when no profile_image', () => {
    const { container } = render(StudentIdCard, {
      props: { learner: LEARNER_NO_PHOTO },
    });
    expect(container.querySelector('.learner-photo')).toBeNull();
    expect(container.querySelector('.photo-placeholder')).toBeTruthy();
  });

  it('shows "No QR code assigned" when learner has no token', () => {
    render(StudentIdCard, {
      props: { learner: LEARNER_NO_QR },
    });
    expect(screen.getByText('No QR code assigned')).toBeInTheDocument();
  });

  it('shows an upload button when no photo is set', () => {
    render(StudentIdCard, {
      props: { learner: LEARNER_NO_PHOTO },
    });
    expect(screen.getByText('Upload photo')).toBeInTheDocument();
  });

  it('shows a replace button when a photo is already set', () => {
    render(StudentIdCard, {
      props: { learner: LEARNER_WITH_PHOTO },
    });
    expect(screen.getByText('Replace photo')).toBeInTheDocument();
  });

  it('shows a regenerate button when learner has a QR token', () => {
    render(StudentIdCard, {
      props: { learner: LEARNER_WITH_PHOTO },
    });
    expect(screen.getByText('Regenerate QR code')).toBeInTheDocument();
  });

  it('does not show regenerate button when learner has no QR token', () => {
    render(StudentIdCard, {
      props: { learner: LEARNER_NO_QR },
    });
    expect(screen.queryByText('Regenerate QR code')).not.toBeInTheDocument();
  });

  it('regenerates a fresh token that differs from the original', async () => {
    const newToken = 'rotated_brand_new_token';
    FacilityUserResource.rotateQrToken.mockResolvedValue({
      data: { qr_login_token: newToken },
    });
    const { emitted } = render(StudentIdCard, {
      props: { learner: LEARNER_WITH_PHOTO },
    });

    // Open the regenerate confirmation modal, then confirm it.
    await userEvent.click(screen.getByText('Regenerate QR code'));
    await userEvent.click(screen.getByText('ConfirmRegen'));

    expect(FacilityUserResource.rotateQrToken).toHaveBeenCalledWith(LEARNER_WITH_PHOTO.id);
    // The refreshed token emitted up to the parent is the new one...
    expect(emitted()).toHaveProperty('refresh');
    expect(emitted().refresh[0][0].qr_login_token).toEqual(newToken);
    // ...which is different from the learner's previous token.
    expect(newToken).not.toEqual(LEARNER_WITH_PHOTO.qr_login_token);
  });

  it('shows a Generate button when learner has no QR token', () => {
    render(StudentIdCard, {
      props: { learner: LEARNER_NO_QR },
    });
    expect(screen.getByText('Generate QR code')).toBeInTheDocument();
  });

  it('does not show Generate button when learner already has a QR token', () => {
    render(StudentIdCard, {
      props: { learner: LEARNER_WITH_PHOTO },
    });
    expect(screen.queryByText('Generate QR code')).not.toBeInTheDocument();
  });

  it('assigns a QR token and emits refresh when Generate is clicked', async () => {
    FacilityUserResource.assignQrToken.mockResolvedValue({
      data: { qr_login_token: 'newly_assigned_token' },
    });
    const { emitted } = render(StudentIdCard, {
      props: { learner: LEARNER_NO_QR },
    });

    await userEvent.click(screen.getByText('Generate QR code'));

    expect(FacilityUserResource.assignQrToken).toHaveBeenCalledWith(LEARNER_NO_QR.id);
    expect(emitted()).toHaveProperty('refresh');
    expect(emitted().refresh[0][0].qr_login_token).toEqual('newly_assigned_token');
  });

  it('emits an error when assigning the QR token fails', async () => {
    FacilityUserResource.assignQrToken.mockRejectedValue(new Error('boom'));
    const { emitted } = render(StudentIdCard, {
      props: { learner: LEARNER_NO_QR },
    });

    await userEvent.click(screen.getByText('Generate QR code'));

    expect(emitted()).toHaveProperty('error');
  });

  it('shows a checkbox when selectable prop is true', () => {
    const { container } = render(StudentIdCard, {
      props: { learner: LEARNER_WITH_PHOTO, selectable: true },
    });
    expect(container.querySelector('input[type="checkbox"]')).toBeTruthy();
  });

  it('does not show a checkbox when selectable prop is false', () => {
    const { container } = render(StudentIdCard, {
      props: { learner: LEARNER_WITH_PHOTO, selectable: false },
    });
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});
