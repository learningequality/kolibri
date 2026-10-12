import { render, screen, within } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
/* eslint-disable import-x/named */
import useContentNodeProgress, {
  useContentNodeProgressMock,
} from '../../../../composables/useContentNodeProgress';
/* eslint-enable import-x/named */
import { learnStrings } from '../../../commonLearnStrings';
import AssignmentCard from '../index.vue';

jest.mock('../../../../composables/useContentNodeProgress');

// --- Course test data ---
const baseCourse = {
  id: '395b68e7be06485cbe65ce159dac6859',
  title: 'Test Course 1',
};

const makeResource = (contentId, progress = 0) => ({
  contentnode_id: contentId,
  progress,
  contentnode: { content_id: contentId },
});

// --- Lesson test data ---
const baseLesson = {
  id: '395b68e7be06485cbe65ce159dac6859',
  title: 'Test Lesson 1',
  resources: [],
};

// --- Quiz test data ---
const baseQuiz = {
  id: '395b68e7be06485cbe65ce159dac6859',
  title: 'Test Quiz 1',
  active: true,
  question_count: 10,
  progress: {
    started: false,
    closed: false,
    answer_count: 0,
    score: null,
  },
};

const CLASSROOM_NAME = 'Test Classroom 1';

const renderComponent = (propsData = {}) => {
  return render(AssignmentCard, {
    props: {
      ...propsData,
    },
    routes: new VueRouter(),
  });
};

function makeCourseWrapper(propsOverrides = {}) {
  return renderComponent({
    course: baseCourse,
    to: { path: '/course' },
    collectionTitle: CLASSROOM_NAME,
    ...propsOverrides,
  });
}

function makeLessonWrapper(lessonOverrides = {}) {
  return renderComponent({
    lesson: {
      ...baseLesson,
      ...lessonOverrides,
    },
    collectionTitle: CLASSROOM_NAME,
    to: { path: '/lesson' },
  });
}

function makeQuizWrapper(quizOverrides = {}) {
  return renderComponent({
    quiz: {
      ...baseQuiz,
      ...quizOverrides,
      progress: {
        ...baseQuiz.progress,
        ...(quizOverrides.progress || {}),
      },
    },
    to: { path: '/quiz' },
    collectionTitle: CLASSROOM_NAME,
  });
}

