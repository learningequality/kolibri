import { fireEvent, render, screen } from '@testing-library/vue';
import { ref } from 'vue';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import PicturePasswordAssignedModal from '../PicturePasswordAssignedModal.vue';

jest.mock('kolibri-common/composables/useFacility');
const {
  picturePasswordAssignedTitle$,
  picturePasswordAssignedDescription$,
  picturePasswordAssignedAddendum$,
  readyToContinue$,
} = picturePasswordStrings;

function setupFacilityMock() {
  useFacility.mockImplementation(() =>
    useFacilityMock({
      facilityConfig: ref({
        picture_password_settings: null,
      }),
    }),
  );
}

function renderComponent() {
  setupFacilityMock();
  return render(PicturePasswordAssignedModal, {
    props: {
      picturePassword: '3.7.12',
    },
  });
}

describe('PicturePasswordAssignedModal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables continue until checkbox is checked', async () => {
    renderComponent();
    const continueButton = screen.getByRole('button', { name: coreString('continueAction') });
    expect(continueButton).toBeDisabled();

    await fireEvent.click(screen.getByLabelText(readyToContinue$()));
    expect(continueButton).toBeEnabled();
  });

  it('renders title and explanatory text', () => {
    renderComponent();
    expect(screen.getByText(picturePasswordAssignedTitle$())).toBeInTheDocument();
    expect(screen.getByText(picturePasswordAssignedDescription$())).toBeInTheDocument();
    expect(screen.getByText(picturePasswordAssignedAddendum$())).toBeInTheDocument();
  });

  it('emits confirm after checkbox is checked and continue is clicked', async () => {
    const { emitted } = renderComponent();

    await fireEvent.click(screen.getByLabelText(readyToContinue$()));
    await fireEvent.click(screen.getByRole('button', { name: coreString('continueAction') }));

    expect(emitted().confirm).toHaveLength(1);
  });

  it('does not render a cancel button', () => {
    renderComponent();
    expect(
      screen.queryByRole('button', { name: coreString('cancelAction') }),
    ).not.toBeInTheDocument();
  });
});
