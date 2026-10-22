import { ref } from 'vue';
import { render, screen, fireEvent, within } from '@testing-library/vue';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line import-x/named
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING } from 'kolibri-common/constants/Auth';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import LearnIndex from '../LearnIndex';

jest.mock('kolibri-common/composables/useFacility');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  retrieve: jest.fn(),
}));

async function flushUi() {
  await global.flushPromises();
  await global.flushPromises();
}

function renderComponent({
  facilityConfig,
  isLearner = true,
  routedPage = { template: '<div />' },
} = {}) {
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
    routes: [{ path: '/', component: routedPage }],
  });
}

describe('LearnIndex picture password modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows the modal and keeps the flag set while the modal is open', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.retrieve.mockResolvedValue({ picture_password: '3.7.12' });

    renderComponent();
    await flushUi();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).toBe('true');
  });

  it('leaves the routed page reachable behind the modal with no side panel open', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.retrieve.mockResolvedValue({ picture_password: '3.7.12' });

    renderComponent({
      routedPage: { render: h => h('div', { attrs: { 'data-testid': 'page' } }) },
    });
    await flushUi();

    expect(
      screen.getByRole('dialog', { name: picturePasswordStrings.picturePasswordAssignedTitle$() }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('page')).not.toHaveAttribute('inert');
  });

  it('keeps the modal out from behind a side panel open on the routed page', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.retrieve.mockResolvedValue({ picture_password: '3.7.12' });

    renderComponent({
      routedPage: {
        render: h => h('section', { attrs: { role: 'dialog', 'aria-modal': 'true' } }),
      },
    });
    await flushUi();

    const modal = screen.getByRole('dialog', {
      name: picturePasswordStrings.picturePasswordAssignedTitle$(),
    });
    const activeModals = [...document.querySelectorAll('[aria-modal="true"]')].filter(
      element => !element.closest('[inert]'),
    );
    expect(document.querySelector('[aria-modal="true"]')).not.toBeNull();
    expect(modal.closest('[inert]')).toBeNull();
    expect(activeModals.every(element => element.contains(modal))).toBe(true);

    await fireEvent.click(screen.getByTestId('continue-checkbox'));
    await fireEvent.click(within(modal).getByRole('button'));
    await flushUi();

    expect(document.querySelector('[inert]')).toBeNull();
  });

  it('clears the flag when the modal is dismissed', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.retrieve.mockResolvedValue({ picture_password: '3.7.12' });

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
    FacilityUserResource.retrieve.mockResolvedValue({ picture_password: null });

    renderComponent();
    await flushUi();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the flag set when picture_password is null but facility has picture passwords enabled', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.retrieve.mockResolvedValue({ picture_password: null });

    renderComponent({
      facilityConfig: ref({ picture_password_settings: { icon_style: 'standard' } }),
    });
    await flushUi();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).toBe('true');
  });

  it('clears the flag when picture_password is null and user is not a learner, even if facility has picture passwords enabled', async () => {
    sessionStorage.setItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING, 'true');
    FacilityUserResource.retrieve.mockResolvedValue({ picture_password: null });

    renderComponent({
      facilityConfig: ref({ picture_password_settings: { icon_style: 'standard' } }),
      isLearner: false,
    });
    await flushUi();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(PICTURE_PASSWORD_ASSIGNED_MODAL_PENDING)).not.toBe('true');
  });

  it('does not fetch user data when the flag is not set', async () => {
    FacilityUserResource.retrieve.mockResolvedValue({ picture_password: '3.7.12' });

    renderComponent();
    await flushUi();

    expect(FacilityUserResource.retrieve).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