describe('AssignmentCard', () => {
  beforeEach(() => {
    useContentNodeProgress.mockImplementation(() => useContentNodeProgressMock());
  });

  describe('when rendering a course', () => {
    it('shows the classroom name when collectionTitle is provided', () => {
      makeCourseWrapper();
      expect(screen.getByText(CLASSROOM_NAME)).toHaveClass('collection-title');
    });

    it('does not show the classroom name when collectionTitle is empty', () => {
      makeCourseWrapper({ collectionTitle: '' });
      expect(screen.queryByText(CLASSROOM_NAME)).not.toBeInTheDocument();
    });

    it('shows the course title', () => {
      makeCourseWrapper();
      expect(screen.getByRole('heading', { level: 3, name: baseCourse.title })).toBeInTheDocument();
    });

    it('shows the course label', () => {
      const { container } = makeCourseWrapper();
      expect(
        within(container.querySelector('.course-label')).getByText(coursesStrings.courseLabel$()),
      ).toBeInTheDocument();
    });

    it('shows the right link', () => {
      makeCourseWrapper();
      expect(screen.getByRole('link', { name: baseCourse.title })).toHaveAttribute(
        'href',
        expect.stringContaining('/course'),
      );
    });

    it('does not show counts when unit_count and lesson_count are absent', () => {
      const { container } = makeCourseWrapper();
      expect(container.querySelector('.course-counts')).not.toBeInTheDocument();
    });

    it('shows unit and resource counts when both are provided', () => {
      makeCourseWrapper({
        course: { ...baseCourse, unit_count: 3, lesson_count: 12 },
      });
      const label = `${coursesStrings.numUnits$({ num: 3 })} · ${coursesStrings.numLessons$({ num: 12 })}`;
      expect(screen.getByText(label)).toHaveClass('course-counts');
    });

    it('shows only unit count when lesson_count is 0', () => {
      makeCourseWrapper({
        course: { ...baseCourse, unit_count: 1, lesson_count: 0 },
      });
      expect(screen.getByText(coursesStrings.numUnits$({ num: 1 }))).toHaveClass('course-counts');
    });

    it('shows only resource count when unit_count is 0', () => {
      makeCourseWrapper({
        course: { ...baseCourse, unit_count: 0, lesson_count: 5 },
      });
      expect(screen.getByText(coursesStrings.numLessons$({ num: 5 }))).toHaveClass('course-counts');
    });
  });

  describe('when rendering a lesson', () => {
    it('shows the classroom name', () => {
      makeLessonWrapper();
      expect(screen.getByText(CLASSROOM_NAME)).toHaveClass('collection-title');
    });

    it('shows the lesson title', () => {
      makeLessonWrapper();
      expect(screen.getByRole('heading', { level: 3, name: baseLesson.title })).toBeInTheDocument();
    });

    it('shows the right link', () => {
      makeLessonWrapper();
      expect(screen.getByRole('link', { name: baseLesson.title })).toHaveAttribute(
        'href',
        expect.stringContaining('/lesson'),
      );
    });

    describe('progress section', () => {
      it('shows no progress label if there are no resources', () => {
        const { container } = makeLessonWrapper({ resources: [] });
        expect(container.querySelector('.progress-section')).toBeEmptyDOMElement();
      });

      it('shows no progress label when the lesson has not been started', () => {
        // resources exist but none have progress in the map (all default to 0)
        const { container } = makeLessonWrapper({
          resources: [makeResource('content1'), makeResource('content2')],
        });
        expect(container.querySelector('.progress-section')).toBeEmptyDOMElement();
      });

      it('shows a "In progress" label if still in progress', () => {
        useContentNodeProgress.mockImplementation(() =>
          useContentNodeProgressMock({
            contentNodeProgressMap: { content1: 0.5, content2: 0 },
          }),
        );
        const { container } = makeLessonWrapper({
          resources: [makeResource('content1'), makeResource('content2')],
        });
        expect(
          within(container.querySelector('.progress-section')).getByText(
            coreStrings.inProgressLabel$(),
          ),
        ).toBeInTheDocument();
      });

      it('shows a "Completed" label if all resources are complete', () => {
        useContentNodeProgress.mockImplementation(() =>
          useContentNodeProgressMock({
            contentNodeProgressMap: { content1: 1, content2: 1 },
          }),
        );
        const { container } = makeLessonWrapper({
          resources: [makeResource('content1'), makeResource('content2')],
        });
        expect(
          within(container.querySelector('.progress-section')).getByText(
            coreStrings.completedLabel$(),
          ),
        ).toBeInTheDocument();
      });

      it('uses API-provided resource progress as fallback when not in the map', () => {
        // resource.progress from API is used when contentNodeProgressMap has no entry
        const { container } = makeLessonWrapper({
          resources: [makeResource('content1', 0.5), makeResource('content2', 0)],
        });
        expect(
          within(container.querySelector('.progress-section')).getByText(
            coreStrings.inProgressLabel$(),
          ),
        ).toBeInTheDocument();
      });

      it('uses the higher of API progress and map progress', () => {
        // contentNodeProgressMap has a higher value than the stale API data
        useContentNodeProgress.mockImplementation(() =>
          useContentNodeProgressMock({
            contentNodeProgressMap: { content1: 1 },
          }),
        );
        const { container } = makeLessonWrapper({
          resources: [makeResource('content1', 0.5), makeResource('content2', 0)],
        });
        // content1: max(1, 0.5)=1, content2: max(0, 0)=0 → sum=1, total=2 → 1-2=-1 → in progress
        expect(
          within(container.querySelector('.progress-section')).getByText(
            coreStrings.inProgressLabel$(),
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe('when rendering a quiz', () => {
    it('shows the classroom name', () => {
      makeQuizWrapper();
      expect(screen.getByText(CLASSROOM_NAME)).toHaveClass('collection-title');
    });

    it('shows the quiz title', () => {
      makeQuizWrapper();
      expect(screen.getByRole('heading', { level: 3, name: baseQuiz.title })).toBeInTheDocument();
    });

    it('shows the right link', () => {
      makeQuizWrapper();
      expect(screen.getByRole('link', { name: baseQuiz.title })).toHaveAttribute(
        'href',
        expect.stringContaining('/quiz'),
      );
    });

    describe('progress section', () => {
      it('shows no progress label when the quiz has not been started', () => {
        const { container } = makeQuizWrapper({ progress: { started: false } });
        expect(container.querySelector('.progress-section')).toBeEmptyDOMElement();
      });

      it('shows how many questions are left if still in progress', () => {
        const { container } = makeQuizWrapper({ progress: { started: true, answer_count: 5 } });
        // N = quiz.question_count - quiz.progress.answer_count
        expect(
          within(container.querySelector('.progress-section')).getByText(
            learnStrings.questionsLeft$({ questionsLeft: 5 }),
          ),
        ).toBeInTheDocument();
      });

      it('shows the percentage score if the quiz is submitted or closed', () => {
        const { container } = makeQuizWrapper({
          progress: { started: true, answer_count: 10, closed: true, score: 7 },
        });
        // P = 7/10 = 70%
        expect(
          within(container.querySelector('.progress-section')).getByText(
            learnStrings.completedPercentLabel$({ score: 70 }),
          ),
        ).toBeInTheDocument();
      });
    });
  });
});
