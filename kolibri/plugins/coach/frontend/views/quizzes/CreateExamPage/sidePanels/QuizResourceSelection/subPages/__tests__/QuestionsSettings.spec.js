import { markRaw, ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
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
});
