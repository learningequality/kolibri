/**
 * Everything related to learning activities of a content node
 * and their duration.
 */

import { computed } from 'kolibri.lib.vueCompositionApi';
import { get } from '@vueuse/core';
import { LearningActivities } from 'kolibri.coreVue.vuex.constants';
import { coreStrings } from '../../../../../core/assets/src/mixins/commonCoreStrings';

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

export default function useLearningActivities(contentNode) {
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
   * @returns {Boolean} `true` if the content node has exactly one learning
   *                    activity associated and that activity is reading
   */
  const isReference = computed(() => {
    return get(hasSingleActivity) && get(firstActivity) === LearningActivities.READ;
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
   * @returns {Boolean} `true` when the content node has exactly one learning activity
   *                    associated and that activity is watching or listening
   */
  const displayPreciseDuration = computed(() => {
    return (
      contentNode &&
      contentNode.duration &&
      get(hasSingleActivity) &&
      [LearningActivities.WATCH, LearningActivities.LISTEN].includes(get(firstActivity))
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
   *                   than 30 minutes. Otherwise returns the translated 'Long activity' label.
   */
  const durationEstimation = computed(() => {
    if (!get(hasDuration)) {
      return '';
    }
    return contentNode.duration < 1800
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

  return {
    ReferenceLabel,
    hasSingleActivity,
    firstActivity,
    isReference,
    hasDuration,
    displayPreciseDuration,
    durationInSeconds,
    durationEstimation,
    getLearningActivityLabel,
  };
}
