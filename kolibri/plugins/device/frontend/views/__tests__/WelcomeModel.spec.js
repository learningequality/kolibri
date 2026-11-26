import { render, fireEvent, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
// eslint-disable-next-line import-x/named
import useUser, { useUserMock } from 'kolibri/composables/useUser';
import WelcomeModal from '../WelcomeModal';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/composables/useFacilities');

const { continueAction$ } = coreStrings;
const { welcomeModalHeader, learnOnlyDeviceWelcomeMessage1 } = WelcomeModal.$trs;

describe('WelcomeModal', () => {
  beforeEach(() => {
    useUser.mockImplementation(() => useUserMock());
  });

  it('emits submit event when continue button is clicked', async () => {
    const submitListener = jest.fn();

    render(WelcomeModal, {
      listeners: {
        submit: submitListener,
      },
    });

    const submitButton = screen.getByRole('button', { name: continueAction$() });
    await fireEvent.click(submitButton);
    expect(submitListener).toHaveBeenCalledTimes(1);
  });

  // Learners see a title-only modal because the onboarding guide strings are
  // untranslated (#12098). Once they are translated, restore the learner
  // message; this test is expected to fail then and should be updated with it.
  it('shows learners the welcome title with no body text', () => {
    useUser.mockImplementation(() => useUserMock({ isLearner: true }));
    render(WelcomeModal);

    expect(screen.getByRole('dialog', { name: welcomeModalHeader.message })).toBeInTheDocument();
    expect(screen.queryAllByTestId('welcome-paragraph')).toHaveLength(0);
  });

  it('shows non-learner on-my-own users the import channels message', () => {
    useUser.mockImplementation(() => useUserMock({ isLearner: false }));
    render(WelcomeModal, { props: { isOnMyOwnUser: true } });

    const dialog = screen.getByRole('dialog', { name: welcomeModalHeader.message });
    expect(screen.getAllByTestId('welcome-paragraph')).toHaveLength(1);
    expect(dialog).toHaveTextContent(learnOnlyDeviceWelcomeMessage1.message);
  });
});
