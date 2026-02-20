import store, { _itemMap, _statusMap } from '../index';
import sampleServerResponse from './sampleServerResponse';
import expectedState from './sampleState';

describe('coach summary module', () => {
  it('sets expected data given an API response', () => {
    store.mutations.SET_STATE(store.state, sampleServerResponse);

    expect(store.state).toEqual(expectedState);
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
});
