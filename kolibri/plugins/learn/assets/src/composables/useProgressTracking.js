/**
 * A composable function containing logic related to tracking
 * progress through resources
 * All data exposed by this function belong to a current learner.
 */

import { ref, reactive, getCurrentInstance, onBeforeUnmount } from 'vue';
import { get, set } from '@vueuse/core';
import fromPairs from 'lodash/fromPairs';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import isUndefined from 'lodash/isUndefined';
import { diff } from 'deep-object-diff';
import Modalities from 'kolibri-constants/Modalities';
import client from 'kolibri/client';
import logger from 'kolibri-logging';
import urls from 'kolibri/urls';
import useUser from 'kolibri/composables/useUser';
import useTotalProgress from 'kolibri/composables/useTotalProgress';

const logging = logger.getLogger(__filename);

const intervalTime = 5000; // Frequency at which time logging is updated
const progressThreshold = 0.4; // Update logs if user has reached 40% more progress
const timeThreshold = 120; // Update logs if 120 seconds have passed since last update
const maxRetries = 5;

const noSessionErrorText = 'Cannot update a content session before one has been initialized';

// Set the debounce artificially short in tests to prevent slowdowns.
const updateContentSessionDebounceTime = process.env.NODE_ENV === 'test' ? 1 : 2000;

function valOrNull(val) {
  return typeof val !== 'undefined' ? val : null;
}

function _zeroToOne(num) {
  return Math.min(1, Math.max(num || 0, 0));
}

function threeDecimalPlaceRoundup(num) {
  if (num) {
    return Math.ceil(num * 1000) / 1000;
  }
  return num;
}

// Function to delay rejection to allow delayed retry behaviour
function rejectDelay(reason, retryDelay = 5000) {
  return new Promise(function (resolve, reject) {
    setTimeout(reject.bind(null, reason), retryDelay);
  });
}

// Items to only update on an
// already existing attempt if
// replace is set to true.
// We use an object rather than
// an array for easy lookup.
const replaceBlocklist = {
  correct: true,
  answer: true,
  simple_answer: true,
  replace: true,
};

function clearObject(obj) {
  for (const key in obj) {
    delete obj[key];
  }
}

