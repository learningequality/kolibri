import store, { _itemMap, _statusMap } from '../index';
import { STATUSES } from '../constants';
import sampleServerResponse from './sampleServerResponse';
import expectedState from './sampleState';

describe('coach summary module', () => {
  it('sets expected data given an API response', () => {
    store.mutations.SET_STATE(store.state, sampleServerResponse);

    expect(store.state).toEqual(expectedState);
  });
  describe('SET_STATE: picture_password_settings', () => {
    it('maps null picture_password_settings from the API response', () => {
      const state = store.state;
      store.mutations.SET_STATE(state, {
        ...sampleServerResponse,
        picture_password_settings: null,
      });
      expect(state.picture_password_settings).toBeNull();
    });

    it('maps a non-null picture_password_settings from the API response', () => {
      const settings = { icon_style: 'colorful', show_icon_text: true };
      const state = store.state;
      store.mutations.SET_STATE(state, {
        ...sampleServerResponse,
        picture_password_settings: settings,
      });
      expect(state.picture_password_settings).toEqual(settings);
    });
  });

  describe('SET_STATE: learner picture_password', () => {
    it('includes picture_password in learnerMap entries', () => {
      const state = store.state;
      const [firstLearner, secondLearner] = sampleServerResponse.learners;
      store.mutations.SET_STATE(state, {
        ...sampleServerResponse,
        learners: [
          { ...firstLearner, picture_password: '3.7.12' },
          { ...secondLearner, picture_password: null },
        ],
      });
      expect(state.learnerMap[firstLearner.id].picture_password).toBe('3.7.12');
      expect(state.learnerMap[secondLearner.id].picture_password).toBeNull();
    });
  });

  it('_itemMap behaves as expected', () => {
    const input = [
      {
        foo: 'test1',
        bar: 'test2',
      },
      {
        foo: 'test3',
        bar: 'test4',
      },
    ];
    const output = {
      test1: { bar: 'test2', foo: 'test1' },
      test3: { bar: 'test4', foo: 'test3' },
    };
    expect(_itemMap(input, 'foo')).toEqual(output);
  });
  it('_statusMap behaves as expected', () => {
    const statuses = [
      {
        learner_id: 'learner_1',
        content_id: 'content_1',
        status: 'Completed',
        last_activity: '2019-01-24 22:41:29.288000+00:00',
      },
      {
        learner_id: 'learner_1',
        content_id: 'content_2',
        status: 'Completed',
        last_activity: '2019-01-24 22:43:15.790000+00:00',
      },
      {
        learner_id: 'learner_2',
        content_id: 'content_1',
        status: 'NotStarted',
        last_activity: '2019-01-24 22:43:37.786000+00:00',
      },
    ];
    const output = {
      content_1: {
        learner_1: {
          content_id: 'content_1',
          last_activity: '2019-01-24 22:41:29.288000+00:00',
          learner_id: 'learner_1',
          status: 'Completed',
        },
        learner_2: {
          content_id: 'content_1',
          last_activity: '2019-01-24 22:43:37.786000+00:00',
          learner_id: 'learner_2',
          status: 'NotStarted',
        },
      },
      content_2: {
        learner_1: {
          content_id: 'content_2',
          last_activity: '2019-01-24 22:43:15.790000+00:00',
          learner_id: 'learner_1',
          status: 'Completed',
        },
      },
    };
    expect(_statusMap(statuses, 'content_id')).toEqual(output);
  });

  describe('APPLY_NOTIFICATION_UPDATES', () => {
    it('does not overwrite a completed content status with a lesser status', () => {
      const state = {
        contentLearnerStatusMap: {
          content_1: {
            learner_1: {
              content_id: 'content_1',
              learner_id: 'learner_1',
              status: STATUSES.completed,
              last_activity: new Date('2023-10-05T10:00:00Z'),
              time_spent: 100,
            },
          },
        },
        examLearnerStatusMap: {},
        examMap: {},
      };

      store.mutations.APPLY_NOTIFICATION_UPDATES(state, {
        contentLearnerStatusMapUpdates: [
          {
            content_id: 'content_1',
            learner_id: 'learner_1',
            status: 'Answered',
            last_activity: new Date('2023-10-05T11:00:00Z'),
          },
        ],
        examLearnerStatusMapUpdates: [],
      });

      // Status should remain Completed
      expect(state.contentLearnerStatusMap.content_1.learner_1.status).toBe(STATUSES.completed);
      // But last_activity should be updated
      expect(state.contentLearnerStatusMap.content_1.learner_1.last_activity).toEqual(
        new Date('2023-10-05T11:00:00Z'),
      );
    });

    it('allows updating a non-completed content status', () => {
      const state = {
        contentLearnerStatusMap: {
          content_1: {
            learner_1: {
              content_id: 'content_1',
              learner_id: 'learner_1',
              status: STATUSES.started,
              last_activity: new Date('2023-10-05T10:00:00Z'),
              time_spent: 50,
            },
          },
        },
        examLearnerStatusMap: {},
        examMap: {},
      };

      store.mutations.APPLY_NOTIFICATION_UPDATES(state, {
        contentLearnerStatusMapUpdates: [
          {
            content_id: 'content_1',
            learner_id: 'learner_1',
            status: STATUSES.completed,
            last_activity: new Date('2023-10-05T11:00:00Z'),
          },
        ],
        examLearnerStatusMapUpdates: [],
      });

      expect(state.contentLearnerStatusMap.content_1.learner_1.status).toBe(STATUSES.completed);
    });
  });
});
