/* eslint-disable import-x/named */
import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import useContentNodeProgress, {
  useContentNodeProgressMock,
} from '../../../../composables/useContentNodeProgress';
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
      expect(screen.getByText(CLASSROOM_NAME)).toBeInTheDocument();
    });

    it('does not show the classroom name when collectionTitle is empty', () => {
      makeCourseWrapper({ collectionTitle: '' });
      expect(screen.queryByText(CLASSROOM_NAME)).not.toBeInTheDocument();
    });

    it('shows the course title', () => {
      makeCourseWrapper();
      expect(screen.getAllByText(baseCourse.title).length).toBeGreaterThan(0);
    });

    it('shows the course label', () => {
      makeCourseWrapper();
      expect(screen.getByText(coursesStrings.courseLabel$())).toBeInTheDocument();
    });

    it('does not show unit and lesson counts when unit_count and lesson_count are absent', () => {
      makeCourseWrapper();
      const unitRegExp = /unit/i;
      expect(screen.queryByText(unitRegExp)).not.toBeInTheDocument();
    });

    it('shows unit and resource counts when both are provided', () => {
      makeCourseWrapper({
        course: { ...baseCourse, unit_count: 3, lesson_count: 12 },
      });
      const label = `${coursesStrings.numUnits$({ num: 3 })} · ${coursesStrings.numLessons$({ num: 12 })}`;
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('shows only unit count when lesson_count is 0', () => {
      makeCourseWrapper({
        course: { ...baseCourse, unit_count: 1, lesson_count: 0 },
      });
      expect(screen.getByText(coursesStrings.numUnits$({ num: 1 }))).toBeInTheDocument();
    });

    it('shows only resource count when unit_count is 0', () => {
      makeCourseWrapper({
        course: { ...baseCourse, unit_count: 0, lesson_count: 5 },
      });
      expect(screen.getByText(coursesStrings.numLessons$({ num: 5 }))).toBeInTheDocument();
    });
  });

  describe('when rendering a lesson', () => {
    it('shows the classroom name', () => {
      makeLessonWrapper();
      expect(screen.getByText(CLASSROOM_NAME)).toBeInTheDocument();
    });

    it('shows the lesson title', () => {
      makeLessonWrapper();
      expect(screen.getAllByText(baseLesson.title).length).toBeGreaterThan(0);
    });

    describe('progress section', () => {
      it('shows no progress label if there are no resources', () => {
        makeLessonWrapper({ resources: [] });
        expect(screen.queryByText(coreStrings.inProgressLabel$())).not.toBeInTheDocument();
        expect(screen.queryByText(coreStrings.completedLabel$())).not.toBeInTheDocument();
      });

      it('shows no progress label when the lesson has not been started', () => {
        makeLessonWrapper({
          resources: [makeResource('content1'), makeResource('content2')],
        });
        expect(screen.queryByText(coreStrings.inProgressLabel$())).not.toBeInTheDocument();
        expect(screen.queryByText(coreStrings.completedLabel$())).not.toBeInTheDocument();
      });

      it('shows a "In progress" label if still in progress', () => {
        useContentNodeProgress.mockImplementation(() =>
          useContentNodeProgressMock({
            contentNodeProgressMap: { content1: 0.5, content2: 0 },
          }),
        );
        makeLessonWrapper({
          resources: [makeResource('content1'), makeResource('content2')],
        });
        expect(screen.getByText(coreStrings.inProgressLabel$())).toBeInTheDocument();
      });

      it('shows a "Completed" label if all resources are complete', () => {
        useContentNodeProgress.mockImplementation(() =>
          useContentNodeProgressMock({
            contentNodeProgressMap: { content1: 1, content2: 1 },
          }),
        );
        makeLessonWrapper({
          resources: [makeResource('content1'), makeResource('content2')],
        });
        expect(screen.getByText(coreStrings.completedLabel$())).toBeInTheDocument();
      });

      it('uses API-provided resource progress as fallback when not in the map', () => {
        makeLessonWrapper({
          resources: [makeResource('content1', 0.5), makeResource('content2', 0)],
        });
        expect(screen.getByText(coreStrings.inProgressLabel$())).toBeInTheDocument();
      });

      it('uses the higher of API progress and map progress', () => {
        useContentNodeProgress.mockImplementation(() =>
          useContentNodeProgressMock({
            contentNodeProgressMap: { content1: 1 },
          }),
        );
        makeLessonWrapper({
          resources: [makeResource('content1', 0.5), makeResource('content2', 0)],
        });
        expect(screen.getByText(coreStrings.inProgressLabel$())).toBeInTheDocument();
      });
    });
  });

  describe('when rendering a quiz', () => {
    it('shows the classroom name', () => {
      makeQuizWrapper();
      expect(screen.getByText(CLASSROOM_NAME)).toBeInTheDocument();
    });

    it('shows the quiz title', () => {
      makeQuizWrapper();
      expect(screen.getAllByText(baseQuiz.title).length).toBeGreaterThan(0);
    });

    describe('progress section', () => {
      it('shows no progress label when the quiz has not been started', () => {
        makeQuizWrapper({ progress: { started: false } });
        const questionRegExp = /questions? left/i;
        const scoreRegExp = /Score:/i;
        expect(screen.queryByText(questionRegExp)).not.toBeInTheDocument();
        expect(screen.queryByText(scoreRegExp)).not.toBeInTheDocument();
      });

      it('shows how many questions are left if still in progress', () => {
        makeQuizWrapper({ progress: { started: true, answer_count: 5 } });
        expect(
          screen.getByText(learnStrings.questionsLeft$({ questionsLeft: 5 })),
        ).toBeInTheDocument();
      });

      it('shows the percentage score if the quiz is submitted or closed', () => {
        makeQuizWrapper({
          progress: { started: true, answer_count: 10, closed: true, score: 7 },
        });
        expect(
          screen.getByText(learnStrings.completedPercentLabel$({ score: 70 })),
        ).toBeInTheDocument();
      });
    });
  });
});