export default function useProgressTracking(store) {
  store = store || getCurrentInstance().proxy.$store;
  const complete = ref(null);
  const progress_state = ref(null);
  const progress_delta = ref(0);
  const time_spent = ref(null);
  const time_spent_delta = ref(null);
  const session_id = ref(null);
  const extra_fields = reactive({});
  const extra_fields_dirty_bit = ref(null);
  const mastery_criterion = ref(null);
  const totalattempts = ref(null);
  const pastattempts = reactive([]);
  const pastattemptMap = reactive({});
  // Array of as yet unsaved interactions
  const unsaved_interactions = reactive([]);
  const context = ref(null);

  let lastElapsedTimeCheck;
  let timeCheckIntervalTimer;

  function getNewTimeElapsed() {
    // Timer has not been started
    if (!lastElapsedTimeCheck) {
      return 0;
    }
    const currentTime = new Date();
    const timeElapsed = currentTime - lastElapsedTimeCheck;
    lastElapsedTimeCheck = currentTime;
    // Some browsers entirely suspend code execution in background tabs,
    // which can lead to unreliable timing if a tab has been in the background
    // if the time elasped is significantly longer than the interval that we are
    // checking this at, we should discard the measured time elapsed here as erroneous,
    // and just say that no time has elapsed at all.
    if (timeElapsed > intervalTime * 10) {
      return 0;
    }
    // Return a time in seconds, rather than milliseconds.
    return timeElapsed / 1000;
  }

  function clearTrackingInterval() {
    clearInterval(timeCheckIntervalTimer);
    timeCheckIntervalTimer = null;
    lastElapsedTimeCheck = null;
  }

  function makeRequestWithRetry(requestFunction, ...args) {
    // Create an initial rejection so that we can chain consistently
    // in the retry loop.
    let attempt = Promise.reject({ response: { status: 503 } });
    for (var i = 0; i < maxRetries; i++) {
      // Catch any previous error and then try to make the session update again
      attempt = attempt
        .catch(err => {
          if (err && err.response && err.response.status === 503) {
            return requestFunction(...args);
          }
          return Promise.reject(err);
        })
        .catch(err => {
          // Only try to handle 503 status codes here, as otherwise we might be continually
          // retrying the server when it is rejecting the request for valid reasons.
          if (err && err.response && err.response.status === 503) {
            // Defer to the server's Retry-After header if it is set.
            const retryAfter = (err.response.headers || {})['retry-after'];
            // retry-after header is in seconds, we need a value in milliseconds.
            return rejectDelay(err, retryAfter ? retryAfter * 1000 : retryAfter);
          }
          return Promise.reject(err);
        });
    }
    return attempt;
  }

  function _makeInitContentSessionRequest(data) {
    return client({
      method: 'post',
      url: urls['kolibri:core:trackprogress_list'](),
      data: data,
    }).then(response => {
      const data = response.data;
      set(context, valOrNull(data.context));
      set(complete, valOrNull(data.complete));
      set(progress_state, valOrNull(data.progress));
      set(progress_delta, 0);
      set(time_spent, valOrNull(data.time_spent));
      set(time_spent_delta, 0);
      set(session_id, valOrNull(data.session_id));
      clearObject(extra_fields);
      Object.assign(extra_fields, data.extra_fields || {});
      set(mastery_criterion, valOrNull(data.mastery_criterion));
      pastattempts.splice(0);
      pastattempts.push(...(data.pastattempts || []));
      clearObject(pastattemptMap);
      Object.assign(
        pastattemptMap,
        data.pastattempts ? fromPairs(data.pastattempts.map(a => [a.id, a])) : {},
      );
      set(totalattempts, valOrNull(data.totalattempts));
      unsaved_interactions.splice(0);
    });
  }

  /**
   * Initialize a content session for progress tracking
   * To be called on page load for content renderers
   */
  function initContentSession({ node, lessonId, quizId, repeat = false } = {}) {
    const data = {};
    if (!node && !quizId) {
      throw TypeError('Must define either node or quizId');
    }
    if ((node || lessonId) && quizId) {
      throw TypeError('quizId must be the only defined parameter if defined');
    }
    let sessionStarted = false;

    if (quizId) {
      sessionStarted = get(context) && get(context).quiz_id === quizId;
      data.quiz_id = quizId;
    }

    if (node) {
      if (!node.id) {
        throw TypeError('node must have id property');
      }
      if (!node.content_id) {
        throw TypeError('node must have content_id property');
      }
      if (!node.channel_id) {
        throw TypeError('node must have channel_id property');
      }
      if (!node.kind) {
        throw TypeError('node must have kind property');
      }
      sessionStarted = get(context) && get(context).node_id === node.id;
      data.node_id = node.id;
      data.content_id = node.content_id;
      data.channel_id = node.channel_id;
      data.kind = node.kind;
      if (lessonId) {
        sessionStarted = sessionStarted && get(context) && get(context).lesson_id === lessonId;
        data.lesson_id = lessonId;
      }
      if (node.kind === 'exercise') {
        if (!node.assessmentmetadata) {
          throw new TypeError('node must have assessmentmetadata property');
        }
        if (!node.assessmentmetadata.mastery_model) {
          throw new TypeError(
            'node must have assessmentmetadata property with mastery_model property',
          );
        }
        if (!isPlainObject(node.assessmentmetadata.mastery_model)) {
          throw new TypeError(
            'node must have assessmentmetadata property with plain object mastery_model property',
          );
        }
        if (!node.assessmentmetadata.mastery_model.type) {
          throw new TypeError(
            'node must have assessmentmetadata property with mastery_model property with type property',
          );
        }
        data.mastery_model = node.assessmentmetadata.mastery_model;
        if (node.options && node.options.modality === Modalities.QUIZ) {
          // The mastery model and the modalities have different
          // casing, so we don't reuse it here.
          data.mastery_model = { type: 'quiz' };
        }
      }
    }

    if (repeat) {
      data.repeat = repeat;
    }

    if (sessionStarted && !repeat) {
      return;
    }

    return makeRequestWithRetry(_makeInitContentSessionRequest, data);
  }

  function updateAttempt(interaction) {
    // We never store replace
    const blocklist = interaction.replace ? { replace: true } : replaceBlocklist;
    if (interaction.id) {
      if (!pastattemptMap[interaction.id]) {
        const nowSavedInteraction = get(pastattempts).find(
          a => !a.id && a.item === interaction.item,
        );
        Object.assign(nowSavedInteraction, interaction);
        pastattemptMap[nowSavedInteraction.id] = nowSavedInteraction;
      } else {
        for (const key in interaction) {
          if (!blocklist[key]) {
            pastattemptMap[interaction.id][key] = interaction[key];
          }
        }
      }
    }
  }

  function makeSessionUpdateRequest(data) {
    const wasComplete = get(complete);
    return client({
      method: 'put',
      url: urls['kolibri:core:trackprogress_detail'](get(session_id)),
      data,
    }).then(response => {
      if (response.data.attempts) {
        for (const attempt of response.data.attempts) {
          updateAttempt(attempt);
        }
      }
      if (response.data.complete) {
        set(complete, true);
        set(progress_state, 1);
        const { isUserLoggedIn } = useUser();
        const { incrementTotalProgress } = useTotalProgress();
        if (get(isUserLoggedIn) && !wasComplete) {
          incrementTotalProgress(1);
        }
      }
      return response.data;
    });
  }

  // Start the savingPromise as a resolved promise
  // so we can always just chain from this promise for subsequent saves.
  let savingPromise = Promise.resolve();

  const updateContentSessionDeferredStack = [];
  let updateContentSessionTimeout;
  let forceSessionUpdate = false;

  function loggingSaving() {
    set(progress_delta, 0);
    set(time_spent_delta, 0);
    set(extra_fields_dirty_bit, false);
    // Do this to reactively clear the array
    unsaved_interactions.splice(0);
    forceSessionUpdate = false;
  }

  function immediatelyUpdateContentSession() {
    // Once this timeout has been executed, we can reset the global timeout
    // to null, as we are now actually invoking the debounced function.
    updateContentSessionTimeout = null;

    const progressDelta = get(progress_delta);
    const timeSpentDelta = get(time_spent_delta);
    const extraFieldsChanged = get(extra_fields_dirty_bit);
    const progress = get(progress_state);
    const unsavedInteractions = JSON.parse(JSON.stringify(unsaved_interactions));
    const extraFields = JSON.parse(JSON.stringify(extra_fields));

    if (
      // Always update if there's an attempt that hasn't got an id yet, or if there have been
      // at least 3 additional interactions.
      (unsavedInteractions.length &&
        (unsavedInteractions.some(r => !r.id) || unsavedInteractions.length > 2)) ||
      progressDelta >= progressThreshold ||
      (progressDelta && progress >= 1) ||
      timeSpentDelta >= timeThreshold ||
      extraFieldsChanged ||
      forceSessionUpdate
    ) {
      // Clear the temporary state that we've
      // picked up to save to the backend.
      loggingSaving();
      const data = {};
      if (progressDelta) {
        data.progress_delta = progressDelta;
      }
      if (timeSpentDelta) {
        data.time_spent_delta = timeSpentDelta;
      }
      if (unsavedInteractions.length) {
        data.interactions = unsavedInteractions;
      }
      if (extraFieldsChanged) {
        data.extra_fields = extraFields;
      }
      // Don't try to make a new save until the previous save
      // has completed or there's no data to sent because the quiz has already
      // been completed.
      if (Object.keys(data).length !== 0) {
        savingPromise = savingPromise.then(() => {
          return makeRequestWithRetry(makeSessionUpdateRequest, data);
        });
      }
    }
    // Splice all the resolve/reject handlers off the stack
    // so that only those that have already been added by the time of this
    // invocation are called, and none that are added subsequently, while
    // this invocation is still in progress.
    const deferredStack = updateContentSessionDeferredStack.splice(0);
    return savingPromise
      .then(result => {
        // If it is successful call all of the resolve functions that we have stored
        // from all the Promises that have been returned while this specific debounce
        // has been active.
        for (const { resolve } of deferredStack) {
          resolve(result);
        }
      })
      .catch(err => {
        // If there is an error call reject for all previously returned promises.
        for (const { reject } of deferredStack) {
          reject(err);
        }
      });
  }

  /**
   * Update a content session for progress tracking
   */
  function updateContentSession({
    progressDelta,
    progress,
    contentState,
    interaction,
    immediate = false,
    // Whether to update regardless of any conditions.
    // Used to ensure state is always saved when a session closes.
    force = false,
  } = {}) {
    const wasComplete = get(progress_state) >= 1;
    if (get(session_id) === null) {
      throw ReferenceError(noSessionErrorText);
    }
    if (!isUndefined(progressDelta) && !isUndefined(progress)) {
      throw TypeError('Must only specify either progressDelta or progress');
    }
    if (!isUndefined(progress)) {
      if (!isNumber(progress)) {
        throw TypeError('progress must be a number');
      }
      progress = _zeroToOne(progress);
      progress = threeDecimalPlaceRoundup(progress);
      if (get(progress_state) < progress) {
        const newProgressDelta = _zeroToOne(
          threeDecimalPlaceRoundup(get(progress_delta) + progress - get(progress_state)),
        );
        set(progress_delta, newProgressDelta);
        set(progress_state, progress);
      }
    }
    if (!isUndefined(progressDelta)) {
      if (!isNumber(progressDelta)) {
        throw TypeError('progressDelta must be a number');
      }
      progressDelta = _zeroToOne(progressDelta);
      progressDelta = threeDecimalPlaceRoundup(progressDelta);
      set(
        progress_delta,
        _zeroToOne(threeDecimalPlaceRoundup(get(progress_delta) + progressDelta)),
      );
      set(
        progress_state,
        Math.min(threeDecimalPlaceRoundup(get(progress_state) + progressDelta), 1),
      );
    }
    if (!isUndefined(contentState)) {
      if (!isPlainObject(contentState)) {
        throw TypeError('contentState must be an object');
      }
      const delta = diff(extra_fields, { ...extra_fields, contentState });
      const changed = Boolean(Object.keys(delta).length);
      if (changed) {
        extra_fields.contentState = contentState;
        set(extra_fields_dirty_bit, true);
      }
    }
    if (!isUndefined(interaction)) {
      if (!isPlainObject(interaction)) {
        throw TypeError('interaction must be an object');
      }
      unsaved_interactions.push(interaction);
      if (!interaction.id) {
        const unsavedInteraction = get(pastattempts).find(
          a => !a.id && a.item === interaction.item,
        );
        if (unsavedInteraction) {
          for (const key in interaction) {
            set(unsavedInteraction, key, interaction[key]);
          }
        } else {
          pastattempts.unshift(interaction);
          set(totalattempts, get(totalattempts) + 1);
        }
      }
      updateAttempt(interaction);
    }
    // Reset the elapsed time in the timer
    const elapsedTime = getNewTimeElapsed();
    // Discard the time that has passed if the page is not visible.
    if (store.state.core.pageVisible && elapsedTime) {
      /* Update the logging state with new timing information */
      set(time_spent, get(time_spent) + threeDecimalPlaceRoundup(elapsedTime));
      set(time_spent_delta, threeDecimalPlaceRoundup(get(time_spent_delta) + elapsedTime));
    }

    const completed = !wasComplete && get(progress_state) >= 1;
    immediate = (!isUndefined(interaction) && !interaction.id) || completed || immediate;
    forceSessionUpdate = forceSessionUpdate || force;
    // Logic for promise returning debounce vendored and modified from:
    // https://github.com/sindresorhus/p-debounce/blob/main/index.js
    // Return a promise that will consistently resolve when this debounced
    // function invocation is completed.
    return new Promise((resolve, reject) => {
      // Clear any current timeouts, so that this invocation takes precedence
      // Any subsequent calls will then also revoke this timeout.
      clearTimeout(updateContentSessionTimeout);
      // Add the resolve and reject handlers for this promise to the stack here.
      updateContentSessionDeferredStack.push({ resolve, reject });
      if (immediate) {
        // If immediate invocation is required immediately call the handler
        // rather than using a timeout delay.
        immediatelyUpdateContentSession();
      } else {
        // Otherwise update the timeout to this invocation.
        updateContentSessionTimeout = setTimeout(
          immediatelyUpdateContentSession,
          updateContentSessionDebounceTime,
        );
      }
    });
  }

  /**
   * Start interval timer and set start time
   * @param {int} interval
   */
  function startTrackingProgress() {
    timeCheckIntervalTimer = setInterval(updateContentSession, intervalTime);
    lastElapsedTimeCheck = new Date();
  }

  /**
   * Stop interval timer and update latest times
   * Must be called after startTrackingProgress
   */
  function stopTrackingProgress() {
    clearTrackingInterval();
    try {
      return updateContentSession({ immediate: true, force: true }).catch(err => {
        logging.debug(err);
      });
    } catch (e) {
      if (e instanceof ReferenceError && e.message === noSessionErrorText) {
        logging.debug(
          'Tried to stop tracking progress when no content session had been initialized',
        );
      } else {
        throw e;
      }
    }
    return Promise.resolve();
  }

  onBeforeUnmount(stopTrackingProgress);

  return {
    initContentSession,
    updateContentSession,
    startTrackingProgress,
    stopTrackingProgress,
    session_id,
    context,
    progress: progress_state,
    progress_delta,
    time_spent,
    extra_fields,
    complete,
    totalattempts,
    pastattempts,
    pastattemptMap,
    mastery_criterion,
    unsaved_interactions,
  };
}
