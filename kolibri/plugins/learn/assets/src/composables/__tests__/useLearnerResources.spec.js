import cloneDeep from 'lodash/cloneDeep';

import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { ClassesPageNames } from '../../constants';
import { LearnerClassroomResource } from '../../apiResources';
import useLearnerResources from '../useLearnerResources';

const {
  classes,
  activeClassesLessons,
  activeClassesQuizzes,
  resumableClassesQuizzes,
  resumableClassesResources,
  resumableContentNodes,
  moreResumableContentNodes,
  learnerFinishedAllClasses,
  getClass,
  getClassActiveLessons,
  getClassActiveQuizzes,
  getClassLessonLink,
  getClassQuizLink,
  fetchClasses,
  fetchResumableContentNodes,
} = useLearnerResources();

jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('../../apiResources');
jest.mock('../useContentNodeProgress');

const TEST_RESUMABLE_CONTENT_NODES = [
  // the following resources are used in classess
  {
    id: 'resource-1-in-progress',
    title: 'Resource 1 (In Progress)',
    content_id: 'resource-1-in-progress',
  },
  {
    id: 'resource-3-in-progress',
    title: 'Resource 3 (In Progress)',
    content_id: 'resource-3-in-progress',
  },
  {
    id: 'resource-5-in-progress',
    title: 'Resource 5 (In Progress)',
    content_id: 'resource-5-in-progress',
  },
  {
    id: 'resource-6-in-progress',
    title: 'Resource 6 (In Progress)',
    content_id: 'resource-6-in-progress',
  },
  {
    id: 'resource-8-in-progress',
    title: 'Resource 8 (In Progress)',
    content_id: 'resource-8-in-progress',
  },
  // the following resources are not used in classses
  {
    id: 'resource-9-in-progress',
    title: 'Resource 9 (In Progress)',
    content_id: 'resource-9-in-progress',
  },
  {
    id: 'resource-10-in-progress',
    title: 'Resource 10 (In Progress)',
    content_id: 'resource-10-in-progress',
  },
];

const TEST_CLASSES = [
  {
    id: 'class-1',
    name: 'Class 1',
    assignments: {
      exams: [
        {
          id: 'class-1-active-quiz-in-progress',
          title: 'Class 1 - Active Quiz In Progress',
          active: true,
          collection: 'class-1',
          progress: {
            started: true,
            closed: false,
          },
        },
        {
          id: 'class-1-inactive-quiz-in-progress',
          title: 'Class 1 - Inactive Quiz In Progress',
          active: false,
          collection: 'class-1',
          progress: {
            started: true,
            closed: false,
          },
        },
        {
          id: 'class-1-active-finished-quiz',
          title: 'Class 1 - Active Finished Quiz',
          active: true,
          collection: 'class-1',
          progress: {
            started: true,
            closed: true,
          },
        },
      ],
      lessons: [
        {
          id: 'class-1-active-lesson-1',
          title: 'Class 1 - Active Lesson 1',
          active: true,
          collection: 'class-1',
          resources: [
            {
              contentnode_id: 'resource-1-in-progress',
              progress: 0.2,
              contentnode: { id: 'resource-1' },
            },
            { contentnode_id: 'resource-2', progress: 0, contentnode: { id: 'resource-2' } },
            {
              contentnode_id: 'resource-3-in-progress',
              progress: 0.74,
              contentnode: { id: 'resource-3' },
            },
          ],
          progress: {
            resource_progress: 0,
            total_resources: 3,
          },
        },
        {
          id: 'class-1-active-lesson-2',
          title: 'Class 1 - Active Lesson 2',
          active: true,
          collection: 'class-1',
          resources: [
            {
              contentnode_id: 'resource-1-in-progress',
              progress: 0.2,
              contentnode: { id: 'resource-1' },
            },
            { contentnode_id: 'resource-4', progress: 0, contentnode: { id: 'resource-4' } },
            {
              contentnode_id: 'resource-5-in-progress',
              progress: 0.04,
              contentnode: { id: 'resource-5' },
            },
          ],
          progress: {
            resource_progress: 1,
            total_resources: 3,
          },
        },
      ],
    },
  },
  {
    id: 'class-2',
    name: 'Class 2',
    assignments: {
      exams: [
        {
          id: 'class-2-active-quiz-in-progress',
          title: 'Class 2 - Active Quiz In Progress',
          active: true,
          collection: 'class-2',
          progress: {
            started: true,
            closed: false,
          },
        },
        {
          id: 'class-2-active-quiz-not-started',
          title: 'Class 2 - Active Quiz Not Started',
          active: true,
          collection: 'class-2',
          progress: {
            closed: false,
            started: false,
          },
        },
      ],
      lessons: [
        {
          id: 'class-2-active-lesson-1',
          title: 'Class 2 - Active Lesson 1',
          active: true,
          collection: 'class-2',
          resources: [
            {
              contentnode_id: 'resource-6-in-progress',
              progress: 0.1,
              contentnode: { id: 'resource-6' },
            },
            { contentnode_id: 'resource-2', progress: 0, contentnode: { id: 'resource-2' } },
            {
              contentnode_id: 'resource-1-in-progress',
              progress: 0.2,
              contentnode: { id: 'resource-1' },
            },
          ],
          progress: {
            resource_progress: 1,
            total_resources: 3,
          },
        },
      ],
    },
  },
];

