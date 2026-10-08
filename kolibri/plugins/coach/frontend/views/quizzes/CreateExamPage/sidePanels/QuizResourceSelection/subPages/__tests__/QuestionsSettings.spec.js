import { markRaw, ref } from 'vue';
import { render, screen, fireEvent, within } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
import QuestionsSettings from '../QuestionsSettings.vue';

jest.mock('kolibri-common/composables/usePreviousRoute.js', () => ({ useGoBack: () => jest.fn() }));
jest.mock('../../../../../../../composables/useQuizCreation', () => ({
  injectQuizCreation: () => ({
    activeSection: { value: { section_title: '' } },
    activeSectionIndex: { value: 0 },
  }),
}));

describe('QuestionsSettings', () => {
  it('shows an error and disables Continue when channels fail to load', () => {
    const setContinueAction = jest.fn();

    render(QuestionsSettings, {
      props: {
        channelsFetch: markRaw({ data: ref(null), error: ref(new Error()) }),
        settings: { maxQuestions: 10, questionCount: 5 },
        setContinueAction,
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(coreStrings.defaultErrorMessage$());
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(setContinueAction).toHaveBeenLastCalledWith(expect.objectContaining({ disabled: true }));
  });

  describe('number of questions', () => {
    function renderSettings() {
      const setContinueAction = jest.fn();
      render(QuestionsSettings, {
        props: {
          channelsFetch: markRaw({ data: ref([{ num_assessments: 100 }]), error: ref(null) }),
          settings: { maxQuestions: 25, questionCount: 10 },
          setContinueAction,
        },
      });
      return setContinueAction;
    }

    // KTextbox doesn't link its invalid text to the input with aria-describedby,
    // so look for the message inside the textbox itself.
    function questionCountField() {
      return within(screen.getByRole('spinbutton').closest('.ui-textbox'));
    }

    it.each(['2.5', '0', '-3', ''])('disables Continue and explains why for %p', async value => {
      const setContinueAction = renderSettings();

      await fireEvent.update(screen.getByRole('spinbutton'), value);

      expect(setContinueAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ disabled: true }),
      );
      expect(
        questionCountField().getByText(enhancedQuizManagementStrings.wholeNumberOfQuestions$()),
      ).toBeInTheDocument();
    });

    it('allows Continue for a whole number within the limit', async () => {
      const setContinueAction = renderSettings();

      await fireEvent.update(screen.getByRole('spinbutton'), '3');

      expect(setContinueAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ disabled: false }),
      );
      expect(
        questionCountField().queryByText(enhancedQuizManagementStrings.wholeNumberOfQuestions$()),
      ).not.toBeInTheDocument();
    });
  });
});
