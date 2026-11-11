import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
import { PageNames } from '../../../../../../constants';
import useQuizCreation from '../../../../../../composables/useQuizCreation';
import QuizResourceSelection from '..';

jest.mock('kolibri-common/apiResources/ChannelResource');
jest.mock('kolibri-common/apiResources/ContentNodeResource');

const SECTION_TITLE = 'Section A';
const QuizCreationHost = {
  setup() {
    const { initializeQuiz, updateSection } = useQuizCreation();
    initializeQuiz('class-id');
    updateSection({ sectionIndex: 0, section_title: SECTION_TITLE });
  },
  render(h) {
    return h('router-view');
  },
};
const { selectResourcesDescription$ } = enhancedQuizManagementStrings;

describe('QuizResourceSelection', () => {
  it('names the dialog when focus moves into it, before the channels load', async () => {
    ChannelResource.list.mockReturnValue(new Promise(() => {}));
    ContentNodeResource.fetchBookmarks.mockReturnValue(new Promise(() => {}));
    ContentNodeResource.list.mockResolvedValue({ results: [], more: null, labels: {} });
    const dialogName = selectResourcesDescription$({ sectionTitle: SECTION_TITLE });
    const router = new VueRouter({
      routes: [
        { path: '/', name: PageNames.EXAM_CREATION_ROOT },
        {
          path: '/select-resources',
          name: PageNames.QUIZ_SELECT_RESOURCES,
          component: QuizResourceSelection,
        },
      ],
    });
    let namedOnFirstFocus;
    const recordDialogName = event => {
      const dialog = event.target.closest('[role="dialog"]');
      if (dialog && namedOnFirstFocus === undefined) {
        namedOnFirstFocus = screen.queryByRole('dialog', { name: dialogName }) === dialog;
      }
    };
    document.addEventListener('focusin', recordDialogName);

    render(QuizCreationHost, { routes: router });
    await router.push({ name: PageNames.QUIZ_SELECT_RESOURCES });
    await global.flushPromises();
    document.removeEventListener('focusin', recordDialogName);
    expect(namedOnFirstFocus).toBe(true);
  });
});
