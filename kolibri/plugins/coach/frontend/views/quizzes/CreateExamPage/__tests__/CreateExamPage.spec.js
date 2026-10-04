import { fireEvent, render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import VueRouter from 'vue-router';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import OverlayHeading from '../../../common/OverlayHeading';
import makeStore from '../../../../__tests__/utils/makeStore';
import { PageNames } from '../../../../constants';
import { coachStrings } from '../../../common/commonCoachStrings';
import SidePanelRecipientsSelector from '../../../common/assignments/SidePanelRecipientsSelector';
import LearnersSelectorSidePanel from '../../../common/assignments/SidePanelRecipientsSelector/LearnersSelectorSidePanel';
import CreateExamPage from '..';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/urls');
jest.mock('kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationResource');
jest.mock(
  'kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationDismissedResource',
);
jest.mock('../../../../composables/useCoreCoach', () => {
  const useCoreCoach = jest.requireActual('../../../../composables/useCoreCoach').default;
  return (...args) => ({ ...useCoreCoach(...args), initClassInfo: jest.fn() });
});
jest.mock('../../../../composables/useQuizCreation', () => ({
  __esModule: true,
  default: () => {
    const { ref } = require('vue');
    return {
      quizHasChanged: ref(true),
      quiz: ref({
        title: 'Quiz 1',
        draft: false,
        learners_see_fixed_order: false,
        assignments: [],
        learner_ids: [],
      }),
      updateQuiz: jest.fn(),
      saveQuiz: jest.fn(),
      initializeQuiz: jest.fn(() => Promise.resolve()),
      allSectionsEmpty: ref(false),
      allSections: ref([{}]),
    };
  },
}));

const PanelStub = {
  render: h => h('h1', { attrs: { 'data-testid': 'panel' } }, [h(OverlayHeading)]),
};

const CLASS_ID = 'c'.repeat(32);

async function renderCreateExamPage(routeName = PageNames.EXAM_CREATION_ROOT) {
  const store = makeStore();
  store.state.classSummary.id = CLASS_ID;
  store.state.classSummary.learnerMap = { l1: { id: 'l1', name: 'Learner 1' } };
  const router = new VueRouter({
    routes: [
      {
        path: '/:classId/quizzes/:quizId/edit/:sectionIndex',
        name: PageNames.EXAM_CREATION_ROOT,
        component: CreateExamPage,
        children: [{ path: 'details', name: PageNames.QUIZ_SECTION_EDITOR, component: PanelStub }],
      },
      { path: '/:classId/quizzes', name: PageNames.EXAMS_ROOT },
    ],
  });
  await router.push({
    name: routeName,
    params: { classId: CLASS_ID, quizId: 'new', sectionIndex: '0' },
  });
  render({ template: '<router-view />' }, { store, routes: router });
  await global.flushPromises();
  return router;
}

async function openRecipientsPanel() {
  await fireEvent.click(screen.getByText(coachStrings.groupsAndLearnersLabel$()));
  await fireEvent.click(screen.getByText(SidePanelRecipientsSelector.$trs.selectAction.message));
  await global.flushPromises();
}

// Leaving with unsaved changes opens the close confirmation.
async function leavePage(router) {
  await router.push({ name: PageNames.EXAMS_ROOT, params: { classId: CLASS_ID } }).catch(() => {});
  await global.flushPromises();
}

describe('CreateExamPage', () => {
  beforeEach(() => {
    useUser.mockImplementation(() => useUserMock({ isCoach: true }));
  });

  it("leaves a routed side panel's heading as the only h1", async () => {
    await renderCreateExamPage(PageNames.QUIZ_SECTION_EDITOR);
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveAttribute('data-testid', 'panel');
    expect(document.title).toBe('Create new quiz - Kolibri');
  });

  describe('without a title conflict', () => {
    let consoleError;
    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      consoleError.mockRestore();
    });

    it('opens the close confirmation over a routed side panel without a title conflict', async () => {
      await leavePage(await renderCreateExamPage(PageNames.QUIZ_SECTION_EDITOR));
      expect(screen.getByTestId('panel')).toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('opens the close confirmation over the recipients panel without a title conflict', async () => {
      const router = await renderCreateExamPage();
      await openRecipientsPanel();
      await leavePage(router);
      expect(screen.getByText(coachStrings.closeConfirmationTitle$())).toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();
      expect(document.title).toBe('Create new quiz - Kolibri');
    });

    it('keeps the recipients panel open across a routed side panel without a title conflict', async () => {
      const router = await renderCreateExamPage();
      await openRecipientsPanel();
      await router.push({ name: PageNames.QUIZ_SECTION_EDITOR });
      await global.flushPromises();
      expect(
        screen.getAllByRole('heading', { level: 1 }).filter(h => !h.closest('[inert]')),
      ).toEqual([screen.getByTestId('panel')]);
      await router.push({ name: PageNames.EXAM_CREATION_ROOT });
      await global.flushPromises();
      const headings = screen.queryAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(
        LearnersSelectorSidePanel.$trs.selectGroupsAndIndividualLearnersTitle.message,
      );
      expect(consoleError).not.toHaveBeenCalled();
      expect(document.title).toBe('Create new quiz - Kolibri');
    });
  });
});
