import { render, screen } from '@testing-library/vue';
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

function renderComponent() {
  useFacility.mockReturnValue(
    useFacilityMock({ fetchFacilityConfig: jest.fn().mockResolvedValue({}) }),
  );
  useUser.mockReturnValue(useUserMock({ currentUserId: 'user-1', isUserLoggedIn: true }));
  return render(LearnIndex, {
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
}

describe('LearnIndex picture password modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows the modal and clears the flag when picture_password is set', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.fetchModel.mockResolvedValue({ picture_password: '3.7.12' });

    renderComponent();
    await flushUi();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).not.toBe('true');
  });

  it('does not show the modal when picture_password is null', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.fetchModel.mockResolvedValue({ picture_password: null });

    renderComponent();
    await flushUi();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not fetch user data when the flag is not set', async () => {
    FacilityUserResource.fetchModel.mockResolvedValue({ picture_password: '3.7.12' });

    renderComponent();
    await flushUi();

    expect(FacilityUserResource.fetchModel).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
