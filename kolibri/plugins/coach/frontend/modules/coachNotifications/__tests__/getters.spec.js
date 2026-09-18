import { ContentNodeKinds } from 'kolibri/constants';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import { allNotifications } from '../getters';
import { NotificationEvents, NotificationObjects } from '../../../constants/notificationsConstants';
import { TestType } from '../../../constants/courseConstants';

const { preTestItemLabel$, postTestItemLabel$, preTestLabel$ } = coursesStrings;

const LEARNER_ID = 'learner_1';
const COURSE_SESSION_ID = 'course_session_1';
const CLASSROOM_ID = 'classroom_1';
const UNIT_QUIZ_ID = 'synthetic_quiz_id';
const LESSON_NODE_ID = 'lesson_node_1';
const RESOURCE_NODE_ID = 'resource_node_1';

function makeClassSummary(overrides = {}) {
  return {
    adHocGroupsMap: {},
    learners: { [LEARNER_ID]: { id: LEARNER_ID, name: 'Aditi' } },
    learnerGroups: {},
    lessons: {},
    exams: {},
    contentNodes: {},
    classId: CLASSROOM_ID,
    className: 'Class A',
    ...overrides,
  };
}

function makeNotification(overrides = {}) {
  return {
    id: '1',
    user_id: LEARNER_ID,
    object: NotificationObjects.QUIZ,
    event: NotificationEvents.COMPLETED,
    timestamp: '2026-09-18 01:29:04.016364',
    assignment_collections: [],
    classroom_id: CLASSROOM_ID,
    course_session_id: null,
    contentnode_id: null,
    lesson_id: null,
    quiz_id: null,
    title: null,
    kind: null,
    lesson_title: null,
    test_type: null,
    ...overrides,
  };
}

function makeCourseNotification(overrides = {}) {
  return makeNotification({ course_session_id: COURSE_SESSION_ID, ...overrides });
}

function getNotifications(notifications, classSummary = makeClassSummary()) {
  return allNotifications(
    { notifications },
    {},
    {},
    {
      'classSummary/notificationModuleData': classSummary,
    },
  );
}

describe('coachNotifications allNotifications getter', () => {
  describe('course notifications', () => {
    it('names a pre-test by its unit title', () => {
      const result = getNotifications([
        makeCourseNotification({
          quiz_id: UNIT_QUIZ_ID,
          title: 'Fractions',
          test_type: TestType.PRE,
        }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].assignment).toEqual({
        name: preTestItemLabel$({ unitTitle: 'Fractions' }),
        type: ContentNodeKinds.EXAM,
        id: UNIT_QUIZ_ID,
      });
    });

    it('names a post-test by its unit title', () => {
      const result = getNotifications([
        makeCourseNotification({
          quiz_id: UNIT_QUIZ_ID,
          title: 'Fractions',
          test_type: TestType.POST,
        }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].assignment.name).toEqual(postTestItemLabel$({ unitTitle: 'Fractions' }));
    });

    it('falls back to the bare test label when the unit node is gone', () => {
      const result = getNotifications([
        makeCourseNotification({ quiz_id: UNIT_QUIZ_ID, title: null, test_type: TestType.PRE }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].assignment.name).toEqual(preTestLabel$());
    });

    it('drops a quiz whose test assignment no longer exists', () => {
      const result = getNotifications([
        makeCourseNotification({ quiz_id: UNIT_QUIZ_ID, title: null, test_type: null }),
      ]);
      expect(result).toEqual([]);
    });

    it('leaves a quiz without a resource, so its unit does not enter the resource filter', () => {
      // ActivityList builds its resource-kind filter from every notification's resource.type.
      const result = getNotifications([
        makeCourseNotification({
          quiz_id: UNIT_QUIZ_ID,
          title: 'Fractions',
          kind: ContentNodeKinds.TOPIC,
          test_type: TestType.PRE,
        }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].resource.type).toEqual('');
      expect(result[0].resource.name).toEqual('');
    });

    it('names a resource and its lesson from the notification', () => {
      const result = getNotifications([
        makeCourseNotification({
          object: NotificationObjects.RESOURCE,
          contentnode_id: RESOURCE_NODE_ID,
          lesson_id: LESSON_NODE_ID,
          title: 'Adding fractions',
          kind: ContentNodeKinds.VIDEO,
          lesson_title: 'Lesson 1',
        }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].resource.name).toEqual('Adding fractions');
      expect(result[0].resource.type).toEqual(ContentNodeKinds.VIDEO);
      expect(result[0].assignment.name).toEqual('Lesson 1');
    });

    it('gives a resource whose node is gone an empty type rather than a null one', () => {
      // NotificationCard and ActivityList both read resource.type.length unguarded.
      const result = getNotifications([
        makeCourseNotification({
          object: NotificationObjects.RESOURCE,
          contentnode_id: RESOURCE_NODE_ID,
          lesson_id: LESSON_NODE_ID,
          lesson_title: 'Lesson 1',
        }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].resource.type).toEqual('');
      expect(result[0].resource.name).toEqual('');
    });

    it('drops a lesson whose lesson node is gone', () => {
      const result = getNotifications([
        makeCourseNotification({
          object: NotificationObjects.LESSON,
          lesson_id: LESSON_NODE_ID,
          lesson_title: null,
        }),
      ]);
      expect(result).toEqual([]);
    });

    it('drops a notification for an unknown learner', () => {
      const result = getNotifications([
        makeCourseNotification({
          user_id: 'stranger',
          quiz_id: UNIT_QUIZ_ID,
          test_type: TestType.PRE,
        }),
      ]);
      expect(result).toEqual([]);
    });
  });

  describe('classic notifications', () => {
    it('names a quiz from the class summary', () => {
      const result = getNotifications(
        [makeNotification({ quiz_id: 'quiz_1' })],
        makeClassSummary({ exams: { quiz_1: { id: 'quiz_1', title: 'Midterm' } } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].assignment).toEqual({
        name: 'Midterm',
        type: ContentNodeKinds.EXAM,
        id: 'quiz_1',
      });
    });

    it('drops a quiz and a lesson that the class summary does not know', () => {
      const result = getNotifications([
        makeNotification({ quiz_id: 'quiz_1' }),
        makeNotification({ id: '2', object: NotificationObjects.LESSON, lesson_id: 'lesson_1' }),
      ]);
      expect(result).toEqual([]);
    });
  });
});
