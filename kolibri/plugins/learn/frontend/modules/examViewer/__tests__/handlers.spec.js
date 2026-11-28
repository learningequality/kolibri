import pluginData from 'kolibri-plugin-data';
import flushPromises from 'flush-promises';
import heartbeat from 'kolibri/heartbeat';
import router from 'kolibri/router';
import { UserKinds } from 'kolibri/constants';
import { clearError, error } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { showExam } from '../handlers';

describe('showExam', () => {
  const store = { commit: jest.fn() };
  let contentRequest;
  let exerciseId;
  let sessionRequest;
  let holdSessionRequest;
  const session = { id: 'session', user_id: 'learner', kind: [UserKinds.LEARNER] };

  beforeAll(() => {
    router.initRouter({ mode: 'abstract' });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      router.initRoutes([
        {
          name: 'QUIZ',
          path: '/quiz/:classId/:examId/:questionNumber',
          handler: toRoute => showExam(store, toRoute.params, false, toRoute),
        },
      ]);
    } finally {
      warn.mockRestore();
    }
  });

  beforeEach(async () => {
    pluginData.urls = {
      urls: {
        'kolibri:kolibri.plugins.learn:learnerclassroom_detail': [
          ['api/classroom/%(id)s/', ['id']],
        ],
        'kolibri:core:exam_detail': [['api/exam/%(id)s/', ['id']]],
        'kolibri:core:contentnode_list': [['api/content/contentnode/', []]],
        'kolibri:core:session_detail': [['api/session/%(id)s/', ['id']]],
      },
    };
    store.commit.mockClear();
    holdSessionRequest = false;
    contentRequest = null;
    exerciseId = 'exercise';
    sessionRequest = null;
    if (router.currentRoute.path !== '/') {
      await router.push('/');
    }
    jest.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'trace').mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (method, url) {
      this.requestPath = new URL(url, window.location.origin).pathname;
    });
    jest.spyOn(XMLHttpRequest.prototype, 'setRequestHeader').mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function () {
      if (this.requestPath === '/api/content/contentnode/') {
        contentRequest = this;
        return;
      }
      const responses = {
        '/api/session/current/': session,
        '/api/classroom/classroom/': { id: 'classroom' },
        '/api/exam/quiz/': {
          id: 'quiz',
          data_model_version: 3,
          learners_see_fixed_order: true,
          question_sources: [
            {
              learners_see_fixed_order: true,
              questions: [{ exercise_id: exerciseId, question_id: 'question' }],
            },
          ],
        },
      };
      const data = responses[this.requestPath];
      if (!data) {
        throw new Error(`Unexpected request: ${this.requestPath}`);
      }
      if (this.requestPath === '/api/session/current/' && holdSessionRequest) {
        sessionRequest = this;
        return;
      }
      respond(this, 200, data);
    });
  });

  afterEach(async () => {
    if (holdSessionRequest && sessionRequest) {
      sessionRequest.onerror();
      await flushPromises();
    }
    heartbeat.setReloadOnReconnect(false);
    holdSessionRequest = false;
    await heartbeat.pollSessionEndPoint();
    heartbeat.stopPolling();
    clearError();
    pageLoading.value = false;
    delete pluginData.urls;
    jest.restoreAllMocks();
  });

  function respond(request, status, data) {
    Object.defineProperties(request, {
      status: { value: status },
      responseText: { value: JSON.stringify(data) },
    });
    request.onloadend();
  }

  async function openQuiz() {
    await heartbeat.startPolling();
    await router.push('/quiz/classroom/quiz/0');
    await flushPromises();
    expect(pageLoading.value).toBe(true);
  }

  it('reports an HTTP 500 response', async () => {
    await openQuiz();
    respond(contentRequest, 500, { detail: 'Quiz content failed' });
    await flushPromises();

    expect(pageLoading.value).toBe(false);
    expect(JSON.parse(error.value)).toMatchObject({ status: 500 });
  });

  it('preserves the destination loader and avoids reloading on reconnect', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    await openQuiz();
    await router.push('/home');
    pageLoading.value = true;
    contentRequest.onerror();
    await flushPromises();

    expect(pageLoading.value).toBe(true);
    expect(error.value).toBeNull();

    heartbeat.monitorDisconnect();
    await heartbeat.pollSessionEndPoint();

    expect(router.currentRoute.fullPath).toBe('/home');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('ignores a content failure from an earlier visit to the same quiz URL', async () => {
    await openQuiz();
    const oldRequest = contentRequest;
    await router.push('/home');
    exerciseId = 'replacement-exercise';
    await openQuiz();
    expect(contentRequest).not.toBe(oldRequest);

    respond(oldRequest, 500, { detail: 'Old quiz request failed' });
    await flushPromises();

    expect(pageLoading.value).toBe(true);
    expect(error.value).toBeNull();

    respond(contentRequest, 200, [{ id: exerciseId }]);
    await flushPromises();

    expect(pageLoading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(store.commit).toHaveBeenCalledWith(
      'examViewer/SET_STATE',
      expect.objectContaining({ contentNodeMap: { [exerciseId]: { id: exerciseId } } }),
    );
  });

  it('clears the loader on a network failure and reloads on reconnect', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    await openQuiz();
    holdSessionRequest = true;
    contentRequest.onerror();
    await flushPromises();

    expect(pageLoading.value).toBe(false);
    expect(error.value).toBeNull();
    sessionRequest.onerror();
    sessionRequest = null;
    await flushPromises();
    holdSessionRequest = false;
    await heartbeat.pollSessionEndPoint();

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0][0].message).toMatch(/Not implemented: navigation/);
  });
});
