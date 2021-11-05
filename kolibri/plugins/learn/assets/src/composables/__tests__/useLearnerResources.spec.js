import cloneDeep from 'lodash/cloneDeep';

import { ContentNodeResource, ContentNodeProgressResource } from 'kolibri.resources';
import { PageNames, ClassesPageNames } from '../../constants';
import { LearnerClassroomResource } from '../../apiResources';
import useLearnerResources from '../useLearnerResources';

const {
  classes,
  activeClassesLessons,
  activeClassesQuizzes,
  resumableClassesQuizzes,
  resumableClassesResources,
  resumableNonClassesContentNodes,
  learnerFinishedAllClasses,
  getClass,
  getClassActiveLessons,
  getClassActiveQuizzes,
  getResumableContentNode,
  getClassLessonLink,
  getClassQuizLink,
  getClassResourceLink,
  getTopicContentNodeLink,
  fetchClasses,
  fetchResumableContentNodes,
} = useLearnerResources();

jest.mock('kolibri.resources');
jest.mock('../../apiResources');

const TEST_RESUMABLE_CONTENT_NODES = [
  // the following resources are used in classess
  { id: 'resource-1-in-progress', title: 'Resource 1 (In Progress)' },
  { id: 'resource-3-in-progress', title: 'Resource 3 (In Progress)' },
  { id: 'resource-5-in-progress', title: 'Resource 5 (In Progress)' },
  { id: 'resource-6-in-progress', title: 'Resource 6 (In Progress)' },
  { id: 'resource-8-in-progress', title: 'Resource 8 (In Progress)' },
  // the following resources are not used in classses
  { id: 'resource-9-in-progress', title: 'Resource 9 (In Progress)' },
  { id: 'resource-10-in-progress', title: 'Resource 10 (In Progress)' },
];

