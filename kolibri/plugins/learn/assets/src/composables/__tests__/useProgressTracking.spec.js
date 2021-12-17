import { get } from '@vueuse/core';
import client from 'kolibri.client';
import { coreStoreFactory as makeStore } from 'kolibri.coreVue.vuex.store';
import useProgressTracking from '../useProgressTracking';

jest.mock('kolibri.urls');
jest.mock('kolibri.client');

function setUp() {
  const store = makeStore();
  return { store, ...useProgressTracking(store) };
}

describe('useProgressTracking composable', () => {
  describe('initContentSession', () => {
    it('should throw an error if no context provided', async () => {
      const { initContentSession } = setUp();
      try {
        await initContentSession({});
      } catch (error) {
        expect(error).toEqual(new TypeError('Must define either nodeId or quizId'));
      }
    });
    it('should throw an error if only lessonId provided', async () => {
      const { initContentSession } = setUp();
      try {
        await initContentSession({ lessonId: 'test_lesson' });
      } catch (error) {
        expect(error).toEqual(new TypeError('Must define either nodeId or quizId'));
      }
    });
    it('should throw an error if quizId and nodeId provided', async () => {
      const { initContentSession } = setUp();
      try {
        await initContentSession({ quizId: 'test_quiz', nodeId: 'test_node' });
      } catch (error) {
        expect(error).toEqual(
          new TypeError('quizId must be the only defined parameter if defined')
        );
      }
    });
    it('should throw an error if quizId and lessonId provided', async () => {
      const { initContentSession } = setUp();
      try {
        await initContentSession({
          quizId: 'test_quiz',
          lessonId: 'test_lesson',
        });
      } catch (error) {
        expect(error).toEqual(
          new TypeError('quizId must be the only defined parameter if defined')
        );
      }
    });
    it('should not set a lessonId if the lessonId is a falsey value', async () => {
      const { initContentSession } = setUp();
      const node_id = 'test_node_id';
      const lesson_id = null;
      client.__setPayload({
        context: { node_id, lesson_id },
      });
      await initContentSession({ nodeId: node_id, lessonId: lesson_id });
      expect(client.mock.calls[0][0].data).toEqual({ node_id: node_id });
    });
    it('should not set a nodeId if the nodeId is a falsey value', async () => {
      const { initContentSession } = setUp();
      const node_id = null;
      const quiz_id = 'test-quiz-id';
      client.__setPayload({
        context: { node_id, quiz_id },
      });
      await initContentSession({ nodeId: node_id, quizId: quiz_id });
      expect(client.mock.calls[0][0].data).toEqual({ quiz_id: quiz_id });
    });
    it('should set the logging state with the return data from the client', async () => {
      const {
        initContentSession,
        session_id,
        context,
        progress,
        time_spent,
        extra_fields,
        complete,
      } = setUp();
      const payload = {
        session_id: 'test_session_id',
        context: { node_id: 'test_node_id' },
        progress: 0.5,
        time_spent: 15,
        extra_fields: { extra: true },
        complete: false,
      };
      client.__setPayload(payload);
      await initContentSession({ nodeId: payload.context.node_id });
      expect(get(session_id)).toEqual(payload.session_id);
      expect(get(context).node_id).toEqual(payload.context.node_id);
      expect(get(progress)).toEqual(payload.progress);
      expect(get(time_spent)).toEqual(payload.time_spent);
      expect(get(extra_fields)).toEqual(payload.extra_fields);
      expect(get(complete)).toEqual(payload.complete);
    });
    it('should not make a backend request when the session for node_id is already active', async () => {
      const { initContentSession } = setUp();
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
      await initContentSession({ nodeId: node_id });
      client.__reset();
      await initContentSession({ nodeId: node_id });
      expect(client).not.toHaveBeenCalled();
    });
    it('should not make a backend request when the session for lesson_id and node_id is already active', async () => {
      const { initContentSession } = setUp();
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
      await initContentSession({ nodeId: node_id, lessonId: lesson_id });
      client.__reset();
      await initContentSession({ nodeId: node_id, lessonId: lesson_id });
      expect(client).not.toHaveBeenCalled();
    });
    it('should not make a backend request when the session for quiz_id is already active', async () => {
      const { initContentSession } = setUp();
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
      await initContentSession({ quizId: quiz_id });
      client.__reset();
      await initContentSession({ quizId: quiz_id });
      expect(client).not.toHaveBeenCalled();
    });
    it('should set the logging state with the return data for an assessment from the client', async () => {
      const {
        initContentSession,
        session_id,
        context,
        progress,
        time_spent,
        extra_fields,
        complete,
        mastery_criterion,
        pastattempts,
        totalattempts,
      } = setUp();
      const payload = {
        session_id: 'test_session_id',
        context: { node_id: 'test_node_id' },
        progress: 0.5,
        time_spent: 15,
        extra_fields: { extra: true },
        mastery_criterion: { type: 'm_of_n', m: 5, n: 7 },
        pastattempts: [
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
        ],
        totalattempts: 1,
        complete: false,
      };
      client.__setPayload(payload);
      await initContentSession({ nodeId: payload.context.node_id });
      expect(get(session_id)).toEqual(payload.session_id);
      expect(get(context).node_id).toEqual(payload.context.node_id);
      expect(get(progress)).toEqual(payload.progress);
      expect(get(time_spent)).toEqual(payload.time_spent);
      expect(get(extra_fields)).toEqual(payload.extra_fields);
      expect(get(complete)).toEqual(payload.complete);
      expect(get(mastery_criterion)).toEqual(payload.mastery_criterion);
      expect(get(pastattempts)).toEqual(payload.pastattempts);
      expect(get(totalattempts)).toEqual(payload.totalattempts);
    });
    it('should retry 5 times if it receives a 503', async () => {
      const { initContentSession } = setUp();
      const error = {
        response: {
          status: 503,
          headers: {
            'retry-after': 0.001,
          },
        },
      };
      client.mockClear();
      client.mockImplementation(() => {
        return Promise.reject(error);
      });
      await expect(initContentSession({ nodeId: 'test' })).rejects.toMatchObject(error);
      expect(client).toHaveBeenCalledTimes(5);
    });
  });
  describe('updateContentSession', () => {
    async function initStore(data = {}) {
      const all = setUp();
      const session_id = 'test_session_id';
      const node_id = 'test_node_id';
      const progress = 0.5;
      const time_spent = 15;
      const extra_fields = {};
      const payload = {
        session_id,
        context: { node_id },
        progress,
        time_spent,
        extra_fields,
        complete: false,
        pastattempts: [],
        mastery_criterion: { type: 'm_of_n', m: 5, n: 7 },
        totalattempts: 0,
      };
      Object.assign(payload, data);
      client.__setPayload(payload);
      await all.initContentSession({ nodeId: node_id });
      client.__reset();
      return all;
    }
    it('should throw an error if called before a content session has been initialized', async () => {
      const { updateContentSession } = setUp();
      try {
        await updateContentSession({});
      } catch (error) {
        expect(error).toEqual(
          new ReferenceError('Cannot update a content session before one has been initialized')
        );
      }
    });
    it('should throw an error if called with both progress and progressDelta', async () => {
      const { updateContentSession } = await initStore();
      try {
        await updateContentSession({ progress: 1, progressDelta: 1 });
      } catch (error) {
        expect(error).toEqual(new TypeError('Must only specify either progressDelta or progress'));
      }
    });
    it('should throw an error if called with non-numeric progress', async () => {
      const { updateContentSession } = await initStore();
      try {
        await updateContentSession({ progress: 'number' });
      } catch (error) {
        expect(error).toEqual(new TypeError('progress must be a number'));
      }
    });
    it('should throw an error if called with non-numeric progressDelta', async () => {
      const { updateContentSession } = await initStore();
      try {
        await updateContentSession({ progressDelta: 'number' });
      } catch (error) {
        expect(error).toEqual(new TypeError('progressDelta must be a number'));
      }
    });
    it('should throw an error if called with non-plain object contentState', async () => {
      const { updateContentSession } = await initStore();
      try {
        await updateContentSession({ contentState: 'notanobject' });
      } catch (error) {
        expect(error).toEqual(new TypeError('contentState must be an object'));
      }
    });
    it('should throw an error if called with non-plain object interaction', async () => {
      const { updateContentSession } = await initStore();
      try {
        await updateContentSession({ interaction: 'notanobject' });
      } catch (error) {
        expect(error).toEqual(new TypeError('interaction must be an object'));
      }
    });
    it('should not make a request to the backend if no arguments have been passed', async () => {
      const { updateContentSession } = await initStore();
      await updateContentSession({});
      expect(client).not.toHaveBeenCalled();
    });
    it('should make a request to the backend if any changes have been passed', async () => {
      const { updateContentSession } = await initStore();
      await updateContentSession({ contentState: { test: 'test' } });
      expect(client).toHaveBeenCalled();
    });
    it('should update complete if the backend returns complete', async () => {
      const { updateContentSession, complete } = await initStore();
      client.__setPayload({
        complete: true,
      });
      await updateContentSession({ contentState: { test: 'test' } });
      expect(get(complete)).toBe(true);
    });
    it('should not update total progress if the backend returns complete and was not complete and user is not logged in', async () => {
      const { updateContentSession, store } = await initStore();
      client.__setPayload({
        complete: true,
      });
      store.commit('SET_TOTAL_PROGRESS', 0);
      await updateContentSession({ contentState: { test: 'test' } });
      expect(store.state.core.totalProgress).toEqual(0);
    });
    it('should update total progress if the backend returns complete and was not complete and user is logged in', async () => {
      const { updateContentSession, store } = await initStore();
      store.commit('CORE_SET_SESSION', { kind: ['learner'] });
      store.commit('SET_TOTAL_PROGRESS', 0);
      client.__setPayload({
        complete: true,
      });
      await updateContentSession({ contentState: { test: 'test' } });
      expect(store.state.core.totalProgress).toEqual(1);
    });
    it('should not update total progress if the backend returns complete and was already complete', async () => {
      const { updateContentSession, store } = await initStore({ complete: true });
      store.commit('CORE_SET_SESSION', { kind: ['learner'] });
      store.commit('SET_TOTAL_PROGRESS', 0);
      client.__setPayload({
        complete: true,
      });
      await updateContentSession({ contentState: { test: 'test' } });
      expect(store.state.core.totalProgress).toEqual(0);
    });
    it('should update progress and progress_delta if progress is updated under threshold', async () => {
      const { updateContentSession, progress, progress_delta } = await initStore();
      await updateContentSession({ progress: 0.6 });
      expect(get(progress)).toEqual(0.6);
      expect(get(progress_delta)).toEqual(0.1);
      expect(client).not.toHaveBeenCalled();
    });
    it('should increment progress_delta if progress is updated twice', async () => {
      const { updateContentSession, progress_delta } = await initStore();
      await updateContentSession({ progress: 0.6 });
      await updateContentSession({ progress: 0.7 });
      expect(get(progress_delta)).toEqual(0.2);
      expect(client).not.toHaveBeenCalled();
    });
    it('should update progress and store progress_delta if progress is updated over threshold', async () => {
      const { updateContentSession, progress } = await initStore();
      await updateContentSession({ progress: 1 });
      expect(get(progress)).toEqual(1);
      expect(client.mock.calls[0][0].data.progress_delta).toEqual(0.5);
    });
    it('should max progress and store progress_delta if progress is updated over threshold and over max value', async () => {
      const { updateContentSession, progress } = await initStore();
      await updateContentSession({ progress: 2 });
      expect(get(progress)).toEqual(1);
      expect(client.mock.calls[0][0].data.progress_delta).toEqual(0.5);
    });
    it('should not update progress and store progress_delta if progress is updated under current value', async () => {
      const { updateContentSession, progress, progress_delta } = await initStore();
      await updateContentSession({ progress: 0.4 });
      expect(get(progress)).toEqual(0.5);
      expect(get(progress_delta)).toEqual(0);
      expect(client).not.toHaveBeenCalled();
    });
    it('should update progress and progress_delta if progressDelta is updated under threshold', async () => {
      const { updateContentSession, progress, progress_delta } = await initStore();
      await updateContentSession({ progressDelta: 0.1 });
      expect(get(progress)).toEqual(0.6);
      expect(get(progress_delta)).toEqual(0.1);
      expect(client).not.toHaveBeenCalled();
    });
    it('should update progress and store progress_delta if progressDelta is updated over threshold', async () => {
      const { updateContentSession, progress } = await initStore();
      await updateContentSession({ progressDelta: 0.5 });
      expect(get(progress)).toEqual(1);
      expect(client.mock.calls[0][0].data.progress_delta).toEqual(0.5);
    });
    it('should max progress and store progress_delta if progressDelta is updated over threshold and over max value', async () => {
      const { updateContentSession, progress } = await initStore();
      await updateContentSession({ progressDelta: 1.5 });
      expect(get(progress)).toEqual(1);
      // Will store the maximum possible value for progress_delta which is 1,
      // even though current progress can only increase by 0.5
      expect(client.mock.calls[0][0].data.progress_delta).toEqual(1);
    });
    it('should update extra_fields and store if contentState is updated', async () => {
      const { updateContentSession, extra_fields } = await initStore();
      await updateContentSession({ contentState: { newState: 0.2 } });
      expect(get(extra_fields)).toEqual({ contentState: { newState: 0.2 } });
      expect(client).toHaveBeenCalled();
      expect(client.mock.calls[0][0].data.extra_fields).toEqual({
        contentState: { newState: 0.2 },
      });
    });
    it('should update extra_fields and but not store to backend if not an update', async () => {
      const { updateContentSession, extra_fields } = await initStore();
      await updateContentSession({
        contentState: { statements: [{ test: 'statement' }] },
      });
      expect(get(extra_fields)).toEqual({
        contentState: { statements: [{ test: 'statement' }] },
      });
      expect(client).toHaveBeenCalled();
      expect(client.mock.calls[0][0].data.extra_fields).toEqual({
        contentState: { statements: [{ test: 'statement' }] },
      });
      await updateContentSession({
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      expect(get(extra_fields)).toEqual({
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      expect(client).toHaveBeenCalled();
      expect(client.mock.calls[1][0].data.extra_fields).toEqual({
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      client.__reset();
      await updateContentSession({
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      expect(get(extra_fields)).toEqual({
        contentState: { statements: [{ test: 'statement' }, { test2: 'statement2' }] },
      });
      expect(client).not.toHaveBeenCalled();
    });
    it('should update pastattempts and store if interaction is passed without an id', async () => {
      const { updateContentSession, pastattempts, pastattemptMap } = await initStore();
      await updateContentSession({
        interaction: {
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      });
      expect(get(pastattempts)[0]).toEqual({
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
      });
      // No attempt is returned from the backend, so should not update the past attempts map,
      // as no id for map.
      expect(get(pastattemptMap)).toEqual({});
      expect(client).toHaveBeenCalled();
      expect(client.mock.calls[0][0].data.interactions).toEqual([
        { item: 'testitem', answer: { response: 'answer' }, correct: 1, complete: true },
      ]);
    });
    it('should update pastattempts and map if passed without an id and backend returns id', async () => {
      const { updateContentSession, pastattempts, pastattemptMap } = await initStore();
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
      await updateContentSession({
        interaction: {
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      });
      expect(get(pastattempts)[0]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
      });
      expect(get(pastattemptMap)).toEqual({
        testid: {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      });
      expect(client).toHaveBeenCalled();
      expect(client.mock.calls[0][0].data.interactions).toEqual([
        {
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
        },
      ]);
    });
    it('should update pastattempts and map if passed without an id and backend returns id and additional interactions happen', async () => {
      const { updateContentSession, pastattempts, pastattemptMap } = await initStore();
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
      const interaction1 = {
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
      };
      await updateContentSession({
        interaction: interaction1,
      });
      // Interaction without an id so gets saved to the backend.
      expect(client).toHaveBeenCalled();
      client.__reset();
      const interaction2 = {
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
        hinted: true,
      };
      await updateContentSession({
        interaction: interaction2,
      });
      expect(get(pastattempts)).toHaveLength(1);
      expect(get(pastattempts)[0]).toEqual(interaction2);
      expect(get(pastattemptMap)).toEqual({
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
      const interaction3 = { id: 'testid', item: 'testitem', error: true };
      await updateContentSession({
        interaction: interaction3,
      });
      const interaction4 = { id: 'testid', item: 'testitem', error: true };
      await updateContentSession({
        interaction: interaction4,
      });
      expect(get(pastattempts)).toHaveLength(1);
      expect(get(pastattempts)[0]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
        hinted: true,
        error: true,
      });
      expect(get(pastattemptMap)).toEqual({
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
      expect(client.mock.calls[0][0].data.interactions).toEqual([
        interaction2,
        interaction3,
        interaction4,
      ]);
    });
    it('should not overwrite correct, answer or simple_answer if not passed with the replace flag', async () => {
      const { updateContentSession, pastattempts, pastattemptMap } = await initStore();
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
      await updateContentSession({
        interaction: {
          item: 'testitem',
          answer: { response: 'answer' },
          simple_answer: 'nah',
          correct: 1,
          complete: true,
        },
      });
      client.__reset();
      await updateContentSession({
        interaction: {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'not an answer' },
          simple_answer: 'yeah',
          correct: 0,
          complete: true,
          hinted: true,
        },
      });
      expect(get(pastattempts)).toHaveLength(1);
      expect(get(pastattempts)[0]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        simple_answer: 'nah',
        correct: 1,
        complete: true,
        hinted: true,
      });
      expect(get(pastattemptMap)).toEqual({
        testid: {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'answer' },
          simple_answer: 'nah',
          correct: 1,
          complete: true,
          hinted: true,
        },
      });
    });
    it('should clear unsaved_interactions when successfully saved', async () => {
      const { updateContentSession, unsaved_interactions } = await initStore();
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
      await updateContentSession({
        interaction: {
          item: 'testitem',
          answer: { response: 'answer' },
          simple_answer: 'nah',
          correct: 1,
          complete: true,
        },
      });
      expect(get(unsaved_interactions)).toHaveLength(0);
    });
    it('should multiple unrelated interactions without overwriting', async () => {
      const { updateContentSession, pastattempts, pastattemptMap } = await initStore();
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
      await updateContentSession({
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
      await updateContentSession({
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
      await updateContentSession({
        interaction: {
          item: 'testitem2',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
          error: true,
        },
      });
      client.__reset();
      expect(get(pastattempts)).toHaveLength(3);
      expect(get(pastattempts)[2]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
      });
      expect(get(pastattempts)[1]).toEqual({
        id: 'testid1',
        item: 'testitem1',
        answer: { response: 'answer' },
        correct: 0,
        complete: false,
      });
      expect(get(pastattempts)[0]).toEqual({
        id: 'testid2',
        item: 'testitem2',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
        error: true,
      });
      expect(Object.keys(get(pastattemptMap))).toHaveLength(3);
      await updateContentSession({
        interaction: {
          id: 'testid',
          item: 'testitem',
          answer: { response: 'answer' },
          correct: 1,
          complete: true,
          hinted: true,
        },
      });
      await updateContentSession({
        interaction: {
          id: 'testid1',
          item: 'testitem1',
          answer: { response: 'answer' },
          correct: 0,
          complete: true,
        },
      });
      await updateContentSession({
        interaction: {
          id: 'testid2',
          item: 'testitem2',
          answer: { response: 'answer' },
          replace: true,
          correct: 0,
          complete: true,
        },
      });
      expect(get(pastattempts)).toHaveLength(3);
      expect(get(pastattempts)[2]).toEqual({
        id: 'testid',
        item: 'testitem',
        answer: { response: 'answer' },
        correct: 1,
        complete: true,
        hinted: true,
      });
      expect(get(pastattempts)[1]).toEqual({
        id: 'testid1',
        item: 'testitem1',
        answer: { response: 'answer' },
        correct: 0,
        complete: true,
      });
      expect(get(pastattempts)[0]).toEqual({
        id: 'testid2',
        item: 'testitem2',
        answer: { response: 'answer' },
        correct: 0,
        complete: true,
        error: true,
      });
    });
    it('should debounce requests', async () => {
      const { updateContentSession } = await initStore();
      updateContentSession({ progress: 1 });
      updateContentSession({ contentState: { yes: 'no' } });
      updateContentSession({ progressDelta: 1 });
      updateContentSession({ progress: 1 });
      updateContentSession({ contentState: { yes: 'no' } });
      updateContentSession({ progressDelta: 1 });
      await updateContentSession({ progress: 1 });
      expect(client).toHaveBeenCalledTimes(1);
    });
    it('should retry 5 times if it receives a 503', async () => {
      const { updateContentSession } = await initStore();
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
      await expect(updateContentSession({ progress: 1 })).rejects.toMatchObject(error);
      expect(client).toHaveBeenCalledTimes(5);
    });
  });
});
