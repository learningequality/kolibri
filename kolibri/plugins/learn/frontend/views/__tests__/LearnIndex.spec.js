import { ref } from 'vue';
import { render, screen, fireEvent, within } from '@testing-library/vue';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line import-x/named
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING } from 'kolibri-common/constants/Auth';
import LearnIndex from '../LearnIndex';

jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  fetchModel: jest.fn(),
}));

async function flushUi() {
  await global.flushPromises();
  await global.flushPromises();
}

function renderComponent({ facilityConfig, isLearner = true } = {}) {
  useFacility.mockReturnValue(
    useFacilityMock({
      fetchFacilityConfig: jest.fn().mockResolvedValue({}),
      ...(facilityConfig ? { facilityConfig } : {}),
    }),
  );
  useUser.mockReturnValue(
    useUserMock({ currentUserId: 'user-1', isUserLoggedIn: true, isLearner }),
  );
  return render(LearnIndex, {
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
}

describe('LearnIndex picture password modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows the modal and keeps the flag set while the modal is open', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.fetchModel.mockResolvedValue({ picture_password: '3.7.12' });

    renderComponent();
    await flushUi();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).toBe('true');
  });

  it('clears the flag when the modal is dismissed', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.fetchModel.mockResolvedValue({ picture_password: '3.7.12' });

    renderComponent();
    await flushUi();

    const checkbox = screen.getByTestId('continue-checkbox');
    await fireEvent.click(checkbox);
    const submitButton = within(screen.getByRole('dialog')).getByRole('button');
    await fireEvent.click(submitButton);
    await flushUi();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).not.toBe('true');
  });

  it('does not show the modal when picture_password is null', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.fetchModel.mockResolvedValue({ picture_password: null });

    renderComponent();
    await flushUi();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the flag set when picture_password is null but facility has picture passwords enabled', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.fetchModel.mockResolvedValue({ picture_password: null });

    renderComponent({
      facilityConfig: ref({ picture_password_settings: { icon_style: 'standard' } }),
    });
    await flushUi();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).toBe('true');
  });

  it('clears the flag when picture_password is null and user is not a learner, even if facility has picture passwords enabled', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.fetchModel.mockResolvedValue({ picture_password: null });

    renderComponent({
      facilityConfig: ref({ picture_password_settings: { icon_style: 'standard' } }),
      isLearner: false,
    });
    await flushUi();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).not.toBe('true');
  });

  it('does not fetch user data when the flag is not set', async () => {
    FacilityUserResource.fetchModel.mockResolvedValue({ picture_password: '3.7.12' });

    renderComponent();
    await flushUi();

    expect(FacilityUserResource.fetchModel).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
