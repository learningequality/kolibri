import { render, screen, fireEvent, within } from '@testing-library/vue';
import { useRouter } from 'vue-router/composables';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import { PageNames } from '../../constants.js';
import LearnerLimitReachedModal from '../LearnerLimitReachedModal.vue';

jest.mock('vue-router/composables', () => ({
  useRouter: jest.fn(),
}));

const {
  learnerLimitReachedHeading$,
  learnerLimitReachedContext$,
  learnerLimitReachedNotice$,
  goToFacilitySettingsLabel$,
} = picturePasswordStrings;

function renderModal() {
  const closeHandler = jest.fn();
  const utils = render(LearnerLimitReachedModal, {
    listeners: {
      close: closeHandler,
    },
  });
  return { ...utils, closeHandler };
}

describe('LearnerLimitReachedModal', () => {
  it('renders the modal with correct heading and body text', () => {
    renderModal();

    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText(learnerLimitReachedHeading$())).toBeInTheDocument();
    expect(
      within(modal).getByTestId('context-paragraph', learnerLimitReachedContext$()),
    ).toBeInTheDocument();
    expect(
      within(modal).getByTestId('notice-paragraph', learnerLimitReachedNotice$()),
    ).toBeInTheDocument();
  });

  it('renders both action buttons', () => {
    renderModal();

    const modal = screen.getByRole('dialog');
    expect(
      within(modal).getByRole('button', { name: goToFacilitySettingsLabel$() }),
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole('button', { name: coreString('closeAction') }),
    ).toBeInTheDocument();
  });

  it('emits close event when close button is clicked', async () => {
    const { closeHandler } = renderModal();

    const modal = screen.getByRole('dialog');
    await fireEvent.click(within(modal).getByRole('button', { name: coreString('closeAction') }));

    expect(closeHandler).toHaveBeenCalled();
  });

  it('navigates to facility settings when button is clicked', async () => {
    const push = jest.fn();
    useRouter.mockReturnValue({
      push,
    });
    renderModal();

    const modal = screen.getByRole('dialog');
    await fireEvent.click(
      within(modal).getByRole('button', { name: goToFacilitySettingsLabel$() }),
    );

    expect(push).toHaveBeenCalledWith({
      name: PageNames.FACILITY_CONFIG_PAGE,
    });
  });
});
