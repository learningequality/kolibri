import { render } from '@testing-library/vue';
import pluginData from 'kolibri-plugin-data';
import { UserKinds } from 'kolibri/constants';
import useUser from 'kolibri/composables/useUser';
import useProgressTracking from '../useProgressTracking';

describe('quiz progress tracking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    pluginData.urls = {
      urls: {
        'kolibri:core:trackprogress_list': [['api/trackprogress/', []]],
        'kolibri:core:trackprogress_detail': [['api/trackprogress/%(id)s/', ['id']]],
      },
    };
    useUser().setSession({
      session: { id: 'session', user_id: 'learner', kind: [UserKinds.LEARNER] },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete pluginData.urls;
  });

  it.each([
    ['while mounted', false, ['POST', 'PUT']],
    ['after unmount', true, ['POST']],
  ])('handles session initialization finishing %s', async (_, unmountEarly, expectedMethods) => {
    const methods = [];
    let respondToPost;
    function respond(request, data) {
      Object.defineProperties(request, {
        status: { value: 200 },
        responseText: { value: JSON.stringify(data) },
      });
      request.onloadend();
    }
    jest.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(function (method) {
      this.requestMethod = method;
    });
    jest.spyOn(XMLHttpRequest.prototype, 'setRequestHeader').mockImplementation(() => {});
    jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(function () {
      methods.push(this.requestMethod);
      if (this.requestMethod === 'POST') {
        respondToPost = () =>
          respond(this, { session_id: 'session', time_spent: 0, progress: 0, complete: false });
      } else {
        respond(this, { session_id: 'session' });
      }
    });

    let started;
    const { unmount } = render({
      setup() {
        const tracking = useProgressTracking();
        started = tracking
          .initContentSession({ quizId: 'quiz' })
          .then(tracking.startTrackingProgress);
        return () => null;
      },
    });
    await jest.advanceTimersByTimeAsync(0);
    if (unmountEarly) {
      unmount();
    }
    respondToPost();
    await started;
    await jest.advanceTimersByTimeAsync(120001);

    expect(methods).toEqual(expectedMethods);
    if (unmountEarly) {
      expect(jest.getTimerCount()).toBe(0);
    } else {
      unmount();
      await jest.advanceTimersByTimeAsync(1);
    }
  });
});