// A helper that takes an object with test classes
// and returns its copy with all lessons and quizzes
// progress changed to complete
function finishClasses(classes) {
  const finishedClasses = cloneDeep(classes);
  return finishedClasses.map(c => {
    c.assignments.exams.forEach(quiz => {
      quiz.progress.closed = true;
    });
    c.assignments.lessons.forEach(lesson => {
      lesson.progress.resource_progress = lesson.progress.total_resources;
    });
    return c;
  });
}

describe(`useLearnerResources`, () => {
  beforeEach(() => {
    LearnerClassroomResource.fetchCollection.mockResolvedValue(TEST_CLASSES);
    return fetchClasses();
  });

  describe(`classes`, () => {
    it(`returns fetched classes`, () => {
      expect(classes.value).toEqual(TEST_CLASSES);
    });
  });

  describe(`activeClassesLessons`, () => {
    it(`returns all active lessons assigned to a learner in all their classes`, () => {
      expect(activeClassesLessons.value).toEqual([
        {
          id: 'class-1-active-lesson-1',
          title: 'Class 1 - Active Lesson 1',
          active: true,
          collection: 'class-1',
          resources: [
            {
              contentnode_id: 'resource-1-in-progress',
              progress: 0.2,
              contentnode: { id: 'resource-1' },
            },
            { contentnode_id: 'resource-2', progress: 0, contentnode: { id: 'resource-2' } },
            {
              contentnode_id: 'resource-3-in-progress',
              progress: 0.74,
              contentnode: { id: 'resource-3' },
            },
          ],
          progress: {
            resource_progress: 0,
            total_resources: 3,
          },
        },
        {
          id: 'class-1-active-lesson-2',
          title: 'Class 1 - Active Lesson 2',
          active: true,
          collection: 'class-1',
          resources: [
            {
              contentnode_id: 'resource-1-in-progress',
              progress: 0.2,
              contentnode: { id: 'resource-1' },
            },
            { contentnode_id: 'resource-4', progress: 0, contentnode: { id: 'resource-4' } },
            {
              contentnode_id: 'resource-5-in-progress',
              progress: 0.04,
              contentnode: { id: 'resource-5' },
            },
          ],
          progress: {
            resource_progress: 1,
            total_resources: 3,
          },
        },
        {
          id: 'class-2-active-lesson-1',
          title: 'Class 2 - Active Lesson 1',
          active: true,
          collection: 'class-2',
          resources: [
            {
              contentnode_id: 'resource-6-in-progress',
              progress: 0.1,
              contentnode: { id: 'resource-6' },
            },
            { contentnode_id: 'resource-2', progress: 0, contentnode: { id: 'resource-2' } },
            {
              contentnode_id: 'resource-1-in-progress',
              progress: 0.2,
              contentnode: { id: 'resource-1' },
            },
          ],
          progress: {
            resource_progress: 1,
            total_resources: 3,
          },
        },
      ]);
    });
  });

  describe(`activeClassesQuizzes`, () => {
    it(`returns all active quizzes assigned to a learner in all their classes`, () => {
      expect(activeClassesQuizzes.value).toEqual([
        {
          id: 'class-1-active-quiz-in-progress',
          title: 'Class 1 - Active Quiz In Progress',
          active: true,
          collection: 'class-1',
          progress: {
            started: true,
            closed: false,
          },
        },
        {
          id: 'class-1-active-finished-quiz',
          title: 'Class 1 - Active Finished Quiz',
          active: true,
          collection: 'class-1',
          progress: {
            started: true,
            closed: true,
          },
        },
        {
          id: 'class-2-active-quiz-in-progress',
          title: 'Class 2 - Active Quiz In Progress',
          active: true,
          collection: 'class-2',
          progress: {
            started: true,
            closed: false,
          },
        },
        {
          id: 'class-2-active-quiz-not-started',
          title: 'Class 2 - Active Quiz Not Started',
          active: true,
          collection: 'class-2',
          progress: {
            closed: false,
            started: false,
          },
        },
      ]);
    });
  });

  describe(`resumableClassesQuizzes`, () => {
    it(`returns an array of all active quizzes in progress from all learner's classes`, () => {
      expect(resumableClassesQuizzes.value).toEqual([
        {
          id: 'class-1-active-quiz-in-progress',
          title: 'Class 1 - Active Quiz In Progress',
          active: true,
          collection: 'class-1',
          progress: {
            started: true,
            closed: false,
          },
        },
        {
          id: 'class-2-active-quiz-in-progress',
          title: 'Class 2 - Active Quiz In Progress',
          active: true,
          collection: 'class-2',
          progress: {
            started: true,
            closed: false,
          },
        },
      ]);
    });
  });

  describe(`resumableClassesResources`, () => {
    it(`returns an array of { contentNodeId, lessonId, classId, contentNode } objects for all resources
      in progress from all learner's active lessons from all their classes`, () => {
      expect(resumableClassesResources.value).toEqual([
        {
          classId: 'class-1',
          contentNode: {
            id: 'resource-1',
          },
          contentNodeId: 'resource-1-in-progress',
          lessonId: 'class-1-active-lesson-1',
          progress: 0.2,
        },
        {
          classId: 'class-1',
          contentNode: {
            id: 'resource-3',
          },
          contentNodeId: 'resource-3-in-progress',
          lessonId: 'class-1-active-lesson-1',
          progress: 0.74,
        },
        {
          classId: 'class-1',
          contentNode: {
            id: 'resource-1',
          },
          contentNodeId: 'resource-1-in-progress',
          lessonId: 'class-1-active-lesson-2',
          progress: 0.2,
        },
        {
          classId: 'class-1',
          contentNode: {
            id: 'resource-5',
          },
          contentNodeId: 'resource-5-in-progress',
          lessonId: 'class-1-active-lesson-2',
          progress: 0.04,
        },
        {
          classId: 'class-2',
          contentNode: {
            id: 'resource-6',
          },
          contentNodeId: 'resource-6-in-progress',
          lessonId: 'class-2-active-lesson-1',
          progress: 0.1,
        },
        {
          classId: 'class-2',
          contentNode: {
            id: 'resource-1',
          },
          contentNodeId: 'resource-1-in-progress',
          lessonId: 'class-2-active-lesson-1',
          progress: 0.2,
        },
      ]);
    });
  });

  describe(`learnerFinishedAllClasses`, () => {
    it(`returns 'true' if a learner has no classes`, () => {
      LearnerClassroomResource.fetchCollection.mockResolvedValue([]);
      return fetchClasses().then(() => {
        expect(learnerFinishedAllClasses.value).toBe(true);
      });
    });

    it(`returns 'false' if a learner hasn't finished all lessons and quizzes yet`, () => {
      LearnerClassroomResource.fetchCollection.mockResolvedValue(TEST_CLASSES);
      return fetchClasses().then(() => {
        expect(learnerFinishedAllClasses.value).toBe(false);
      });
    });

    it(`returns 'true' if a learner finished all lessons and quizzes`, () => {
      LearnerClassroomResource.fetchCollection.mockResolvedValue(finishClasses(TEST_CLASSES));
      return fetchClasses().then(() => {
        expect(learnerFinishedAllClasses.value).toBe(true);
      });
    });
  });

  describe(`getClass`, () => {
    it(`returns a class`, () => {
      expect(getClass('class-2')).toEqual(TEST_CLASSES[1]);
    });
  });

  describe(`getClassActiveLessons`, () => {
    it(`returns all active lessons from a class`, () => {
      expect(getClassActiveLessons('class-1')).toEqual([
        {
          id: 'class-1-active-lesson-1',
          title: 'Class 1 - Active Lesson 1',
          active: true,
          collection: 'class-1',
          resources: [
            {
              contentnode_id: 'resource-1-in-progress',
              progress: 0.2,
              contentnode: { id: 'resource-1' },
            },
            { contentnode_id: 'resource-2', progress: 0, contentnode: { id: 'resource-2' } },
            {
              contentnode_id: 'resource-3-in-progress',
              progress: 0.74,
              contentnode: { id: 'resource-3' },
            },
          ],
          progress: {
            resource_progress: 0,
            total_resources: 3,
          },
        },
        {
          id: 'class-1-active-lesson-2',
          title: 'Class 1 - Active Lesson 2',
          active: true,
          collection: 'class-1',
          resources: [
            {
              contentnode_id: 'resource-1-in-progress',
              progress: 0.2,
              contentnode: { id: 'resource-1' },
            },
            { contentnode_id: 'resource-4', progress: 0, contentnode: { id: 'resource-4' } },
            {
              contentnode_id: 'resource-5-in-progress',
              progress: 0.04,
              contentnode: { id: 'resource-5' },
            },
          ],
          progress: {
            resource_progress: 1,
            total_resources: 3,
          },
        },
      ]);
    });
  });

  describe(`getClassActiveQuizzes`, () => {
    it(`returns all active quizzes from a class`, () => {
      expect(getClassActiveQuizzes('class-1')).toEqual([
        {
          id: 'class-1-active-quiz-in-progress',
          title: 'Class 1 - Active Quiz In Progress',
          active: true,
          collection: 'class-1',
          progress: {
            started: true,
            closed: false,
          },
        },
        {
          id: 'class-1-active-finished-quiz',
          title: 'Class 1 - Active Finished Quiz',
          active: true,
          collection: 'class-1',
          progress: {
            started: true,
            closed: true,
          },
        },
      ]);
    });
  });

  describe(`getClassQuizLink`, () => {
    it(`returns a vue-router link to a quiz report page when the quiz is closed`, () => {
      expect(
        getClassQuizLink({
          id: 'class-1-active-finished-quiz',
          collection: 'class-1',
          progress: {
            started: true,
            closed: true,
          },
        }),
      ).toEqual({
        name: ClassesPageNames.EXAM_REPORT_VIEWER,
        params: {
          classId: 'class-1',
          examId: 'class-1-active-finished-quiz',
          questionNumber: 0,
          questionInteraction: 0,
          tryIndex: 0,
        },
      });
    });

    it(`returns a vue-router link to a quiz page when the quiz is not closed`, () => {
      expect(
        getClassQuizLink({
          id: 'class-1-active-quiz-in-progress',
          collection: 'class-1',
          progress: {
            started: true,
            closed: false,
          },
        }),
      ).toEqual({
        name: ClassesPageNames.EXAM_VIEWER,
        params: {
          classId: 'class-1',
          examId: 'class-1-active-quiz-in-progress',
          questionNumber: 0,
        },
      });
    });
  });

  describe(`getClassLessonLink`, () => {
    it(`returns a vue-router link to a class lesson page`, () => {
      expect(
        getClassLessonLink({
          id: 'class-1-active-lesson-1',
          collection: 'class-1',
        }),
      ).toEqual({
        name: ClassesPageNames.LESSON_PLAYLIST,
        params: {
          classId: 'class-1',
          lessonId: 'class-1-active-lesson-1',
        },
      });
    });
  });

  describe('fetchResumableContentNodes', () => {
    it('should set resumable content nodes and the more value', async () => {
      const more = { test: 1 };
      ContentNodeResource.fetchResume = jest
        .fn()
        .mockResolvedValue({ results: TEST_RESUMABLE_CONTENT_NODES, more });
      await fetchResumableContentNodes();
      expect(resumableContentNodes.value).toEqual(TEST_RESUMABLE_CONTENT_NODES);
      expect(moreResumableContentNodes.value).toEqual(more);
    });
  });
});
