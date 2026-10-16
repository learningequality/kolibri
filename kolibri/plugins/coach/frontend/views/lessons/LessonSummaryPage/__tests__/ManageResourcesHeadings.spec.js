import { fireEvent, render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import LessonResource from 'kolibri-common/apiResources/LessonResource';
import UserSyncStatusResource from 'kolibri-common/apiResources/UserSyncStatusResource';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coachStrings } from '../../../common/commonCoachStrings';
import makeStore from '../../../../__tests__/utils/makeStore';
import ClassSummaryResource from '../../../../apiResources/classSummary';
import store from '../../../../store';
import lessonsRoutes from '../../../../routes/lessonsRoutes';
import { PageNames } from '../../../../constants';

jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-common/apiResources/ChannelResource');
jest.mock('kolibri-common/apiResources/ClassroomResource');
jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri-common/apiResources/LearnerGroupResource');
jest.mock('kolibri-common/apiResources/LessonResource');
jest.mock('kolibri-common/apiResources/UserSyncStatusResource');
jest.mock('../../../../apiResources/classSummary');
jest.mock('kolibri/router', () => ({
  getRoute: jest.fn((name, params) => ({ name, params })),
  getReactiveRoute: jest.fn(() => ({ params: {} })),
}));
jest.mock('kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationResource');
jest.mock(
  'kolibri/components/pages/NotificationsRoot/internal/PingbackNotificationDismissedResource',
);

const { manageLessonResourcesTitle$, manageResourcesAction$ } = coachStrings;
const { closeAction$ } = coreStrings;

const CLASS_ID = 'c'.repeat(32);
const LESSON = {
  id: 'lesson',
  title: 'Fractions',
  classroom: { id: CLASS_ID },
  assignments: [],
  learner_ids: [],
  resources: [],
};
const CLASS_SUMMARY = {
  id: CLASS_ID,
  facility_id: 'facility',
  name: 'Class',
  coaches: [],
  learners: [],
  groups: [],
  adhoclearners: [],
  exams: [],
  exam_learner_status: [],
  content: [],
  content_learner_status: [],
  lessons: [{ ...LESSON, date_created: null }],
};

async function renderLessonSummary() {
  store.replaceState(makeStore().state);
  // Already on this class, so initClassInfo skips notification polling
  store.state.classSummary.id = CLASS_ID;
  const router = new VueRouter({
    routes: lessonsRoutes.filter(route =>
      [PageNames.LESSONS_ROOT, PageNames.LESSON_SUMMARY].includes(route.name),
    ),
  });
  await router.push({
    name: PageNames.LESSON_SUMMARY,
    params: { classId: CLASS_ID, lessonId: LESSON.id },
  });
  // The page's own <router-view> renders its side panels, so it must not be the root.
  render({ template: '<router-view />' }, { store, routes: router });
  await global.flushPromises();
}

// Jest does not model aria-modal, so count the H1s it would hide by hand.
function headingsOutsideModal() {
  return screen
    .queryAllByRole('heading', { level: 1 })
    .filter(heading => !heading.closest('[aria-modal="true"]'));
}

describe('LessonSummaryPage side panel headings', () => {
  beforeEach(() => {
    useUser.mockImplementation(() => useUserMock({ isCoach: true }));
    ChannelResource.list.mockResolvedValue([]);
    ClassSummaryResource.retrieve.mockResolvedValue(CLASS_SUMMARY);
    ClassroomResource.list.mockResolvedValue([]);
    LearnerGroupResource.list.mockResolvedValue([]);
    LessonResource.retrieve.mockResolvedValue(LESSON);
    LessonResource.fetchLessonsSizes.mockResolvedValue([]);
    UserSyncStatusResource.list.mockResolvedValue([]);
    ContentNodeResource.fetchBookmarks.mockResolvedValue({ results: [], more: null });
    ContentNodeResource.list.mockResolvedValue({ results: [], more: null, labels: {} });
  });

  it('keeps one H1 outside the modal dialog while managing resources', async () => {
    await renderLessonSummary();
    // getByRole throws on more than one match, so this also pins the count.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(LESSON.title);

    await fireEvent.click(screen.getByRole('link', { name: manageResourcesAction$() }));
    await global.flushPromises();
    const dialog = screen.getByRole('dialog', { name: manageLessonResourcesTitle$() });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const outsideModal = headingsOutsideModal();
    expect(outsideModal).toHaveLength(1);
    expect(outsideModal[0]).toHaveTextContent(LESSON.title);

    await fireEvent.click(screen.getByRole('button', { name: closeAction$() }));
    await global.flushPromises();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(LESSON.title);
  });

  it('names the dialog when focus moves into it, before the channels load', async () => {
    ChannelResource.list.mockReturnValue(new Promise(() => {}));
    await renderLessonSummary();
    let namedOnFirstFocus;
    const recordDialogName = event => {
      const dialog = event.target.closest('[role="dialog"]');
      if (dialog && namedOnFirstFocus === undefined) {
        namedOnFirstFocus =
          screen.queryByRole('dialog', { name: manageLessonResourcesTitle$() }) === dialog;
      }
    };
    document.addEventListener('focusin', recordDialogName);

    await fireEvent.click(screen.getByRole('link', { name: manageResourcesAction$() }));
    await global.flushPromises();
    document.removeEventListener('focusin', recordDialogName);
    expect(namedOnFirstFocus).toBe(true);
  });
});
