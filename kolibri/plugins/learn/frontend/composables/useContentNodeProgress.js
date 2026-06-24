/**
 * A composable function containing logic related to learner's
 * progress through resources
 * All data exposed by this function belong to a current learner.
 */

import { reactive } from 'vue';
import { set } from '@vueuse/core';

import ContentNodeProgressResource from 'kolibri-common/apiResources/ContentNodeProgressResource';

// The reactive is defined in the outer scope so it can be used as a shared store
const contentNodeProgressMap = reactive({});
const contentNodeProgressMetaDataMap = reactive({});

export function setContentNodeProgress(progress) {
  // Avoid setting stale progress data - assume that progress increases monotonically
  if (
    !contentNodeProgressMap[progress.content_id] ||
    progress.progress >= contentNodeProgressMap[progress.content_id]
  ) {
    set(contentNodeProgressMap, progress.content_id, progress.progress);
    // this should have been conditional
    set(contentNodeProgressMetaDataMap, progress.content_id, {
      num_question_answered: progress.num_question_answered,
      num_question_answered_correctly: progress.num_question_answered_correctly,
      total_questions: progress.total_questions,
    });
  }
}

export default function useContentNodeProgress() {
  /**
   * Fetches content node progress data
   * and saves data to this composable's store.
   * @param {object} getParams - Parameters to filter by, should be the same as
   * the contentnodes fetched that we want the progress for.
   * @returns {Promise<void>} Resolves once the progress data has been merged into
   * the shared store.
   * @public
   */
  function fetchContentNodeProgress(getParams) {
    return ContentNodeProgressResource.fetchCollection({
      getParams,
      force: true,
    }).then(progressData => {
      const progresses = progressData ? progressData : [];
      for (const progress of progresses) {
        setContentNodeProgress(progress);
      }
    });
  }

  /**
   * Fetches content node tree progress data and saves data to this composable's store.
   * @param {object} getParams - Parameters to filter by, should be the same as
   * the contentnodes fetched that we want the progress for.
   * @param {string} getParams.id - The id of the parent content node whose tree progress
   * should be fetched.
   * @param {object} getParams.params - GET parameters forwarded to the tree progress
   * endpoint (e.g. pagination state).
   * @returns {Promise<void>} Resolves once the progress data has been merged into
   * the shared store.
   * @public
   */
  function fetchContentNodeTreeProgress({ id, params }) {
    return ContentNodeProgressResource.fetchTree({
      params,
      id,
    }).then(progressData => {
      const progresses = progressData ? progressData : [];
      for (const progress of progresses) {
        setContentNodeProgress(progress);
      }
    });
  }

  return {
    fetchContentNodeProgress,
    fetchContentNodeTreeProgress,
    contentNodeProgressMap,
    contentNodeProgressMetaDataMap,
  };
}
