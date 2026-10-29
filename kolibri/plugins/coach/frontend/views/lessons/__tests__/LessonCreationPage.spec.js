import VueRouter from 'vue-router';
import { fireEvent, render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import LessonResource from 'kolibri-common/apiResources/LessonResource';
import ClassSummaryResource from '../../../apiResources/classSummary';
import { coachStrings } from '../../common/commonCoachStrings';
import makeStore from '../../../__tests__/utils/makeStore';
import { PageNames } from '../../../constants';
import LessonCreationPage from '../LessonCreationPage.vue';

const { saveChangesAction$, requiredFieldError$ } = coreStrings;
const { titleLabel$, saveLessonError$ } = coachStrings;

const CLASS_ID = 'class_1';

jest.mock('kolibri-common/apiResources/LessonResource');
jest.mock('../../../apiResources/classSummary');
jest.mock('kolibri-common/composables/usePageLoading');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/urls');

function renderComponent() {
  const store = makeStore();
  store.state.classSummary.id = CLASS_ID;
  const router = new VueRouter({
    routes: [
      { path: '/:classId/lessons/new', name: PageNames.LESSON_CREATION_ROOT },
      { path: '/:classId/lessons', name: 'LESSONS_ROOT' },
    ],
  });
  router.push({ name: PageNames.LESSON_CREATION_ROOT, params: { classId: CLASS_ID } });
  return render(LessonCreationPage, { store, routes: router });
}

describe('LessonCreationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUser.mockImplementation(() => useUserMock({ isCoach: true }));
    ClassSummaryResource.retrieve = jest.fn().mockResolvedValue({
      id: CLASS_ID,
      coaches: [],
      learners: [],
      groups: [],
      adhoclearners: [],
      exams: [],
      exam_learner_status: [],
      content: [],
      content_learner_status: [],
      lessons: [],
    });
  });

  it('shows the inline required-field error on the title field when the backend rejects a blank title', async () => {
    LessonResource.create = jest.fn().mockRejectedValue({
      response: {
        data: [
          { id: 'BLANK', metadata: { field: 'title', message: 'This field may not be blank.' } },
        ],
      },
    });
    renderComponent();
    await global.flushPromises();

    await fireEvent.click(screen.getByRole('button', { name: saveChangesAction$() }));
    await global.flushPromises();

    expect(screen.getByRole('textbox', { name: titleLabel$() })).toBeInTheDocument();
    expect(screen.getByText(requiredFieldError$())).toBeInTheDocument();
    expect(screen.queryByText(saveLessonError$())).not.toBeInTheDocument();
  });

  it('shows the generic error banner for a save failure unrelated to the title', async () => {
    LessonResource.create = jest.fn().mockRejectedValue({
      response: { data: [{ id: 'SOME_OTHER_ERROR' }] },
    });
    renderComponent();
    await global.flushPromises();

    await fireEvent.click(screen.getByRole('button', { name: saveChangesAction$() }));
    await global.flushPromises();

    expect(screen.getByText(saveLessonError$())).toBeInTheDocument();
    expect(screen.queryByText(requiredFieldError$())).not.toBeInTheDocument();
  });
});
