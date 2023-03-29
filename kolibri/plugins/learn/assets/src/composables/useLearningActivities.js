/**
 * Everything related to learning activities of a content node
 * and their duration.
 */

import { computed } from 'kolibri.lib.vueCompositionApi';
import { get } from '@vueuse/core';
import CompletionCriteria from 'kolibri-constants/CompletionCriteria';
import lodashGet from 'lodash/get';
import { LearningActivities, ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import coreStrings from 'kolibri.utils.coreStrings';

const DURATION_THRESHOLD = 60 * 30; // 30 minutes in seconds

export default function useLearningActivities(contentNode) {
  const ReferenceLabel = coreStrings.$tr('readReference');
  const _LearningActivityToLabelMap = {
    [LearningActivities.CREATE]: coreStrings.$tr('create'),
    [LearningActivities.LISTEN]: coreStrings.$tr('listen'),
    [LearningActivities.REFLECT]: coreStrings.$tr('reflect'),
    [LearningActivities.PRACTICE]: coreStrings.$tr('practice'),
    [LearningActivities.READ]: coreStrings.$tr('read'),
    [LearningActivities.WATCH]: coreStrings.$tr('watch'),
    [LearningActivities.EXPLORE]: coreStrings.$tr('explore'),
  };

  const _LearningActivityToIconMap = {
    [LearningActivities.CREATE]: 'createSolid',
    [LearningActivities.LISTEN]: 'listenSolid',
    [LearningActivities.REFLECT]: 'reflectSolid',
    [LearningActivities.PRACTICE]: 'practiceSolid',
    [LearningActivities.READ]: 'readSolid',
    [LearningActivities.WATCH]: 'watchSolid',
    [LearningActivities.EXPLORE]: 'interactSolid',
  };

  /**
   * @returns {Boolean} Does the content node have exactly
   *                    one learning activity associated with it?
   */
  const hasSingleActivity = computed(() => {
    return (
      contentNode && contentNode.learning_activities && contentNode.learning_activities.length === 1
    );
  });

  /**
   * @returns {String,null} A constant of the first learning activity
   *                        associated with the content node.
   *
   */
  const firstActivity = computed(() => {
    if (
      !contentNode ||
      !contentNode.learning_activities ||
      contentNode.learning_activities.length === 0
    ) {
      return null;
    }
    return contentNode.learning_activities[0];
  });

  /**
   * @returns {Boolean} `true` if the content node has completion criterion
   *                   set to reference.
   */
  const isReference = computed(() => {
    return (
      lodashGet(contentNode, ['options', 'completion_criteria', 'model']) ===
      CompletionCriteria.REFERENCE
    );
  });

  /**
   * @returns {Boolean} Does the content node have truthy duration?
   */
  const hasDuration = computed(() => {
    return contentNode && contentNode.duration;
  });

  /**
   * Should we display precise time duration for the content node?
   *
   * @returns {Boolean} `true` when the content node has a duration and the time
   *                    completion criterion.
   */
  const displayPreciseDuration = computed(() => {
    return (
      contentNode &&
      contentNode.duration &&
      (contentNode.kind == ContentNodeKinds.AUDIO || contentNode.kind == ContentNodeKinds.VIDEO)
    );
  });

  /**
   * Should we display an estimated duration for the content node?
   *
   * @returns {Boolean} `true` when the content node has a duration and the approx_time
   *                    completion criterion.
   */
  const displayEstimatedDuration = computed(() => {
    return (
      contentNode &&
      contentNode.duration &&
      contentNode.kind !== ContentNodeKinds.AUDIO &&
      contentNode.kind !== ContentNodeKinds.VIDEO &&
      (lodashGet(contentNode, ['options', 'completion_criteria', 'model']) ===
        CompletionCriteria.APPROX_TIME ||
        lodashGet(contentNode, ['options', 'completion_criteria', 'model']) ===
          CompletionCriteria.TIME)
    );
  });

  /**
   * @returns {Number}
   */
  const durationInSeconds = computed(() => {
    return contentNode && contentNode.duration ? contentNode.duration : 0;
  });

  /**
   * @returns {String} Returns the translated 'Short activity' label when duration is less
   *                   than or equal to 30 minutes.
   *                   Otherwise returns the translated 'Long activity' label.
   */
  const durationEstimation = computed(() => {
    if (!get(hasDuration)) {
      return '';
    }
    return contentNode.duration <= DURATION_THRESHOLD
      ? coreStrings.$tr('shortActivity')
      : coreStrings.$tr('longActivity');
  });

  /**
   * @param {String} learningActivity A learning activity constant
   * @returns {String} A translated label for the learning activity
   */
  function getLearningActivityLabel(learningActivity) {
    return _LearningActivityToLabelMap[learningActivity];
  }

  /**
   * @param {String} learningActivity A learning activity constant
   * @returns {String} An icon for the learning activity
   */
  function getLearningActivityIcon(learningActivity) {
    return _LearningActivityToIconMap[learningActivity];
  }

  return {
    ReferenceLabel,
    hasSingleActivity,
    firstActivity,
    isReference,
    hasDuration,
    displayPreciseDuration,
    displayEstimatedDuration,
    durationInSeconds,
    durationEstimation,
    getLearningActivityLabel,
    getLearningActivityIcon,
  };
}
