import { NotificationObjects } from '../../../constants/notificationsConstants';
import { updateWithNotifications } from '../actions';

const { QUIZ } = NotificationObjects;

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
  });
});