const TEST_CONTENT_NODES_PROGRESSES = [
  {
    id: 'resource-1-in-progress',
    progress_fraction: 0.2,
  },
  {
    id: 'resource-3-in-progress',
    progress_fraction: 0.74,
  },
  {
    id: 'resource-5-in-progress',
    progress_fraction: 0.04,
  },
  {
    id: 'resource-6-in-progress',
    progress_fraction: 0.1,
  },
  {
    id: 'resource-8-in-progress',
    progress_fraction: 0.9,
  },
  {
    id: 'resource-9-in-progress',
    progress_fraction: 0.87,
  },
  {
    id: 'resource-10-in-progress',
    progress_fraction: 0.02,
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
          is_active: true,
          collection: 'class-1',
          resources: [
            { contentnode_id: 'resource-1-in-progress' },
            { contentnode_id: 'resource-2' },
            { contentnode_id: 'resource-3-in-progress' },
          ],
          progress: {
            resource_progress: 0,
            total_resources: 3,
          },
        },
        {
          id: 'class-1-active-lesson-2',
          title: 'Class 1 - Active Lesson 2',
          is_active: true,
          collection: 'class-1',
          resources: [
            { contentnode_id: 'resource-1-in-progress' },
            { contentnode_id: 'resource-4' },
            { contentnode_id: 'resource-5-in-progress' },
          ],
          progress: {
            resource_progress: 1,
            total_resources: 3,
          },
        },
        {
          id: 'class-1-inactive-lesson',
          title: 'Class 1 - Inactive Lesson',
          is_active: false,
          collection: 'class-1',
          resources: [{ contentnode_id: 'resource-5-in-progress' }],
          progress: {
            resource_progress: 0,
            total_resources: 1,
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
          is_active: true,
          collection: 'class-2',
          resources: [
            { contentnode_id: 'resource-6-in-progress' },
            { contentnode_id: 'resource-2' },
            { contentnode_id: 'resource-1-in-progress' },
          ],
          progress: {
            resource_progress: 1,
            total_resources: 3,
          },
        },
        {
          id: 'class-2-inactive-lesson',
          title: 'Class 2 - Inactive Lesson',
          is_active: false,
          collection: 'class-2',
          resources: [
            { contentnode_id: 'resource-7' },
            { contentnode_id: 'resource-8-in-progress' },
          ],
          progress: {
            resource_progress: 0,
            total_resources: 2,
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

// A helper that takes an object with test classes
// and returns its copy with all lessons and quizzes
// changed to inactive
function inactivateClasses(classes) {
  const inactiveClasses = cloneDeep(classes);
  return inactiveClasses.map(c => {
    c.assignments.exams.forEach(quiz => {
      quiz.active = false;
    });
    c.assignments.lessons.forEach(lesson => {
      lesson.is_active = false;
    });
    return c;
  });
}

describe(`useLearnerResources`, () => {
  beforeEach(() => {
    ContentNodeResource.fetchResume.mockResolvedValue(TEST_RESUMABLE_CONTENT_NODES);
    ContentNodeProgressResource.fetchCollection.mockResolvedValue(TEST_CONTENT_NODES_PROGRESSES);
    fetchResumableContentNodes();

    LearnerClassroomResource.fetchCollection.mockResolvedValue(TEST_CLASSES);
    fetchClasses();
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
          is_active: true,
          collection: 'class-1',
          resources: [
            { contentnode_id: 'resource-1-in-progress' },
            { contentnode_id: 'resource-2' },
            { contentnode_id: 'resource-3-in-progress' },
          ],
          progress: {
            resource_progress: 0,
            total_resources: 3,
          },
        },
        {
          id: 'class-1-active-lesson-2',
          title: 'Class 1 - Active Lesson 2',
          is_active: true,
          collection: 'class-1',
          resources: [
            { contentnode_id: 'resource-1-in-progress' },
            { contentnode_id: 'resource-4' },
            { contentnode_id: 'resource-5-in-progress' },
          ],
          progress: {
            resource_progress: 1,
            total_resources: 3,
          },
        },
        {
          id: 'class-2-active-lesson-1',
          title: 'Class 2 - Active Lesson 1',
          is_active: true,
          collection: 'class-2',
          resources: [
            { contentnode_id: 'resource-6-in-progress' },
            { contentnode_id: 'resource-2' },
            { contentnode_id: 'resource-1-in-progress' },
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
    it(`returns an array of { contentNodeId, lessonId, classId} objects for all resources
      in progress from all learner's active lessons from all their classes`, () => {
      expect(resumableClassesResources.value).toEqual([
        {
          contentNodeId: 'resource-1-in-progress',
          lessonId: 'class-1-active-lesson-1',
          classId: 'class-1',
        },
        {
          contentNodeId: 'resource-3-in-progress',
          lessonId: 'class-1-active-lesson-1',
          classId: 'class-1',
        },
        {
          contentNodeId: 'resource-1-in-progress',
          lessonId: 'class-1-active-lesson-2',
          classId: 'class-1',
        },
        {
          contentNodeId: 'resource-5-in-progress',
          lessonId: 'class-1-active-lesson-2',
          classId: 'class-1',
        },
        {
          contentNodeId: 'resource-6-in-progress',
          lessonId: 'class-2-active-lesson-1',
          classId: 'class-2',
        },
        {
          contentNodeId: 'resource-1-in-progress',
          lessonId: 'class-2-active-lesson-1',
          classId: 'class-2',
        },
      ]);
    });
  });

  describe(`resumableNonClassesContentNodes`, () => {
    it(`returns an array of IDs of all content nodes that are
      in progress and don't belong to any of learner's classes`, () => {
      expect(resumableNonClassesContentNodes.value).toMatchObject([
        { id: 'resource-9-in-progress', title: 'Resource 9 (In Progress)' },
        { id: 'resource-10-in-progress', title: 'Resource 10 (In Progress)' },
      ]);
    });
  });

  describe(`learnerFinishedAllClasses`, () => {
    it(`returns 'true' if a learner has no classes`, () => {
      LearnerClassroomResource.fetchCollection.mockResolvedValue([]);
      fetchClasses().then(() => {
        expect(learnerFinishedAllClasses.value).toBe(true);
      });
    });

    it(`returns 'true' if a learner has no active lessons and quizzes`, () => {
      LearnerClassroomResource.fetchCollection.mockResolvedValue(inactivateClasses(TEST_CLASSES));
      fetchClasses().then(() => {
        expect(learnerFinishedAllClasses.value).toBe(true);
      });
    });

    it(`returns 'false' if a learner hasn't finished all lessons and quizzes yet`, () => {
      LearnerClassroomResource.fetchCollection.mockResolvedValue(TEST_CLASSES);
      fetchClasses().then(() => {
        expect(learnerFinishedAllClasses.value).toBe(false);
      });
    });

    it(`returns 'true' if a learner finished all lessons and quizzes`, () => {
      LearnerClassroomResource.fetchCollection.mockResolvedValue(finishClasses(TEST_CLASSES));
      fetchClasses().then(() => {
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
          is_active: true,
          collection: 'class-1',
          resources: [
            { contentnode_id: 'resource-1-in-progress' },
            { contentnode_id: 'resource-2' },
            { contentnode_id: 'resource-3-in-progress' },
          ],
          progress: {
            resource_progress: 0,
            total_resources: 3,
          },
        },
        {
          id: 'class-1-active-lesson-2',
          title: 'Class 1 - Active Lesson 2',
          is_active: true,
          collection: 'class-1',
          resources: [
            { contentnode_id: 'resource-1-in-progress' },
            { contentnode_id: 'resource-4' },
            { contentnode_id: 'resource-5-in-progress' },
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

  describe(`getResumableContentNode`, () => {
    it(`returns a resumable content node object by its ID`, () => {
      expect(getResumableContentNode('resource-6-in-progress')).toMatchObject({
        id: 'resource-6-in-progress',
        title: 'Resource 6 (In Progress)',
      });
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
        })
      ).toEqual({
        name: ClassesPageNames.EXAM_REPORT_VIEWER,
        params: {
          classId: 'class-1',
          examId: 'class-1-active-finished-quiz',
          questionNumber: 0,
          questionInteraction: 0,
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
        })
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
        })
      ).toEqual({
        name: ClassesPageNames.LESSON_PLAYLIST,
        params: {
          classId: 'class-1',
          lessonId: 'class-1-active-lesson-1',
        },
      });
    });
  });

  describe(`getClassResourceLink`, () => {
    it(`returns a vue-router link to a class resource page`, () => {
      expect(
        getClassResourceLink({
          contentNodeId: 'resource-1-in-progress',
          lessonId: 'class-2-active-lesson-1',
          classId: 'class-2',
        })
      ).toEqual({
        name: PageNames.TOPICS_CONTENT,
        params: {
          id: 'resource-1-in-progress',
        },
        query: {
          classId: 'class-2',
          lessonId: 'class-2-active-lesson-1',
        },
      });
    });
  });

  describe(`getTopicContentNodeLink`, () => {
    it(`returns a vue-router link to a topic content node page`, () => {
      expect(getTopicContentNodeLink('resource-9-in-progress')).toEqual({
        name: PageNames.TOPICS_CONTENT,
        params: {
          id: 'resource-9-in-progress',
        },
      });
    });
  });
});
