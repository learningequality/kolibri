import { NotificationObjects } from '../../../constants/notificationsConstants';
import { updateWithNotifications } from '../actions';

const { QUIZ, RESOURCE } = NotificationObjects;

describe('classSummary/actions', () => {
  describe('updateWithNotifications', () => {
    it('commits quiz notifications updates in a correct order (sorted by their datetime)', () => {
      const state = {
        learnerMap: { 'user-id': {} },
        examMap: { 'quiz-id': {} },
        contentNodeMap: {},
        lessonMap: {},
      };
      const commit = jest.fn();
      const dispatch = jest.fn();

      const quizNotifications = [
        {
          id: 1,
          user_id: 'user-id',
          object: QUIZ,
          event: 'Completed',
          timestamp: '2023-10-05T13:35:00+02:00',
          quiz_num_correct: 1,
          quiz_num_answered: 2,
          quiz_id: 'quiz-id',
        },
        {
          id: 2,
          user_id: 'user-id',
          object: QUIZ,
          event: 'Started',
          timestamp: '2023-10-05T13:30:00+02:00',
          quiz_num_correct: 2,
          quiz_num_answered: 3,
          quiz_id: 'quiz-id',
        },
      ];

      updateWithNotifications({ state, commit, dispatch }, quizNotifications);

      expect(commit).toHaveBeenCalledTimes(1);
      expect(commit.mock.calls[0][0]).toBe('APPLY_NOTIFICATION_UPDATES');
      expect(commit.mock.calls[0][1].examLearnerStatusMapUpdates).toEqual([
        {
          learner_id: 'user-id',
          status: 'Started',
          last_activity: new Date('2023-10-05T11:30:00.000Z'),
          num_correct: 2,
          num_answered: 3,
          exam_id: 'quiz-id',
        },
        {
          learner_id: 'user-id',
          status: 'Completed',
          last_activity: new Date('2023-10-05T11:35:00.000Z'),
          num_correct: 1,
          num_answered: 2,
          exam_id: 'quiz-id',
        },
      ]);
    });

    it('reloads the class summary when a quiz notification is missing from the exam map', () => {
      const state = {
        learnerMap: { 'user-id': {} },
        examMap: {},
        contentNodeMap: {},
        lessonMap: {},
        id: 'class-id',
      };
      const commit = jest.fn();
      const dispatch = jest.fn();

      updateWithNotifications({ state, commit, dispatch }, [
        {
          id: 1,
          user_id: 'user-id',
          object: QUIZ,
          event: 'Completed',
          timestamp: '2023-10-05T13:35:00+02:00',
          quiz_id: 'quiz-id',
        },
      ]);

      expect(dispatch).toHaveBeenCalledWith('loadClassSummary', 'class-id');
    });

    it('neither reloads nor applies any update for course notifications', () => {
      const state = {
        learnerMap: { 'user-id': {} },
        examMap: {},
        contentNodeMap: {},
        lessonMap: {},
      };
      const commit = jest.fn();
      const dispatch = jest.fn();

      updateWithNotifications({ state, commit, dispatch }, [
        {
          id: 1,
          user_id: 'user-id',
          object: QUIZ,
          event: 'Completed',
          timestamp: '2023-10-05T13:35:00+02:00',
          quiz_id: 'synthetic-quiz-id',
          course_session_id: 'course-session-id',
        },
        {
          id: 2,
          user_id: 'user-id',
          object: RESOURCE,
          event: 'Completed',
          timestamp: '2023-10-05T13:36:00+02:00',
          contentnode_id: 'course-resource-node-id',
          lesson_id: 'course-lesson-node-id',
          course_session_id: 'course-session-id',
        },
      ]);

      expect(dispatch).not.toHaveBeenCalled();
      expect(commit).not.toHaveBeenCalled();
    });

    it('reloads the class summary when a course notification has an unknown learner', () => {
      const state = {
        learnerMap: {},
        examMap: {},
        contentNodeMap: {},
        lessonMap: {},
        id: 'class-id',
      };
      const commit = jest.fn();
      const dispatch = jest.fn();

      updateWithNotifications({ state, commit, dispatch }, [
        {
          id: 1,
          user_id: 'unknown-user-id',
          object: QUIZ,
          event: 'Completed',
          timestamp: '2023-10-05T13:35:00+02:00',
          quiz_id: 'synthetic-quiz-id',
          course_session_id: 'course-session-id',
        },
      ]);

      expect(dispatch).toHaveBeenCalledWith('loadClassSummary', 'class-id');
    });
  });
});
