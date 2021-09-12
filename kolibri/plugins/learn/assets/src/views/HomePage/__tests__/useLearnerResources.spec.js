import { ContentNodeResource } from 'kolibri.resources';

import { PageNames, ClassesPageNames } from '../../../constants';
import { LearnerClassroomResource } from '../../../apiResources';
import useLearnerResources from '../useLearnerResources';

const {
  classes,
  resumableClassesQuizzes,
  resumableClassesResources,
  resumableNonClassesContentNodes,
  getClass,
  getResumableContentNode,
  getClassLessonLink,
  getClassQuizLink,
  getClassResourceLink,
  getTopicContentNodeLink,
  fetchClasses,
  fetchResumableContentNodes,
} = useLearnerResources();

jest.mock('kolibri.resources');
jest.mock('../../../apiResources');

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
        },
        {
          id: 'class-1-inactive-lesson',
          title: 'Class 1 - Inactive Lesson',
          is_active: false,
          collection: 'class-1',
          resources: [{ contentnode_id: 'resource-5-in-progress' }],
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
        },
      ],
    },
  },
];

describe(`useLearnerResources`, () => {
  beforeAll(() => {
    ContentNodeResource.fetchResume.mockResolvedValue(TEST_RESUMABLE_CONTENT_NODES);
    fetchResumableContentNodes();

    LearnerClassroomResource.fetchCollection.mockResolvedValue(TEST_CLASSES);
    fetchClasses();
  });

  describe(`classes`, () => {
    it(`returns fetched classes`, () => {
      expect(classes.value).toEqual(TEST_CLASSES);
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
      expect(resumableNonClassesContentNodes.value).toEqual([
        { id: 'resource-9-in-progress', title: 'Resource 9 (In Progress)' },
        { id: 'resource-10-in-progress', title: 'Resource 10 (In Progress)' },
      ]);
    });
  });

  describe(`getClass`, () => {
    it(`returns a class`, () => {
      expect(getClass('class-2')).toEqual(TEST_CLASSES[1]);
    });
  });

  describe(`getResumableContentNode`, () => {
    it(`returns a resumable content node object by its ID`, () => {
      expect(getResumableContentNode('resource-6-in-progress')).toEqual({
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
        name: ClassesPageNames.LESSON_RESOURCE_VIEWER,
        params: {
          classId: 'class-2',
          lessonId: 'class-2-active-lesson-1',
          resourceNumber: 2,
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
