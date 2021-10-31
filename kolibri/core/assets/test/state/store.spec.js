import Vue from 'vue';
import * as redirectBrowser from 'kolibri.utils.redirectBrowser';
import client from 'kolibri.client';
import * as constants from '../../src/constants';
import { coreStoreFactory as makeStore } from '../../src/state/store';
import { stubWindowLocation } from 'testUtils'; // eslint-disable-line

jest.mock('kolibri.urls');
jest.mock('kolibri.client');

describe('Vuex store/actions for core module', () => {
  describe('error handling', () => {
    const errorMessage = 'testError';
    Vue.prototype.$formatMessage = () => errorMessage;
    it('handleError action updates core state', () => {
      const store = makeStore();
      store.dispatch('handleError', 'catastrophic failure');
      expect(store.state.core.error).toEqual('catastrophic failure');
      expect(store.state.core.loading).toBeFalsy();
    });

    it('handleApiError action updates core state', () => {
      const store = makeStore();
      const apiError = { message: 'Too Bad' };
      try {
        store.dispatch('handleApiError', apiError);
      } catch (e) {
        expect(e.message).toBe(apiError.message);
      }
      expect(store.state.core.error.match(/Too Bad/)).toHaveLength(1);
      expect(store.state.core.loading).toBeFalsy();
    });
  });

  describe('kolibriLogin', () => {
    stubWindowLocation(beforeAll, afterAll);

    let store;
    let redirectStub;

    beforeEach(() => {
      store = makeStore();
      redirectStub = jest.spyOn(redirectBrowser, 'redirectBrowser');
    });

    afterEach(() => {
      redirectStub.mockRestore();
    });

    it('successful login', async () => {
      client.__setPayload({
        // just sending subset of sessionPayload
        id: '123',
        username: 'e_fermi',
        kind: ['cool-guy-user'],
      });

      await store.dispatch('kolibriLogin', {});
      expect(redirectStub).toHaveBeenCalled();
    });

    it('failed login (401)', async () => {
      client.mockImplementation(() => {
        return Promise.reject({
          response: {
            data: [
              {
                id: constants.LoginErrors.INVALID_CREDENTIALS,
              },
            ],
            status: 401,
          },
        });
      });

      const error = await store.dispatch('kolibriLogin', {});
      expect(error).toEqual(constants.LoginErrors.INVALID_CREDENTIALS);
    });
  });
  describe('initContentSession', () => {
    it('should throw an error if no context provided', async () => {
      const store = makeStore();
      try {
        await store.dispatch('initContentSession', {});
      } catch (error) {
        expect(error).toEqual(new TypeError('Must define either nodeId or quizId'));
      }
    });
    it('should throw an error if only lessonId provided', async () => {
      const store = makeStore();
      try {
        await store.dispatch('initContentSession', { lessonId: 'test_lesson' });
      } catch (error) {
        expect(error).toEqual(new TypeError('Must define either nodeId or quizId'));
      }
    });
    it('should throw an error if quizId and nodeId provided', async () => {
      const store = makeStore();
      try {
        await store.dispatch('initContentSession', { quizId: 'test_quiz', nodeId: 'test_node' });
      } catch (error) {
        expect(error).toEqual(
          new TypeError('quizId must be the only defined parameter if defined')
        );
      }
    });
    it('should throw an error if quizId and lessonId provided', async () => {
      const store = makeStore();
      try {
        await store.dispatch('initContentSession', {
          quizId: 'test_quiz',
          lessonId: 'test_lesson',
        });
      } catch (error) {
        expect(error).toEqual(
          new TypeError('quizId must be the only defined parameter if defined')
        );
      }
    });
    it('should set the logging state with the return data from the client', async () => {
      const store = makeStore();
      const session_id = 'test_session_id';
      const node_id = 'test_node_id';
      const progress = 0.5;
      const time_spent = 15;
      const extra_fields = { extra: true };
      client.__setPayload({
        session_id,
        context: { node_id },
        progress,
        time_spent,
        extra_fields,
        complete: false,
      });
      await store.dispatch('initContentSession', { nodeId: node_id });
      expect(store.state.core.logging.session_id).toEqual(session_id);
      expect(store.state.core.logging.context.node_id).toEqual(node_id);
      expect(store.state.core.logging.progress).toEqual(progress);
      expect(store.state.core.logging.time_spent).toEqual(time_spent);
      expect(store.state.core.logging.extra_fields).toEqual(extra_fields);
      expect(store.state.core.logging.complete).toEqual(false);
    });
    it('should not make a backend request when the session for node_id is already active', async () => {
      const store = makeStore();
      const session_id = 'test_session_id';
      const node_id = 'test_node_id';
      const progress = 0.5;
      const time_spent = 15;
      const extra_fields = { extra: true };
      client.__setPayload({
        session_id,
        context: { node_id },
        progress,
        time_spent,
        extra_fields,
        complete: false,
      });
      await store.dispatch('initContentSession', { nodeId: node_id });
      client.__reset();
      await store.dispatch('initContentSession', { nodeId: node_id });
      expect(client).not.toHaveBeenCalled();
    });
    it('should not make a backend request when the session for lesson_id and node_id is already active', async () => {
      const store = makeStore();
      const session_id = 'test_session_id';
      const node_id = 'test_node_id';
      const lesson_id = 'test_lesson_id';
      const progress = 0.5;
      const time_spent = 15;
      const extra_fields = { extra: true };
      client.__setPayload({
        session_id,
        context: { node_id, lesson_id },
        progress,
        time_spent,
        extra_fields,
        complete: false,
      });
      await store.dispatch('initContentSession', { nodeId: node_id, lessonId: lesson_id });
      client.__reset();
      await store.dispatch('initContentSession', { nodeId: node_id, lessonId: lesson_id });
      expect(client).not.toHaveBeenCalled();
    });
    it('should not make a backend request when the session for quiz_id is already active', async () => {
      const store = makeStore();
      const session_id = 'test_session_id';
      const quiz_id = 'test_quiz_id';
      const progress = 0.5;
      const time_spent = 15;
      const extra_fields = { extra: true };
      client.__setPayload({
        session_id,
        context: { quiz_id },
        progress,
        time_spent,
        extra_fields,
        complete: false,
      });
      await store.dispatch('initContentSession', { quizId: quiz_id });
      client.__reset();
      await store.dispatch('initContentSession', { quizId: quiz_id });
      expect(client).not.toHaveBeenCalled();
    });
    it('should set the logging state with the return data for an assessment from the client', async () => {
      const store = makeStore();
      const session_id = 'test_session_id';
      const node_id = 'test_node_id';
      const progress = 0.5;
      const time_spent = 15;
      const extra_fields = { extra: true };
      const mastery_criterion = { type: 'm_of_n', m: 5, n: 7 };
      const pastattempts = [
        {
          id: 'attemptlog_id',
          correct: 1,
          complete: true,
          hinted: false,
          error: false,
          item: 'item_identifier',
          answer: { response: 'respond to this' },
          time_spent: 10,
        },
      ];
      client.__setPayload({
        session_id,
        context: { node_id },
        progress,
        time_spent,
        extra_fields,
        complete: false,
        mastery_criterion,
        pastattempts,
        totalattempts: 1,
      });
      await store.dispatch('initContentSession', { nodeId: node_id });
      expect(store.state.core.logging.session_id).toEqual(session_id);
      expect(store.state.core.logging.context.node_id).toEqual(node_id);
      expect(store.state.core.logging.progress).toEqual(progress);
      expect(store.state.core.logging.time_spent).toEqual(time_spent);
      expect(store.state.core.logging.extra_fields).toEqual(extra_fields);
      expect(store.state.core.logging.complete).toEqual(false);
      expect(store.state.core.logging.mastery_criterion).toEqual(mastery_criterion);
      expect(store.state.core.logging.pastattempts).toEqual(pastattempts);
      expect(store.state.core.logging.totalattempts).toEqual(1);
    });
    it('should clear any pre-existing logging state', async () => {
      const store = makeStore();
      const session_id = 'test_session_id';
      const node_id = 'test_node_id';
      const progress = 0.5;
      const time_spent = 15;
      const extra_fields = { extra: true };
      store.commit('INITIALIZE_LOGGING_STATE', {
        session_id,
        context: { node_id },
        progress,
        time_spent,
        extra_fields,
        complete: false,
      });
      client.__setPayload({});
      await store.dispatch('initContentSession', { nodeId: 'another_node' });
      expect(store.state.core.logging.session_id).toBeNull();
      expect(store.state.core.logging.context).toBeNull();
      expect(store.state.core.logging.progress).toBeNull();
      expect(store.state.core.logging.time_spent).toBeNull();
      expect(store.state.core.logging.extra_fields).toBeNull();
      expect(store.state.core.logging.complete).toBeNull();
    });
  });
  describe('updateContentSession', () => {
    async function initStore() {
      const store = makeStore();
      const session_id = 'test_session_id';
      const node_id = 'test_node_id';
      const progress = 0.5;
      const time_spent = 15;
      const extra_fields = {};
      client.__setPayload({
        session_id,
        context: { node_id },
        progress,
        time_spent,
        extra_fields,
        complete: false,
        pastattempts: [],
        mastery_criterion: { type: 'm_of_n', m: 5, n: 7 },
        totalattempts: 0,
      });
      await store.dispatch('initContentSession', { nodeId: node_id });
      client.__reset();
      return store;
    }
    it('should throw an error if called before a content session has been initialized', async () => {
      const store = makeStore();
      try {
        await store.dispatch('updateContentSession', {});
      } catch (error) {
        expect(error).toEqual(
          new ReferenceError('Cannot update a content session before one has been initialized')
        );
      }
    });
    it('should throw an error if called with both progress and progressDelta', async () => {
      const store = await initStore();
      try {
        await store.dispatch('updateContentSession', { progress: 1, progressDelta: 1 });
      } catch (error) {
        expect(error).toEqual(new TypeError('Must only specify either progressDelta or progress'));
      }
    });
    it('should throw an error if called with non-numeric progress', async () => {
      const store = await initStore();
      try {
        await store.dispatch('updateContentSession', { progress: 'number' });
      } catch (error) {
        expect(error).toEqual(new TypeError('progress must be a number'));
      }
    });
    it('should throw an error if called with non-numeric progressDelta', async () => {
      const store = await initStore();
      try {
        await store.dispatch('updateContentSession', { progressDelta: 'number' });
      } catch (error) {
        expect(error).toEqual(new TypeError('progressDelta must be a number'));
      }
    });
    it('should throw an error if called with non-plain object contentState', async () => {
      const store = await initStore();
      try {
        await store.dispatch('updateContentSession', { contentState: 'notanobject' });
      } catch (error) {
        expect(error).toEqual(new TypeError('contentState must be an object'));
      }
    });
    it('should throw an error if called with non-plain object interaction', async () => {
      const store = await initStore();
      try {
        await store.dispatch('updateContentSession', { interaction: 'notanobject' });
      } catch (error) {
        expect(error).toEqual(new TypeError('interaction must be an object'));
      }
    });
    it('should not make a request to the backend if no arguments have been passed', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', {});
      expect(client).not.toHaveBeenCalled();
    });
    it('should make a request to the backend if any changes have been passed', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', { contentState: { test: 'test' } });
      expect(client).toHaveBeenCalled();
    });
    it('should update complete if the backend returns complete', async () => {
      const store = await initStore();
      client.__setPayload({
        complete: true,
      });
      await store.dispatch('updateContentSession', { contentState: { test: 'test' } });
      expect(store.state.core.logging.complete).toBe(true);
    });
    it('should not update total progress if the backend returns complete and was not complete and user is not logged in', async () => {
      const store = await initStore();
      client.__setPayload({
        complete: true,
      });
      store.commit('SET_TOTAL_PROGRESS', 0);
      await store.dispatch('updateContentSession', { contentState: { test: 'test' } });
      expect(store.state.core.totalProgress).toEqual(0);
    });
    it('should update total progress if the backend returns complete and was not complete and user is logged in', async () => {
      const store = await initStore();
      store.commit('CORE_SET_SESSION', { kind: ['learner'] });
      store.commit('SET_TOTAL_PROGRESS', 0);
      client.__setPayload({
        complete: true,
      });
      await store.dispatch('updateContentSession', { contentState: { test: 'test' } });
      expect(store.state.core.totalProgress).toEqual(1);
    });
    it('should not update total progress if the backend returns complete and was not complete', async () => {
      const store = await initStore();
      store.commit('CORE_SET_SESSION', { kind: ['learner'] });
      store.commit('SET_TOTAL_PROGRESS', 0);
      store.commit('SET_COMPLETE');
      client.__setPayload({
        complete: true,
      });
      await store.dispatch('updateContentSession', { contentState: { test: 'test' } });
      expect(store.state.core.totalProgress).toEqual(0);
    });
    it('should update progress and progress_delta if progress is updated under threshold', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', { progress: 0.6 });
      expect(store.state.core.logging.progress).toEqual(0.6);
      expect(store.state.core.logging.progress_delta).toEqual(0.1);
      expect(client).not.toHaveBeenCalled();
    });
    it('should update progress and store progress_delta if progress is updated over threshold', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', { progress: 1 });
      expect(store.state.core.logging.progress).toEqual(1);
      expect(client.mock.calls[0][0].data.progress_delta).toEqual(0.5);
    });
    it('should max progress and store progress_delta if progress is updated over threshold and over max value', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', { progress: 2 });
      expect(store.state.core.logging.progress).toEqual(1);
      expect(client.mock.calls[0][0].data.progress_delta).toEqual(0.5);
    });
    it('should not update progress and store progress_delta if progress is updated under current value', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', { progress: 0.4 });
      expect(store.state.core.logging.progress).toEqual(0.5);
      expect(store.state.core.logging.progress_delta).toEqual(0);
      expect(client).not.toHaveBeenCalled();
    });
    it('should update progress and progress_delta if progressDelta is updated under threshold', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', { progressDelta: 0.1 });
      expect(store.state.core.logging.progress).toEqual(0.6);
      expect(store.state.core.logging.progress_delta).toEqual(0.1);
      expect(client).not.toHaveBeenCalled();
    });
    it('should update progress and store progress_delta if progressDelta is updated over threshold', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', { progressDelta: 0.5 });
      expect(store.state.core.logging.progress).toEqual(1);
      expect(client.mock.calls[0][0].data.progress_delta).toEqual(0.5);
    });
    it('should max progress and store progress_delta if progressDelta is updated over threshold and over max value', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', { progressDelta: 1.5 });
      expect(store.state.core.logging.progress).toEqual(1);
      // Will store the maximum possible value for progress_delta which is 1,
      // even though current progress can only increase by 0.5
      expect(client.mock.calls[0][0].data.progress_delta).toEqual(1);
    });
    it('should update extra_fields and store if contentState is updated', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', { contentState: { newState: 0.2 } });
      expect(store.state.core.logging.extra_fields).toEqual({ contentState: { newState: 0.2 } });
      expect(client).toHaveBeenCalled();
      expect(client.mock.calls[0][0].data.extra_fields).toEqual({
        contentState: { newState: 0.2 },
      });
    });
    it('should update extra_fields and but not store to backend if not an update', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', {
        contentState: { statements: [{ test: 'statement' }] },
      });
      expect(store.state.core.logging.extra_fields).toEqual({
        contentState: { statements: [{ test: 'statement' }] },
      });
      expect(client).toHaveBeenCalled();
      expect(client.mock.calls[0][0].data.extra_fields).toEqual({
        contentState: { statements: [{ test: 'statement' }] },
      });
      await store.dispatch('updateContentSession', {
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      expect(store.state.core.logging.extra_fields).toEqual({
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      expect(client).toHaveBeenCalled();
      expect(client.mock.calls[1][0].data.extra_fields).toEqual({
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      client.__reset();
      await store.dispatch('updateContentSession', {
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      expect(store.state.core.logging.extra_fields).toEqual({
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      expect(client).not.toHaveBeenCalled();
    });
    it('should update pastattempts and store if interaction is passed without an id', async () => {
      const store = await initStore();
      await store.dispatch('updateContentSession', {
        interaction: {
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      });
      expect(store.state.core.logging.pastattempts[0]).toEqual({
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
      });
      // No attempt is returned from the backend, so should not update the past attempts map,
      // as no id for map.
      expect(store.state.core.logging.pastattemptMap).toEqual({});
      expect(client).toHaveBeenCalled();
      expect(client.mock.calls[0][0].data.interactions).toEqual([
        { item: 'testitem', answer: { response: 'answer' }, correct: 1, complete: true },
      ]);
    });
    it('should update pastattempts and map if passed without an id and backend returns id', async () => {
      const store = await initStore();
      client.__setPayload({
        attempts: [
          {
            id: 'testid',
            item: 'testitem',
            answer: { response: 'answer' },
            correct: 1,
            complete: true,
          },
        ],
      });
      await store.dispatch('updateContentSession', {
        interaction: {
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      });
      expect(store.state.core.logging.pastattempts[0]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
      });
      expect(store.state.core.logging.pastattemptMap).toEqual({
        testid: {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      });
      expect(client).toHaveBeenCalled();
      // The calls are not isolated, so updates to the object also affect the calls
      // as they are just references to the source object.
      expect(client.mock.calls[0][0].data.interactions).toEqual([
        {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      ]);
    });
    it('should update pastattempts and map if passed without an id and backend returns id and additional interactions happen', async () => {
      const store = await initStore();
      client.__setPayload({
        attempts: [
          {
            id: 'testid',
            item: 'testitem',
            answer: { response: 'answer' },
            correct: 1,
            complete: true,
          },
        ],
      });
      await store.dispatch('updateContentSession', {
        interaction: {
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      });
      client.__reset();
      await store.dispatch('updateContentSession', {
        interaction: {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
          hinted: true,
        },
      });
      expect(store.state.core.logging.pastattempts).toHaveLength(1);
      expect(store.state.core.logging.pastattempts[0]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
        hinted: true,
      });
      expect(store.state.core.logging.pastattemptMap).toEqual({
        testid: {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
          hinted: true,
        },
      });
      expect(client).not.toHaveBeenCalled();
      await store.dispatch('updateContentSession', {
        interaction: { id: 'testid', item: 'testitem', error: true },
      });
      expect(store.state.core.logging.pastattempts).toHaveLength(1);
      expect(store.state.core.logging.pastattempts[0]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
        hinted: true,
        error: true,
      });
      expect(store.state.core.logging.pastattemptMap).toEqual({
        testid: {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
          hinted: true,
          error: true,
        },
      });
      expect(client).not.toHaveBeenCalled();
    });
    it('should multiple unrelated interactions without overwriting', async () => {
      const store = await initStore();
      client.__setPayload({
        attempts: [
          {
            id: 'testid',
            item: 'testitem',
            answer: { response: 'answer' },
            correct: 1,
            complete: true,
          },
        ],
      });
      await store.dispatch('updateContentSession', {
        interaction: {
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      });
      client.__reset();
      client.__setPayload({
        attempts: [
          {
            id: 'testid1',
            item: 'testitem1',
            answer: { response: 'answer' },
            correct: 0,
            complete: false,
          },
        ],
      });
      await store.dispatch('updateContentSession', {
        interaction: {
          item: 'testitem1',
          answer: { response: 'answer' },
          correct: 0,
          complete: false,
        },
      });
      client.__reset();
      client.__setPayload({
        attempts: [
          {
            id: 'testid2',
            item: 'testitem2',
            answer: { response: 'answer' },
            correct: 1,
            complete: true,
          },
        ],
      });
      await store.dispatch('updateContentSession', {
        interaction: {
          item: 'testitem2',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
          error: true,
        },
      });
      client.__reset();
      expect(store.state.core.logging.pastattempts).toHaveLength(3);
      expect(store.state.core.logging.pastattempts[2]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
      });
      expect(store.state.core.logging.pastattempts[1]).toEqual({
        id: 'testid1',
        item: 'testitem1',
        answer: { response: 'answer' },
        correct: 0,
        complete: false,
      });
      expect(store.state.core.logging.pastattempts[0]).toEqual({
        id: 'testid2',
        item: 'testitem2',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
        error: true,
      });
      expect(Object.keys(store.state.core.logging.pastattemptMap)).toHaveLength(3);
      await store.dispatch('updateContentSession', {
        interaction: {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
          hinted: true,
        },
      });
      await store.dispatch('updateContentSession', {
        interaction: {
          id: 'testid1',
          item: 'testitem1',
          answer: { response: 'answer' },
          correct: 0,
          complete: true,
        },
      });
      await store.dispatch('updateContentSession', {
        interaction: {
          id: 'testid2',
          item: 'testitem2',
          answer: { response: 'answer' },
          correct: 0,
          complete: true,
        },
      });
      expect(store.state.core.logging.pastattempts).toHaveLength(3);
      expect(store.state.core.logging.pastattempts[2]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
        hinted: true,
      });
      expect(store.state.core.logging.pastattempts[1]).toEqual({
        id: 'testid1',
        item: 'testitem1',
        answer: { response: 'answer' },
        correct: 0,
        complete: true,
      });
      expect(store.state.core.logging.pastattempts[0]).toEqual({
        id: 'testid2',
        item: 'testitem2',
        answer: { response: 'answer' },
        correct: 0,
        complete: true,
        error: true,
      });
    });
    it('should debounce requests', async () => {
      const store = await initStore();
      store.dispatch('updateContentSession', { progress: 1 });
      store.dispatch('updateContentSession', { contentState: { yes: 'no' } });
      store.dispatch('updateContentSession', { progressDelta: 1 });
      store.dispatch('updateContentSession', { progress: 1 });
      store.dispatch('updateContentSession', { contentState: { yes: 'no' } });
      store.dispatch('updateContentSession', { progressDelta: 1 });
      await store.dispatch('updateContentSession', { progress: 1 });
      expect(client).toHaveBeenCalledTimes(1);
    });
    it('should retry 5 times if it receives a 503', async () => {
      const store = await initStore();
      const error = {
        response: {
          status: 503,
          headers: {
            'retry-after': 0.001,
          },
        },
      };
      client.mockImplementation(() => {
        return Promise.reject(error);
      });
      await expect(store.dispatch('updateContentSession', { progress: 1 })).rejects.toMatchObject(
        error
      );
      expect(client).toHaveBeenCalledTimes(5);
    });
  });
});
