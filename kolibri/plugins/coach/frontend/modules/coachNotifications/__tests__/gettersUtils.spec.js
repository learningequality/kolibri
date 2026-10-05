import { notificationLink } from '../gettersUtils';
import { CollectionTypes } from '../../../constants/lessonsConstants';
import { NotificationEvents, NotificationObjects } from '../../../constants/notificationsConstants';
import { PageNames } from '../../../constants';

const CLASSROOM_ID = 'classroom_1';
const GROUP_ID = 'learner_group_1';
const COURSE_SESSION_ID = 'course_session_1';

function makeNotification(overrides = {}) {
  return {
    object: NotificationObjects.LESSON,
    event: NotificationEvents.COMPLETED,
    classroom_id: CLASSROOM_ID,
    course_session_id: null,
    assignment: { id: 'assignment_1', type: 'lesson' },
    resource: { type: 'lesson', content_id: 'content_1' },
    collection: { id: CLASSROOM_ID, type: CollectionTypes.CLASSROOM },
    learnerSummary: { firstUserId: 'learner_1', total: 1, completesCollection: false },
    ...overrides,
  };
}

describe('notificationLink', () => {
  it('routes a group-assigned course notification to the course using the classroom id', () => {
    const link = notificationLink(
      makeNotification({
        object: NotificationObjects.QUIZ,
        course_session_id: COURSE_SESSION_ID,
        collection: { id: GROUP_ID, type: CollectionTypes.LEARNERGROUP },
      }),
    );
    expect(link).toEqual({
      name: PageNames.COURSE_SUMMARY,
      params: { classId: CLASSROOM_ID, courseSessionId: COURSE_SESSION_ID },
    });
  });

  it('routes a single-learner lesson notification to the learner lesson report', () => {
    const link = notificationLink(makeNotification());
    expect(link.name).toEqual(PageNames.LEARNER_LESSON_REPORT);
    expect(link.params.learnerId).toEqual('learner_1');
  });

  it('routes a multi-learner group quiz notification to the group quiz summary', () => {
    const link = notificationLink(
      makeNotification({
        object: NotificationObjects.QUIZ,
        collection: { id: GROUP_ID, type: CollectionTypes.LEARNERGROUP },
        learnerSummary: { firstUserId: 'learner_1', total: 2, completesCollection: false },
      }),
    );
    expect(link.name).toEqual(PageNames.GROUP_EXAM_SUMMARY);
    expect(link.params.groupId).toEqual(GROUP_ID);
  });
});
